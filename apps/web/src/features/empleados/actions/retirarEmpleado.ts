"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { retirarEmpleadoSchema } from "../schemas/retirarEmpleadoSchema";
import { requierePermisoEmpleado, traducirError } from "./shared";
import { permisoEmpleado } from "../types/empleado.types";
import type { ResultadoEmpleado } from "../types/empleado.types";

/**
 * Retiro de empleado = cambio de estado a 'retirado' (nunca DELETE).
 * Un empleado retirado no vuelve a editarse (lo garantiza RLS); el usuario
 * vinculado conserva su cuenta (FK ON DELETE SET NULL es solo por consistencia).
 */
export async function retirarEmpleado(input: {
  id: string;
}): Promise<ResultadoEmpleado> {
  await requireUser();

  const parsed = retirarEmpleadoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Empleado inválido." };
  }
  const { id } = parsed.data;

  const supabase = await createClient();

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, estado, nombres, apellidos")
    .eq("id", id)
    .single();

  if (!empleado) {
    return { ok: false, error: "No se encontró el empleado." };
  }

  if (empleado.estado === "retirado") {
    return { ok: false, error: "El empleado ya está retirado." };
  }

  if (!(await requierePermisoEmpleado(permisoEmpleado("eliminar")))) {
    return { ok: false, error: "No tienes permiso para retirar empleados." };
  }

  const { error } = await supabase
    .from("empleados")
    .update({ estado: "retirado" })
    .eq("id", id);

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  revalidatePath("/empleados");
  revalidatePath(`/empleados/${id}`);
  return { ok: true };
}