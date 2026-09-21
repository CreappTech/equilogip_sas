import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import AdminShell from "@/components/layout/AdminShell";
import { listActivosOperativos } from "@/features/mantenimiento/queries/listActivosOperativos";
import { getBorradorActivo } from "@/features/mantenimiento/queries/getBorradorActivo";
import InspeccionInicioClient from "./InspeccionInicioClient";

export default async function MantenimientoInspeccionPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeCrear =
    permisos.includes("*") ||
    permisos.includes("mantenimiento.inspecciones.crear");

  if (!puedeCrear) {
    redirect("/mantenimiento");
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

  const [activos, borrador] = await Promise.all([
    listActivosOperativos(),
    getBorradorActivo(user.id),
  ]);

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <InspeccionInicioClient
        activos={activos}
        borrador={borrador}
        userId={user.id}
      />
    </AdminShell>
  );
}