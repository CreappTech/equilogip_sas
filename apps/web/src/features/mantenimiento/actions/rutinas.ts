"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rutinaSchema, type RutinaFormValues } from "../schemas/rutinaSchema";
import type { ResultadoMantenimiento } from "../types/mantenimiento.types";
import { autorizar, traducirError } from "./shared";

export async function crearRutina(
  input: RutinaFormValues
): Promise<ResultadoMantenimiento> {
  const user = await autorizar("mantenimiento.rutinas.crear");
  if (!user) {
    return { ok: false, error: "No tienes permiso para crear rutinas." };
  }

  const parsed = rutinaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("mantenimiento_rutinas").insert(parsed.data);

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/mantenimiento");
  revalidatePath("/mantenimiento/rutinas");
  return { ok: true };
}

export async function editarRutina(
  id: string,
  input: RutinaFormValues
): Promise<ResultadoMantenimiento> {
  const user = await autorizar("mantenimiento.rutinas.editar");
  if (!user) {
    return { ok: false, error: "No tienes permiso para editar rutinas." };
  }

  const parsed = rutinaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mantenimiento_rutinas")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/mantenimiento");
  revalidatePath("/mantenimiento/rutinas");
  return { ok: true };
}

/** Activar/retirar una rutina (nunca DELETE). */
export async function cambiarEstadoRutina(
  id: string,
  activo: boolean
): Promise<ResultadoMantenimiento> {
  const user = await autorizar("mantenimiento.rutinas.editar");
  if (!user) {
    return { ok: false, error: "No tienes permiso para modificar rutinas." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mantenimiento_rutinas")
    .update({ activo })
    .eq("id", id);

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/mantenimiento");
  revalidatePath("/mantenimiento/rutinas");
  return { ok: true };
}