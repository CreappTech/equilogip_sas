import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import {
  listActivosFiltro,
  listCentrosServicio,
  listReporteHoras,
  listReporteNovedades,
} from "@/features/operaciones/queries/listReportes";
import type { FiltrosReporte } from "@/features/operaciones/types/operaciones.types";
import AdminShell from "@/components/layout/AdminShell";
import ReportesClient from "./ReportesClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  const sp = await searchParams;
  const tipo = str(sp.tipo) === "novedades" ? "novedades" : "horas";

  const filtros: FiltrosReporte = {
    fecha_desde: str(sp.desde),
    fecha_hasta: str(sp.hasta),
    activo_id: str(sp.activo),
    centro_servicio_id: str(sp.centro),
  };

  const [centros, activos, filasHoras, filasNovedades] = await Promise.all([
    listCentrosServicio(),
    listActivosFiltro(),
    tipo === "horas" ? listReporteHoras(filtros) : Promise.resolve([]),
    tipo === "novedades" ? listReporteNovedades(filtros) : Promise.resolve([]),
  ]);

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <ReportesClient
        tipo={tipo}
        filtros={filtros}
        centros={centros}
        activos={activos}
        filasHoras={filasHoras}
        filasNovedades={filasNovedades}
      />
    </AdminShell>
  );
}