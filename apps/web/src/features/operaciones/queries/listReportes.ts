import { createClient } from "@/lib/supabase/server";
import type {
  ActivoFiltroOpcion,
  CatalogoOpcion,
  FiltrosReporte,
  ReporteHorasFila,
  ReporteNovedadFila,
} from "../types/operaciones.types";

/** Centros de servicio activos del tenant (filtros de reportes/actas). */
export async function listCentrosServicio(): Promise<CatalogoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("centros_servicio")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as CatalogoOpcion[];
}

/** Todos los equipos del tenant (filtros de reportes/actas, sin excluir estado). */
export async function listActivosFiltro(): Promise<ActivoFiltroOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activos")
    .select("id, codigo_interno, nombre")
    .order("codigo_interno", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ActivoFiltroOpcion[];
}

interface ResumenRow {
  activo_id: string;
  centro_servicio_id: string;
  horas_trabajadas: number | null;
  horas_limitadas: number | null;
  total_novedades: number | null;
  activos?: { codigo_interno?: string | null; nombre?: string | null } | null;
  centros_servicio?: { nombre?: string | null } | null;
}

/**
 * Reporte de horas trabajadas por equipo dentro del periodo.
 * Las actividades se consideran dentro del periodo si su `inicio_hora`
 * cae en [desde, hasta]; la agregación por equipo (cantidad, horas,
 * limitaciones y novedades) se calcula en el servidor desde la vista resumen
 * (fuente única, ver AGENTS §19).
 */
export async function listReporteHoras(
  filtros: FiltrosReporte
): Promise<ReporteHorasFila[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vw_operacion_actividades_resumen")
    .select(
      `activo_id,
       centro_servicio_id,
       horas_trabajadas,
       horas_limitadas,
       total_novedades,
       inicio_hora,
       activos(codigo_interno, nombre),
       centros_servicio(nombre)`
    )
    .not("inicio_hora", "is", null);

  if (filtros.activo_id) {
    query = query.eq("activo_id", filtros.activo_id);
  }
  if (filtros.centro_servicio_id) {
    query = query.eq("centro_servicio_id", filtros.centro_servicio_id);
  }
  if (filtros.fecha_desde) {
    query = query.gte("inicio_hora", `${filtros.fecha_desde}T00:00:00`);
  }
  if (filtros.fecha_hasta) {
    query = query.lte("inicio_hora", `${filtros.fecha_hasta}T23:59:59.999`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const filas = (data ?? []) as unknown as ResumenRow[];

  const mapa = new Map<string, ReporteHorasFila>();

  for (const f of filas) {
    const prev = mapa.get(f.activo_id) ?? {
      activo_id: f.activo_id,
      activo_codigo: f.activos?.codigo_interno ?? "—",
      activo_nombre: f.activos?.nombre ?? null,
      centro_servicio_id: f.centro_servicio_id,
      centro_servicio_nombre: f.centros_servicio?.nombre ?? null,
      cantidad_actividades: 0,
      horas_trabajadas: 0,
      horas_limitadas: 0,
      total_novedades: 0,
    };
    prev.cantidad_actividades += 1;
    prev.horas_trabajadas += f.horas_trabajadas ?? 0;
    prev.horas_limitadas += f.horas_limitadas ?? 0;
    prev.total_novedades += f.total_novedades ?? 0;
    mapa.set(f.activo_id, prev);
  }

  return [...mapa.values()]
    .sort((a, b) => a.activo_codigo.localeCompare(b.activo_codigo))
    .map((r) => ({
      ...r,
      horas_trabajadas: Math.round(r.horas_trabajadas * 100) / 100,
      horas_limitadas: Math.round(r.horas_limitadas * 100) / 100,
    }));
}

interface NovedadRow {
  actividad_id: string;
  activo_id: string;
  centro_servicio_id: string;
  fecha_pausa: string;
  causal_nombre: string | null;
  observaciones: string | null;
  horas_duracion: number | null;
  activos?: { codigo_interno?: string | null; nombre?: string | null } | null;
  centros_servicio?: { nombre?: string | null } | null;
}

/**
 * Reporte de novedades (pausas con causal) dentro del periodo.
 * La duración de cada novedad proviene de vw_operacion_novedades (fuente única).
 */
export async function listReporteNovedades(
  filtros: FiltrosReporte
): Promise<ReporteNovedadFila[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vw_operacion_novedades")
    .select(
      `actividad_id,
       activo_id,
       centro_servicio_id,
       fecha_pausa,
       causal_nombre,
       observaciones,
       horas_duracion,
       activos(codigo_interno, nombre),
       centros_servicio(nombre)`
    )
    .order("fecha_pausa", { ascending: false });

  if (filtros.activo_id) {
    query = query.eq("activo_id", filtros.activo_id);
  }
  if (filtros.centro_servicio_id) {
    query = query.eq("centro_servicio_id", filtros.centro_servicio_id);
  }
  if (filtros.fecha_desde) {
    query = query.gte("fecha_pausa", `${filtros.fecha_desde}T00:00:00`);
  }
  if (filtros.fecha_hasta) {
    query = query.lte("fecha_pausa", `${filtros.fecha_hasta}T23:59:59.999`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as NovedadRow[]).map((f) => ({
    actividad_id: f.actividad_id,
    activo_codigo: f.activos?.codigo_interno ?? "—",
    activo_nombre: f.activos?.nombre ?? null,
    centro_servicio_nombre: f.centros_servicio?.nombre ?? null,
    fecha_pausa: f.fecha_pausa,
    causal_nombre: f.causal_nombre,
    observaciones: f.observaciones,
    horas_duracion: f.horas_duracion,
  }));
}