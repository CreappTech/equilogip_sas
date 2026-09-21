import { createClient } from "@/lib/supabase/server";
import { getActivoDetalle } from "@/features/activos/queries/getActivoDetalle";
import { nombreActivo } from "@/features/activos/types/activo.types";
import type {
  DetalleInspeccion,
  InspeccionFila,
  RespuestaInspeccion,
} from "../types/mantenimiento.types";

const CAMPOS_INSPECCION = [
  "id",
  "activo_id",
  "operador_id",
  "lectura",
  "lectura_unidad",
  "nivel_combustible",
  "nivel_aceite",
  "estado",
  "iniciada_en",
  "finalizada_en",
  "tiempo_segundos",
  "es_express",
  "tiempo_minimo_segundos_aplicado",
  "puntajes",
  "created_at",
] as const;

type FilaInspeccionRaw = {
  [K in (typeof CAMPOS_INSPECCION)[number]]: unknown;
};

function mapperFilaInspeccionBase(raw: FilaInspeccionRaw): InspeccionFila {
  return {
    id: raw.id as string,
    activo_id: raw.activo_id as string,
    operador_id: raw.operador_id as string,
    lectura: raw.lectura as number,
    lectura_unidad: raw.lectura_unidad as InspeccionFila["lectura_unidad"],
    nivel_combustible: raw.nivel_combustible as InspeccionFila["nivel_combustible"],
    nivel_aceite: raw.nivel_aceite as InspeccionFila["nivel_aceite"],
    estado: raw.estado as InspeccionFila["estado"],
    iniciada_en: raw.iniciada_en as string,
    finalizada_en: (raw.finalizada_en as string | null) ?? null,
    tiempo_segundos: (raw.tiempo_segundos as number | null) ?? null,
    es_express: (raw.es_express as boolean) ?? false,
    puntajes: (raw.puntajes as InspeccionFila["puntajes"]) ?? {},
    activo_codigo: null,
    activo_nombre: null,
    operador_nombre: null,
    rutinas_activadas: [],
  };
}

export async function getInspeccion(id: string): Promise<DetalleInspeccion | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mantenimiento_inspecciones")
    .select(CAMPOS_INSPECCION.join(","))
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const base = mapperFilaInspeccionBase(data as unknown as FilaInspeccionRaw);

  const [detalleActivo, respuestas, operador, rutinas] = await Promise.all([
    getActivoDetalle(base.activo_id),
    supabase
      .from("mantenimiento_inspeccion_respuestas")
      .select("id, inspeccion_id, pregunta_id, respuesta, justificacion, foto_path")
      .eq("inspeccion_id", id),
    supabase
      .from("profiles")
      .select("nombres, apellidos")
      .eq("id", base.operador_id)
      .maybeSingle(),
    supabase
      .from("mantenimiento_inspeccion_rutinas")
      .select("mantenimiento_rutinas(nombre)")
      .eq("inspeccion_id", id),
  ]);

  base.activo_codigo = detalleActivo?.activo.codigo_interno ?? null;
  base.activo_nombre = detalleActivo
    ? nombreActivo({
        nombre: detalleActivo?.activo.nombre,
        marca: detalleActivo?.vehiculo?.marca ?? detalleActivo?.maquina?.marca ?? detalleActivo?.equipo?.marca,
        modelo: detalleActivo?.vehiculo?.modelo ?? detalleActivo?.maquina?.modelo ?? detalleActivo?.equipo?.modelo,
      })
    : null;
  base.operador_nombre =
    operador.data && "nombres" in operador.data
      ? `${(operador.data as { nombres: string | null }).nombres ?? ""} ${(operador.data as { apellidos: string | null }).apellidos ?? ""}`.trim() || null
      : null;

  const filasRespuestas = (respuestas.data ?? []) as unknown as RespuestaInspeccion[];
  const respuesta_por_pregunta: Record<string, RespuestaInspeccion> = {};
  for (const r of filasRespuestas) respuesta_por_pregunta[r.pregunta_id] = r;

  const rutinasRaw = (rutinas.data ?? []) as unknown as {
    mantenimiento_rutinas: { nombre: string } | null;
  }[];
  base.rutinas_activadas = rutinasRaw
    .map((r) => r.mantenimiento_rutinas?.nombre)
    .filter((n): n is string => Boolean(n));

  return { ...base, respuesta_por_pregunta };
}