import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { listEmpleados } from "@/features/empleados/queries/listEmpleados";
import { permisoEmpleado } from "@/features/empleados/types/empleado.types";
import AdminShell from "@/components/layout/AdminShell";
import EmpleadosClient from "./EmpleadosClient";

export default async function EmpleadosPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  if (!permisos.includes(permisoEmpleado("ver"))) {
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

  const empleados = await listEmpleados();

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <EmpleadosClient initialEmpleados={empleados} permisos={permisos} />
    </AdminShell>
  );
}