import { createClient } from "@/lib/supabase/server";
import { getInspeccion } from "./getInspeccion";
import type { DetalleInspeccion } from "../types/mantenimiento.types";

/** Borrador en curso del operador (a lo sumo uno por operador, RLS auto-lectura). */
export async function getBorradorActivo(
  userId: string
): Promise<DetalleInspeccion | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("mantenimiento_inspecciones")
    .select("id")
    .eq("operador_id", userId)
    .eq("estado", "borrador")
    .maybeSingle();

  if (!data?.id) return null;

  return getInspeccion(data.id);
}