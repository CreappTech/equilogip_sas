import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { obtenerUsuario } from "@/lib/queries/usuarios";
import { listarRoles } from "@/lib/queries/roles";
import AdminShell from "@/components/layout/AdminShell";
import UsuarioEditarClient from "./UsuarioEditarClient";

export default async function UsuarioEditarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();

  const permisos = await getPermisos();

  const usuario = await obtenerUsuario(id);
  if (!usuario) notFound();

  if (!permisos.includes("*") && !permisos.includes("auth.usuarios.editar")) {
    redirect(`/usuarios/${id}`);
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombres, apellidos, email_login")
    .eq("id", user.id)
    .single();

  const { data: rolesActor } = await supabase
    .from("usuarios_roles")
    .select("roles(codigo)")
    .eq("usuario_id", user.id);
  const esSuperAdmin = (rolesActor ?? []).some(
    (r) => (r.roles as unknown as { codigo: string } | null)?.codigo === "AUTH_SUPER_ADMIN"
  );

  const canAsignarRoles =
    permisos.includes("*") ||
    permisos.includes("auth.usuarios.asignar_roles") ||
    permisos.includes("auth.usuarios.roles");

  const [roles] = await Promise.all([listarRoles(true)]);

  const nombreCompleto = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : user.email ?? "Usuario";
  const correo = profile?.email_login ?? user.email ?? "";

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <UsuarioEditarClient
        id={id}
        usuario={usuario}
        roles={roles}
        canAsignarRoles={canAsignarRoles}
        esSuperAdmin={esSuperAdmin}
      />
    </AdminShell>
  );
}