import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { getActivoDetalle } from "@/features/activos/queries/getActivoDetalle";
import { tipoARecurso } from "@/features/activos/types/activo.types";
import AdminShell from "@/components/layout/AdminShell";
import ActivoDetalleClient from "./ActivoDetalleClient";

export default async function ActivoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();

  const permisos = await getPermisos();

  const detalle = await getActivoDetalle(id);
  if (!detalle) notFound();

  const puedeVer =
    permisos.includes("*") ||
    permisos.includes("activos.activos.ver") ||
    permisos.includes(
      `activos.${tipoARecurso(detalle.activo.tipo)}.ver`
    );

  if (!puedeVer) redirect("/activos");

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
      <ActivoDetalleClient detalle={detalle} />
    </AdminShell>
  );
}