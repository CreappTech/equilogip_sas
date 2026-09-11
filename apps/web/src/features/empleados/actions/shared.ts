import type { PostgrestError } from "@supabase/supabase-js";

import { getPermisos } from "@/lib/auth/permisos";

/** Verifica que el usuario autenticado posea un permiso (o sea súper admin). */
export async function requierePermisoEmpleado(codigo: string): Promise<boolean> {
  const permisos = await getPermisos();
  return permisos.includes("*") || permisos.includes(codigo);
}

export function emptyToNull(value?: string | null): string | null {
  const limpio = value?.trim();
  return limpio ? limpio : null;
}

export function traducirError(error: PostgrestError): string {
  if (error.code === "23505") {
    if (error.message.includes("documento_identidad")) {
      return "Ya existe un empleado con ese documento de identidad.";
    }
    if (error.message.includes("fk_empleado_id")) {
      return "Este usuario ya está vinculado a otro empleado.";
    }
    return "Ya existe un registro con esos datos únicos.";
  }
  if (error.code === "23503") {
    if (error.message.includes("cargos")) {
      return "El cargo seleccionado no es válido.";
    }
    if (error.message.includes("eps")) {
      return "La EPS seleccionada no es válida.";
    }
    if (error.message.includes("arl")) {
      return "La ARL seleccionada no es válida.";
    }
    if (error.message.includes("fondos_pension")) {
      return "El fondo de pensión seleccionado no es válido.";
    }
    if (error.message.includes("bancos")) {
      return "El banco seleccionado no es válido.";
    }
    return "Registro referenciado no encontrado.";
  }
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  return error.message;
}