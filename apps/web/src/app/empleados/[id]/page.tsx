import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { getEmpleadoDetalle } from "@/features/empleados/queries/getEmpleadoDetalle";
import { permisoEmpleado } from "@/features/empleados/types/empleado.types";
import AdminShell from "@/components/layout/AdminShell";
import EmpleadoDetalleClient from "./EmpleadoDetalleClient";

export default async function EmpleadoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();

  const permisos = await getPermisos();

  const detalle = await getEmpleadoDetalle(id);
  if (!detalle) notFound();

  if (!permisos.includes(permisoEmpleado("ver"))) {
    redirect("/empleados");
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

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <EmpleadoDetalleClient detalle={detalle} />
    </AdminShell>
  );
}