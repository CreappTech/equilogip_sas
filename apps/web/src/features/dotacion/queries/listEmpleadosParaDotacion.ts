import { createClient } from "@/lib/supabase/server";
import type { EmpleadoDotacionOpcion } from "../types/dotacion.types";

/**
 * Empleados activos para el selector del formulario de dotación. La RLS de
 * `empleados` exige `empleados.empleados.ver`: quien solo tenga permisos de
 * dotación vería la lista vacía (comportamiento esperado, nunca se debilita).
 */
export async function listEmpleadosParaDotacion(): Promise<EmpleadoDotacionOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("empleados")
    .select("id, nombres, apellidos, documento_identidad, estado, cargos(nombre)")
    .eq("estado", "activo");

  if (error) {
    throw new Error(error.message);
  }

  const filas = (data ?? []) as unknown as Array<
    EmpleadoDotacionOpcion & {
      cargos: { nombre: string }[] | null;
    }
  >;

  return filas
    .map(({ cargos, ...empleado }) => ({
      ...empleado,
      cargo_nombre: cargos?.[0]?.nombre ?? null,
    }))
    .sort((a, b) =>
      `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es")
    );
}