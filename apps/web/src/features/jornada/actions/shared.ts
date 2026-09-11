import type { PostgrestError } from "@supabase/supabase-js";

import { getPermisos } from "@/lib/auth/permisos";

export async function requierePermisoJornada(
  codigo: string
): Promise<boolean> {
  const permisos = await getPermisos();
  return permisos.includes("*") || permisos.includes(codigo);
}

export function emptyToNull(value?: string | null): string | null {
  const limpio = value?.trim();
  return limpio ? limpio : null;
}

export function traducirError(error: PostgrestError): string {
  if (error.code === "23505") {
    if (error.message.includes("jornada_prog_operador_fecha_unico")) {
      return "Ya existe programación para este operador en esa fecha.";
    }
    if (error.message.includes("festivos_fecha_pais_unico")) {
      return "Ya existe un festivo registrado para esa fecha.";
    }
    return "Ya existe un registro con esos datos únicos.";
  }
  if (error.code === "23503") {
    if (error.message.includes("empleados")) {
      return "El operador seleccionado no es válido.";
    }
    if (error.message.includes("jornada_programacion")) {
      return "La programación referenciada no existe.";
    }
    if (error.message.includes("jornada_marcaciones")) {
      return "La marcación referenciada no existe.";
    }
    if (error.message.includes("turnos")) {
      return "El turno seleccionado no es válido.";
    }
    if (error.message.includes("centros_servicio")) {
      return "El centro de servicio seleccionado no es válido.";
    }
    return "Registro referenciado no encontrado.";
  }
  if (error.code === "23514") {
    if (error.message.includes("jornada_prog_horas_validas")) {
      return "La hora de inicio debe ser anterior a la hora de fin.";
    }
    if (error.message.includes("check")) {
      return "El valor seleccionado no es válido.";
    }
    return "El valor no cumple las restricciones.";
  }
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  return error.message;
}
