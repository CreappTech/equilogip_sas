import { createClient } from "@/lib/supabase/server";
import type { ListadoEmpleado } from "../types/empleado.types";

export type FiltrosEmpleados = {
  busqueda?: string;
};

const CAMPOS_SELECCION = [
  "id",
  "nombres",
  "apellidos",
  "documento_identidad",
  "fecha_nacimiento",
  "fecha_ingreso",
  "cargo_id",
  "estado",
  "telefono",
  "email_contacto",
  "created_at",
  "updated_at",
] as const;

/**
 * Listado de empleados. Incluye el nombre del cargo (join al catálogo)
 * para poder mostrarlo como columna legible.
 */
export async function listEmpleados(
  filtros: FiltrosEmpleados = {}
): Promise<ListadoEmpleado[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("empleados")
    .select(`${CAMPOS_SELECCION.join(",")}, cargos(nombre)`);

  if (error) {
    throw new Error(error.message);
  }

  const filas = (data ?? []) as unknown as Array<
    ListadoEmpleado & { cargos: { nombre: string }[] | null }
  >;

  let lista: ListadoEmpleado[] = filas.map(({ cargos, ...fila }) => ({
    ...fila,
    cargo_nombre: cargos?.[0]?.nombre ?? null,
  }));

  const busqueda = filtros.busqueda?.trim();
  if (busqueda) {
    const termino = busqueda.toLowerCase();
    lista = lista.filter((e) =>
      [
        e.nombres,
        e.apellidos,
        e.documento_identidad,
        e.cargo_nombre ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(termino)
    );
  }

  lista.sort((a, b) =>
    `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es")
  );

  return lista;
}