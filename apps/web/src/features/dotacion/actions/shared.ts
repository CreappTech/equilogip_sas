import type { PostgrestError } from "@supabase/supabase-js";

import { getPermisos } from "@/lib/auth/permisos";

/** Verifica que el usuario autenticado posea un permiso (o sea súper admin). */
export async function requierePermisoDotacion(codigo: string): Promise<boolean> {
  const permisos = await getPermisos();
  return permisos.includes("*") || permisos.includes(codigo);
}

export function emptyToNull(value?: string | null): string | null {
  const limpio = value?.trim();
  return limpio ? limpio : null;
}

/**
 * Traducción de errores de las operaciones de dotación, incluyendo los que
 * elevan las funciones RPC (`P0001` reglas de negocio, `P0002` no encontrado).
 */
export function traducirError(error: PostgrestError): string {
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  if (error.code === "P0002") {
    return "La entrega no existe.";
  }
  if (error.code === "P0001") {
    if (error.message.includes("firma")) {
      return "La firma del receptor es obligatoria.";
    }
    if (error.message.includes("al menos un elemento")) {
      return "La entrega debe tener al menos un elemento.";
    }
    if (error.message.includes("anulada")) {
      return "No se puede editar una entrega anulada.";
    }
    return "No se pudo guardar la entrega.";
  }
  if (error.code === "23503") {
    return "El empleado seleccionado no es válido.";
  }
  return error.message;
}