import { createClient } from "@/lib/supabase/server";
import { tipoARecurso } from "../types/activo.types";
import type { ActivoRow, ListadoActivo, TipoActivo } from "../types/activo.types";

export type FiltrosActivos = {
  busqueda?: string;
  tipo?: TipoActivo | "" | "todos";
};

const CAMPOS_SELECCION = [
  "id",
  "tipo",
  "codigo_interno",
  "nombre",
  "estado",
  "subtipo",
  "estado_operativo",
  "fecha_adquisicion",
  "color",
  "numero_motor",
  "lectura_inicial",
  "serie",
  "origen",
  "centro_servicio_id",
  "proveedor_id",
  "created_at",
  "updated_at",
] as const;

/**
 * Listado de activos. Incluye marca/modelo (join a la tabla de especialidad)
 * para poder mostrar el nombre de referencia derivado de marca+modelo.
 */
export async function listActivos(
  filtros: FiltrosActivos = {}
): Promise<ListadoActivo[]> {
  const supabase = await createClient();

  // PostgREST es incapaz de tipar el resultado del join en tablas dinámicas;
  // la especialidad se une por tipo (solo una de las tres puede tener datos).
  const { data, error } = await supabase.from("activos").select(
    `${CAMPOS_SELECCION.join(",")},
     vehiculos(activo_id, marca, modelo),
     maquinas(activo_id, marca, modelo),
     equipos(activo_id, marca, modelo)`
  );

  if (error) {
    throw new Error(error.message);
  }

  const filas = data ?? [];

  let lista: ListadoActivo[] = filas.map((fila) => {
    const raw = fila as unknown as {
      id: string;
      tipo: TipoActivo;
      codigo_interno: string;
      nombre: string | null;
      estado: string;
      subtipo: string;
      estado_operativo: string;
      fecha_adquisicion: string | null;
      color: string | null;
      numero_motor: string | null;
      lectura_inicial: number | null;
      serie: string | null;
      origen: string;
      centro_servicio_id: string | null;
      proveedor_id: string | null;
      created_at: string;
      updated_at: string;
      vehiculos: { marca: string | null; modelo: string | null }[] | null;
      maquinas: { marca: string | null; modelo: string | null }[] | null;
      equipos: { marca: string | null; modelo: string | null }[] | null;
    };
    const especialidad =
      raw.vehiculos?.[0] ?? raw.maquinas?.[0] ?? raw.equipos?.[0];

    return {
      ...(raw as unknown as ActivoRow),
      marca: especialidad?.marca ?? null,
      modelo: especialidad?.modelo ?? null,
    };
  });

  const busqueda = filtros.busqueda?.trim();
  if (busqueda) {
    const termino = busqueda.toLowerCase();
    lista = lista.filter((a) =>
      a.codigo_interno.toLowerCase().includes(termino) ||
      (a.nombre ?? "").toLowerCase().includes(termino) ||
      `${a.marca ?? ""} ${a.modelo ?? ""}`.toLowerCase().includes(termino)
    );
  }

  if (filtros.tipo && filtros.tipo !== "todos") {
    lista = lista.filter((a) => a.tipo === filtros.tipo);
  }

  lista.sort((a, b) =>
    (a.nombre ?? `${a.marca} ${a.modelo}`).localeCompare(
      b.nombre ?? `${b.marca} ${b.modelo}`
    )
  );

  return lista;
}

/** Ubicación/permiso usado por listados filtrados por tipo. */
export function permisoVerTipo(tipo: TipoActivo): string {
  return `activos.${tipoARecurso(tipo)}.ver`;
}

export function esActivoRetirado(activo: ActivoRow): boolean {
  return activo.estado === "retirado";
}