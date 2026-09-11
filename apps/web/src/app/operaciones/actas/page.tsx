import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { listActas } from "@/features/operaciones/queries/actas";
import AdminShell from "@/components/layout/AdminShell";
import ActasClient from "./ActasClient";

export default async function ActasPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeVer =
    permisos.includes("*") || permisos.includes("operaciones.actas.ver");
  const puedeGenerar =
    permisos.includes("*") || permisos.includes("operaciones.actas.generar");

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

  const actas = await listActas();

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <ActasClient initialActas={actas} puedeGenerar={puedeGenerar} />
    </AdminShell>
  );
}