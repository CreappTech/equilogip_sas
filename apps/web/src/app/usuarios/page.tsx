import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { listarRoles } from "@/lib/queries/roles";
import { listarUsuarios } from "@/lib/queries/usuarios";
import AdminShell from "@/components/layout/AdminShell";
import UsuariosClient from "./UsuariosClient";

export default async function UsuariosPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeVer =
    permisos.includes("*") ||
    permisos.includes("auth.usuarios.ver") ||
    permisos.includes("auth.usuarios.crear") ||
    permisos.includes("auth.usuarios.editar") ||
    permisos.includes("auth.usuarios.asignar_roles") ||
    permisos.includes("auth.usuarios.desactivar");

  if (!puedeVer) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombres, apellidos, email_login")
    .eq("id", user.id)
    .single();

  const nombreCompleto = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : user.email ?? "Usuario";
  const correo = profile?.email_login ?? user.email ?? "";

  const [usuarios, roles] = await Promise.all([
    listarUsuarios(),
    listarRoles(true),
  ]);

  const rolesActor = (
    await supabase
      .from("usuarios_roles")
      .select("roles(codigo)")
      .eq("usuario_id", user.id)
  ).data ?? [];
  const esSuperAdmin = rolesActor.some(
    (r) => (r.roles as unknown as { codigo: string } | null)?.codigo === "AUTH_SUPER_ADMIN"
  );

  const canCrear = permisos.includes("*") || permisos.includes("auth.usuarios.crear");
  const canVer = permisos.includes("*") || permisos.includes("auth.usuarios.ver");
  const canEditar = permisos.includes("*") || permisos.includes("auth.usuarios.editar");
  const canEliminar =
    permisos.includes("*") || permisos.includes("auth.usuarios.desactivar");

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <UsuariosClient
        initialUsers={usuarios}
        roles={roles}
        currentUserId={user.id}
        canCrear={canCrear}
        canVer={canVer}
        canEditar={canEditar}
        canEliminar={canEliminar}
        esSuperAdmin={esSuperAdmin}
      />
    </AdminShell>
  );
}
