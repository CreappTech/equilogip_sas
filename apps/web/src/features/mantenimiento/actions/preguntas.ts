"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { preguntaSchema, type PreguntaFormValues } from "../schemas/preguntaSchema";
import type { ResultadoMantenimiento } from "../types/mantenimiento.types";
import { autorizar, traducirError } from "./shared";

export async function crearPregunta(
  input: PreguntaFormValues
): Promise<ResultadoMantenimiento> {
  const user = await autorizar("mantenimiento.preguntas.crear");
  if (!user) {
    return { ok: false, error: "No tienes permiso para crear preguntas." };
  }

  const parsed = preguntaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("mantenimiento_preguntas").insert({
    ...parsed.data,
    categoria_id: parsed.data.categoria_id,
  });

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/mantenimiento");
  revalidatePath("/mantenimiento/preguntas");
  return { ok: true };
}

export async function editarPregunta(
  id: string,
  input: PreguntaFormValues
): Promise<ResultadoMantenimiento> {
  const user = await autorizar("mantenimiento.preguntas.editar");
  if (!user) {
    return { ok: false, error: "No tienes permiso para editar preguntas." };
  }

  const parsed = preguntaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mantenimiento_preguntas")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/mantenimiento");
  revalidatePath("/mantenimiento/preguntas");
  return { ok: true };
}

/** Activar/retirar una pregunta (nunca DELETE: las respuestas la referencian). */
export async function cambiarEstadoPregunta(
  id: string,
  activo: boolean
): Promise<ResultadoMantenimiento> {
  const user = await autorizar("mantenimiento.preguntas.editar");
  if (!user) {
    return { ok: false, error: "No tienes permiso para modificar preguntas." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mantenimiento_preguntas")
    .update({ activo })
    .eq("id", id);

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/mantenimiento");
  revalidatePath("/mantenimiento/preguntas");
  return { ok: true };
}