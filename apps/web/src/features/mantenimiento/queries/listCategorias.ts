import { createClient } from "@/lib/supabase/server";
import type { CategoriaMantenimiento } from "../types/mantenimiento.types";

export async function listCategorias(): Promise<CategoriaMantenimiento[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mantenimiento_categorias")
    .select("*")
    .order("orden");

  if (error) throw new Error(error.message);

  return (data ?? []) as CategoriaMantenimiento[];
}