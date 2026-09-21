import { createClient } from "@/lib/supabase/server";
import type { PreguntaMantenimiento, TipoActivoAplica } from "../types/mantenimiento.types";

export type FiltrosPreguntas = {
  tipo_activo?: TipoActivoAplica;
  soloActivas?: boolean;
};

export async function listPreguntas(
  filtros: FiltrosPreguntas = {}
): Promise<PreguntaMantenimiento[]> {
  const supabase = await createClient();

  let query = supabase
    .from("mantenimiento_preguntas")
    .select("*, mantenimiento_categorias(nombre, codigo)");

  if (filtros.soloActivas) {
    query = query.eq("activo", true);
  }
  if (filtros.tipo_activo) {
    query = query.eq("tipo_activo", filtros.tipo_activo);
  }

  const { data, error } = await query.order("categoria_id").order("orden");

  if (error) throw new Error(error.message);

  return (data ?? []).map((fila) => {
    const raw = fila as unknown as {
      id: string;
      categoria_id: string;
      tipo_activo: TipoActivoAplica;
      texto: string;
      orden: number;
      activo: boolean;
      created_at: string;
      updated_at: string;
      mantenimiento_categorias: { nombre: string; codigo: string } | null;
    };
    return {
      id: raw.id,
      categoria_id: raw.categoria_id,
      tipo_activo: raw.tipo_activo,
      texto: raw.texto,
      orden: raw.orden,
      activo: raw.activo,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      categoria_nombre: raw.mantenimiento_categorias?.nombre ?? null,
      categoria_codigo: raw.mantenimiento_categorias?.codigo ?? null,
    };
  });
}