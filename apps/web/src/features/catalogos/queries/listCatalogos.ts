import { createClient } from "@/lib/supabase/server";
import { CATALOGOS } from "../catalogo.config";
import type { RecursoCatalogo } from "../types/catalogos";

/**
 * Lista las filas de un catálogo del maestro de datos.
 * La RLS de cada tabla ya limita al tenant del usuario (tablas tenant-scoped)
 * o a su permiso de ver (subtipos/proveedores).
 * El orden usa la columna definida por recurso (orden | nombre).
 */
export async function listarCatalogo<TRecurso extends RecursoCatalogo>(
  recurso: TRecurso
): Promise<Array<{ id: string } & Record<string, unknown>>> {
  const supabase = await createClient();
  const config = CATALOGOS[recurso];

  const { data, error } = await supabase
    .from(config.tabla)
    .select("*")
    .order(config.ordenColumna, { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Array<{ id: string } & Record<string, unknown>>;
}