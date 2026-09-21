import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import AdminShell from "@/components/layout/AdminShell";
import { getConfiguracion } from "@/features/mantenimiento/queries/getConfiguracion";
import ConfiguracionClient from "./ConfiguracionClient";

export default async function MantenimientoConfiguracionPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeEditar =
    permisos.includes("*") ||
    permisos.includes("mantenimiento.configuracion.editar");

  if (!puedeEditar) {
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

  const configuracion = await getConfiguracion();

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <ConfiguracionClient
        tiempoMinimoSegundos={configuracion.tiempo_minimo_segundos}
      />
    </AdminShell>
  );
}