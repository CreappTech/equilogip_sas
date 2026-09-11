import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { obtenerActividadActiva } from "@/features/operaciones/queries/obtenerActividadActiva";
import { listCausalesPausa } from "@/features/operaciones/queries/listReferencias";
import AdminShell from "@/components/layout/AdminShell";
import ActividadControlClient from "./ActividadControlClient";

export default async function ActividadControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const permisos = await getPermisos();

  const puedeVer =
    permisos.includes("*") ||
    permisos.some((p) => p.startsWith("operaciones.") && p.endsWith(".ver"));
  if (!puedeVer) redirect("/operaciones");

  const { id } = await params;

  const [detalle, causales] = await Promise.all([
    obtenerActividadActiva(id),
    listCausalesPausa(),
  ]);

  if (!detalle) notFound();

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
      <ActividadControlClient detalle={detalle} causales={causales} />
    </AdminShell>
  );
}