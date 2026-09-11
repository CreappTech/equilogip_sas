import { redirect, notFound } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { obtenerRol } from "@/lib/queries/roles";
import { agruparPermisosPorModulo } from "@/lib/queries/permisos";
import AdminShell from "@/components/layout/AdminShell";
import RoleFormClient from "./RoleFormClient";

export default async function RoleFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const permisosUser = await getPermisos();

  const puedeCrear =
    permisosUser.includes("*") || permisosUser.includes("auth.roles.crear");
  const puedeEditar =
    permisosUser.includes("*") || permisosUser.includes("auth.roles.editar");

  if (id !== "nuevo" && !puedeEditar) {
    redirect("/usuarios/roles");
  }
  if (id === "nuevo" && !puedeCrear) {
    redirect("/usuarios/roles");
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

  const [rolExistente, permisosAgrupados] = await Promise.all([
    id !== "nuevo" ? obtenerRol(id) : Promise.resolve(null),
    agruparPermisosPorModulo(true),
  ]);

  if (id !== "nuevo" && !rolExistente) {
    notFound();
  }

  let permisosIds: string[] = [];
  if (id !== "nuevo" && rolExistente) {
    const { data } = await supabase
      .from("roles_permisos")
      .select("permiso_id")
      .eq("rol_id", id);
    permisosIds = (data ?? []).map((rp) => rp.permiso_id as string);
  }

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisosUser}
    >
      <RoleFormClient
        rol={rolExistente}
        permisosIdsIniciales={permisosIds}
        permisosAgrupados={permisosAgrupados}
        esNuevo={id === "nuevo"}
      />
    </AdminShell>
  );
}
