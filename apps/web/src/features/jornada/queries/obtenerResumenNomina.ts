import { createClient } from "@/lib/supabase/server";
import type { ResumenNominaFila } from "../types/jornada.types";

export type FiltrosResumenNomina = {
  semana_inicio?: string;
  semana_fin?: string;
  operador_id?: string;
};

export async function obtenerResumenNomina(
  filtros: FiltrosResumenNomina = {}
): Promise<ResumenNominaFila[]> {
  const supabase = await createClient();

  let query = supabase
    .from("vw_resumen_nomina_semanal")
    .select("*")
    .order("semana_inicio", { ascending: false })
    .order("operador_nombre");

  if (filtros.semana_inicio) {
    query = query.gte("semana_inicio", filtros.semana_inicio);
  }
  if (filtros.semana_fin) {
    query = query.lte("semana_inicio", filtros.semana_fin);
  }
  if (filtros.operador_id) {
    query = query.eq("operador_id", filtros.operador_id);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data ?? []) as ResumenNominaFila[];
}
