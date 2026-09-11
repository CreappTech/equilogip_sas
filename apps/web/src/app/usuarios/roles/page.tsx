import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { listarRolesConPermisos } from "@/lib/queries/roles";
import { listarPermisos } from "@/lib/queries/permisos";
import AdminShell from "@/components/layout/AdminShell";
import RolesClient from "./RolesClient";

export default async function RolesPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeVer =
    permisos.includes("*") ||
    permisos.includes("auth.roles.ver");

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

  const [roles, permisosCatalogo] = await Promise.all([
    listarRolesConPermisos(),
    listarPermisos(true),
  ]);

  const canCrear = permisos.includes("*") || permisos.includes("auth.roles.crear");
  const canEditar = permisos.includes("*") || permisos.includes("auth.roles.editar");
  const canEliminar = permisos.includes("*") || permisos.includes("auth.roles.eliminar");

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <RolesClient
        initialRoles={roles}
        permisosCatalogo={permisosCatalogo}
        canCrear={canCrear}
        canEditar={canEditar}
        canEliminar={canEliminar}
      />
    </AdminShell>
  );
}
