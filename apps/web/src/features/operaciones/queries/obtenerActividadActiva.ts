import { createClient } from "@/lib/supabase/server";
import type {
  DetalleActividad,
  EventoActividad,
  ListadoActividad,
  TipoEvento,
} from "../types/operaciones.types";
import { COLUMNAS_VISTA } from "./listActividades";

interface FilaEvento {
  id: string;
  tipo_evento: string;
  fecha_hora: string;
  observaciones: string | null;
  causales_pausa?: { nombre?: string | null } | null;
}

/**
 * Detalle de una actividad para el cuadro de control: fila de la vista resumen
 * (con nombres legibles de cada FK) + bitácora completa (operacion_eventos).
 * La vista es la fuente única del cálculo de horas (AGENTS §19); los datos de
 * la fila se obtienen con joins igual que en `listActividades`.
 */
export async function obtenerActividadActiva(
  actividadId: string
): Promise<DetalleActividad | null> {
  const supabase = await createClient();

  const { data: eventos, error: errorEventos } = await supabase
    .from("operacion_eventos")
    .select(
      "id, tipo_evento, fecha_hora, observaciones, causales_pausa(nombre)"
    )
    .eq("actividad_id", actividadId)
    .order("fecha_hora", { ascending: true });

  if (errorEventos) {
    throw new Error(errorEventos.message);
  }

  const { data, error } = await supabase
    .from("vw_operacion_actividades_resumen")
    .select(
      `${COLUMNAS_VISTA.join(",")},
       activos(codigo_interno, nombre),
       empleados(nombres, apellidos),
       centros_servicio(nombre),
       tipos_actividad(nombre),
       clientes(nombre)`
    )
    .eq("actividad_id", actividadId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const fila = data as unknown as Record<string, unknown> & {
    activos?: { codigo_interno?: string | null; nombre?: string | null } | null;
    empleados?: { nombres?: string | null; apellidos?: string | null } | null;
    centros_servicio?: { nombre?: string | null } | null;
    tipos_actividad?: { nombre?: string | null } | null;
    clientes?: { nombre?: string | null } | null;
  };

  const base = {
    ...fila,
    id: fila.actividad_id as string,
    activo_codigo: fila.activos?.codigo_interno ?? null,
    activo_nombre: fila.activos?.nombre ?? null,
    operador_nombres: fila.empleados?.nombres ?? null,
    operador_apellidos: fila.empleados?.apellidos ?? null,
    centro_servicio_nombre: fila.centros_servicio?.nombre ?? null,
    tipo_actividad_nombre: fila.tipos_actividad?.nombre ?? null,
    cliente_nombre: fila.clientes?.nombre ?? null,
    activo_marca: null,
    activo_modelo: null,
  } as unknown as ListadoActividad;

  const bitacora: EventoActividad[] = ((eventos ?? []) as FilaEvento[]).map(
    (e) => ({
      id: e.id,
      tipo_evento: e.tipo_evento as TipoEvento,
      fecha_hora: e.fecha_hora,
      causal_nombre: e.causales_pausa?.nombre ?? null,
      observaciones: e.observaciones,
    })
  );

  return { ...base, eventos: bitacora };
}