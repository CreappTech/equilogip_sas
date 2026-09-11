import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { listActividades } from "@/features/operaciones/queries/listActividades";
import AdminShell from "@/components/layout/AdminShell";
import OperacionesClient from "./OperacionesClient";

export default async function OperacionesPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeVer =
    permisos.includes("*") ||
    permisos.some((p) => p.startsWith("operaciones.") && p.endsWith(".ver"));

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

  const actividades = await listActividades();

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <OperacionesClient initialActividades={actividades} />
    </AdminShell>
  );
}