import { createClient } from "@/lib/supabase/server";
import type { ListadoActividad } from "../types/operaciones.types";

export const COLUMNAS_VISTA = [
  "actividad_id",
  "activo_id",
  "operador_id",
  "centro_servicio_id",
  "tipo_actividad_id",
  "cliente_id",
  "estado",
  "fecha_creacion",
  "inicio_hora",
  "fin_hora",
  "horas_trabajadas",
  "horas_limitadas",
  "total_novedades",
] as const;

/**
 * Listado de actividades operativas con los nombres legibles de cada FK
 * (activo, operador, centro de servicio, tipo de actividad, cliente).
 * Los totales de horas/novedades vienen de la vista vw_operacion_actividades_resumen
 * (fuente única del cálculo, ver AGENTS §19).
 */
export async function listActividades(): Promise<ListadoActividad[]> {
  const supabase = await createClient();

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
    .order("fecha_creacion", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const filas = (data ?? []) as unknown as Array<
    Record<string, unknown> & {
      activos?: { codigo_interno?: string | null; nombre?: string | null } | null;
      empleados?: { nombres?: string | null; apellidos?: string | null } | null;
      centros_servicio?: { nombre?: string | null } | null;
      tipos_actividad?: { nombre?: string | null } | null;
      clientes?: { nombre?: string | null } | null;
    }
  >;

  return filas.map(({ activos, empleados, centros_servicio, tipos_actividad, clientes, ...fila }) => ({
    ...fila,
    id: fila.actividad_id as string,
    activo_codigo: activos?.codigo_interno ?? null,
    activo_nombre: activos?.nombre ?? null,
    operador_nombres: empleados?.nombres ?? null,
    operador_apellidos: empleados?.apellidos ?? null,
    centro_servicio_nombre: centros_servicio?.nombre ?? null,
    tipo_actividad_nombre: tipos_actividad?.nombre ?? null,
    cliente_nombre: clientes?.nombre ?? null,
    activo_marca: null,
    activo_modelo: null,
  } as unknown as ListadoActividad));
}