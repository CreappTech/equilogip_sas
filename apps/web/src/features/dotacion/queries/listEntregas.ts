import { createClient } from "@/lib/supabase/server";
import type { ListadoEntrega } from "../types/dotacion.types";

const CAMPOS_SELECCION = [
  "id",
  "empleado_id",
  "fecha_entrega",
  "tipo_entrega",
  "entregado_por",
  "observaciones",
  "evidencia_paths",
  "firma_path",
  "estado",
  "created_at",
  "updated_at",
] as const;

/**
 * Listado de entregas de dotación, más recientes primero. Incluye el nombre
 * y documento del empleado (join). La RLS de `empleados` ya limita el embedding:
 * quien no tenga `empleados.empleados.ver` verá el resto de columnas con el
 * empleado en blanco.
 */
export async function listEntregas(busqueda = ""): Promise<ListadoEntrega[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("entregas_dotacion")
    .select(
      `${CAMPOS_SELECCION.join(",")}, empleados(nombres, apellidos, documento_identidad)`
    );

  if (error) {
    throw new Error(error.message);
  }

  const filas = (data ?? []) as unknown as Array<
    ListadoEntrega & {
      empleados: { nombres: string; apellidos: string; documento_identidad: string }[] | null;
    }
  >;

  let lista: ListadoEntrega[] = filas.map(({ empleados, ...fila }) => ({
    ...fila,
    empleado_nombre: empleados
      ? `${empleados[0]?.nombres ?? ""} ${empleados[0]?.apellidos ?? ""}`.trim() || null
      : null,
    empleado_documento: empleados?.[0]?.documento_identidad ?? null,
  }));

  const b = busqueda.trim().toLowerCase();
  if (b) {
    lista = lista.filter((e) =>
      [
        e.empleado_nombre ?? "",
        e.empleado_documento ?? "",
        e.entregado_por,
        e.observaciones ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(b)
    );
  }

  lista.sort(
    (a, b2) =>
      b2.fecha_entrega.localeCompare(a.fecha_entrega) ||
      b2.created_at.localeCompare(a.created_at)
  );

  return lista;
}