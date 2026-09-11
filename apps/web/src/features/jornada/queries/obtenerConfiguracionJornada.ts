import { createClient } from "@/lib/supabase/server";
import type { ConfiguracionJornada } from "../types/jornada.types";

export async function obtenerConfiguracionJornada(): Promise<ConfiguracionJornada | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("configuracion_jornada")
    .select("id, tenant_id, hora_inicio_nocturna, hora_fin_nocturna, horas_jornada_ordinaria")
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    hora_inicio_nocturna: data.hora_inicio_nocturna,
    hora_fin_nocturna: data.hora_fin_nocturna,
    horas_jornada_ordinaria: Number(data.horas_jornada_ordinaria),
  };
}
