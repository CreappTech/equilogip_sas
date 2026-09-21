import type { PostgrestError } from "@supabase/supabase-js";
import { getPermisos, requireUser } from "@/lib/auth/permisos";

/**
 * Autoriza que el usuario autenticado tenga el permiso indicado (o "*").
 * requireUser redirige al login si no hay sesión; si falta permiso devuelve null.
 */
export async function autorizar(
  codigo: string
): Promise<{ id: string } | null> {
  const user = await requireUser();
  const permisos = await getPermisos();
  if (!permisos.includes("*") && !permisos.includes(codigo)) return null;
  return { id: user.id };
}

export function traducirError(error: PostgrestError): string {
  if (error.code === "23505") {
    if (error.message.includes("operador_borrador")) {
      return "Ya tienes una inspección en curso. Reanúdala o descártala antes de iniciar otra.";
    }
    if (error.message.includes("pregunta")) {
      return "Ya existe una respuesta para esa pregunta.";
    }
    return "Ya existe un registro con esos datos únicos.";
  }
  if (error.code === "23503") {
    if (error.message.includes("activo")) {
      return "El equipo seleccionado no es válido.";
    }
    if (error.message.includes("categoria")) {
      return "La categoría seleccionada no es válida.";
    }
    return "Registro referenciado no encontrado.";
  }
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  if (error.code === "23514") {
    return "Los datos no cumplen las reglas del módulo de mantenimiento.";
  }
  return error.message;
}