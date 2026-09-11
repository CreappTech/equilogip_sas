import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import {
  obtenerActaPorId,
  obtenerDatosActa,
} from "@/features/operaciones/queries/actas";
import type { ActaDocumento } from "@/features/operaciones/types/operaciones.types";
import AdminShell from "@/components/layout/AdminShell";
import ActaPreview from "./ActaPreview";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function str(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function ActaPreviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  const sp = await searchParams;
  const id = str(sp.id);
  const cliente = str(sp.cliente);
  const equipo = str(sp.equipo);
  const desde = str(sp.desde);
  const hasta = str(sp.hasta);

  let documento: ActaDocumento;
  let generacion: ActaPreviewGeneracion | undefined;

  if (id && UUID_RE.test(id)) {
    try {
      documento = await obtenerActaPorId(id);
    } catch {
      redirect("/operaciones/actas");
    }
  } else if (UUID_RE.test(cliente) && UUID_RE.test(equipo) && desde && hasta) {
    if (!FECHA_RE.test(desde) || !FECHA_RE.test(hasta)) {
      redirect("/operaciones/actas/nueva");
    }
    const datos = await obtenerDatosActa(cliente, equipo, desde, hasta);
    documento = {
      ...datos,
      numero: null,
      fecha_generacion: null,
    };
    if (puedeGenerar) {
      generacion = { cliente_id: cliente, equipo_id: equipo, fecha_desde: desde, fecha_hasta: hasta };
    }
  } else {
    redirect("/operaciones/actas");
  }

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <ActaPreview documento={documento} generacion={generacion} />
    </AdminShell>
  );
}

export interface ActaPreviewGeneracion {
  cliente_id: string;
  equipo_id: string;
  fecha_desde: string;
  fecha_hasta: string;
}