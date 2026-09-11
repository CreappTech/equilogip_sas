import { createClient } from "@/lib/supabase/server";
import type { CargoOpcion } from "../types/empleado.types";

/**
 * Catálogo de cargos para el formulario. La lectura está gobernada por la
 * RLS de `cargos` (`tenant_id = auth_tenant_id()`); un rol sin acceso al
 * catálogo obtiene lista vacía y el formulario queda deshabilitado.
 */
export async function listCargos(): Promise<CargoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cargos")
    .select("id, nombre, activo, orden")
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CargoOpcion[];
}