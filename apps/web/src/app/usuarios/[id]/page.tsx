import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { obtenerUsuario } from "@/lib/queries/usuarios";
import AdminShell from "@/components/layout/AdminShell";
import UsuarioDetalleClient from "./UsuarioDetalleClient";

export default async function UsuarioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const usuario = await obtenerUsuario(id);
  if (!usuario) notFound();

  const canEditar = permisos.includes("*") || permisos.includes("auth.usuarios.editar");

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

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <UsuarioDetalleClient usuario={usuario} canEditar={canEditar} />
    </AdminShell>
  );
}