import { createClient } from "@/lib/supabase/server";
import type { RutinaMantenimiento } from "../types/mantenimiento.types";

export async function listRutinas(): Promise<RutinaMantenimiento[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mantenimiento_rutinas")
    .select("*")
    .order("unidad")
    .order("umbral");

  if (error) throw new Error(error.message);

  return (data ?? []) as RutinaMantenimiento[];
}