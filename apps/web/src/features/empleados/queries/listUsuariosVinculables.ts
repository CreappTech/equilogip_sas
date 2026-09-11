import { createClient } from "@/lib/supabase/server";
import type { UsuarioVinculable } from "../types/empleado.types";

/**
 * Usuarios de sistema disponibles para vincular a un empleado: activos y
 * sin relación previa (o ya vinculados a este mismo empleado, para poder
 * conservarlos en el listado del Combobox).
 */
export async function listUsuariosVinculables(
  empleadoId: string
): Promise<UsuarioVinculable[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nombres, apellidos, email_login")
    .eq("activo", true)
    .or(`fk_empleado_id.is.null,fk_empleado_id.eq.${empleadoId}`)
    .order("nombres", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UsuarioVinculable[];
}