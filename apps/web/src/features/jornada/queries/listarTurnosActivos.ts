import { createClient } from "@/lib/supabase/server";
import type { TurnoOpcion } from "../types/jornada.types";

/**
 * Turnos activos para la creación semanal de la planeación. La RLS de `turnos`
 * limita por tenant; cualquier usuario autenticado puede leer el catálogo.
 */
export async function listarTurnosActivos(): Promise<TurnoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("turnos")
    .select("id, nombre, activo, hora_inicio, hora_fin")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TurnoOpcion[];
}