import { createClient } from "@/lib/supabase/server";
import type { ConfiguracionMantenimiento } from "../types/mantenimiento.types";

/** Configuración global (fila única). Devuelve el valor por defecto si no existe. */
export async function getConfiguracion(): Promise<ConfiguracionMantenimiento> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("mantenimiento_configuracion")
    .select("id, tiempo_minimo_segundos, updated_at")
    .maybeSingle();

  if (!data) {
    return {
      id: "00000000-0000-4000-8000-000000000001",
      tiempo_minimo_segundos: 120,
      updated_at: "",
    };
  }

  return data as ConfiguracionMantenimiento;
}