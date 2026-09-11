"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  novedadSchema,
  correccionSchema,
  autorizacionExtraSchema,
  idSchema,
  type NovedadInput,
  type CorreccionInput,
  type AutorizacionExtraInput,
} from "../schemas/jornadaSchema";
import { requierePermisoJornada, traducirError } from "./shared";
import { permisoJornada, type ResultadoJornada } from "../types/jornada.types";

export async function registrarNovedad(
  input: NovedadInput
): Promise<ResultadoJornada> {
  await requireUser();

  if (!(await requierePermisoJornada(permisoJornada("marcar")))) {
    return { ok: false, error: "No tienes permiso para registrar novedades." };
  }

  const parsed = novedadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  const { error } = await supabase.from("jornada_novedades").insert({
    operador_id: parsed.data.operador_id,
    fecha: parsed.data.fecha,
    tipo_novedad: parsed.data.tipo_novedad,
    observaciones: parsed.data.observaciones ?? null,
    registrado_por: userId,
  });

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/jornada/asistencia");
  return { ok: true };
}

export async function corregirMarcacion(
  marcacionId: string,
  input: CorreccionInput
): Promise<ResultadoJornada> {
  await requireUser();

  if (!(await requierePermisoJornada(permisoJornada("corregir")))) {
    return {
      ok: false,
      error: "No tienes permiso para corregir marcaciones.",
    };
  }

  const idParsed = idSchema.safeParse({ id: marcacionId });
  if (!idParsed.success) {
    return { ok: false, error: "ID inválido." };
  }

  const parsed = correccionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  // Obtener valor actual
  const { data: marcacion, error: fetchError } = await supabase
    .from("jornada_marcaciones")
    .select("hora_inicio_real, hora_fin_real")
    .eq("id", marcacionId)
    .single();

  if (fetchError || !marcacion) {
    return { ok: false, error: "Marcación no encontrada." };
  }

  const campo = parsed.data.campo_corregido;
  const valorAnterior =
    campo === "hora_inicio_real"
      ? marcacion.hora_inicio_real
      : marcacion.hora_fin_real;

  // Actualizar la marcación
  const updateData: Record<string, unknown> = {
    [campo]: parsed.data.valor_nuevo,
  };

  const { error: updateError } = await supabase
    .from("jornada_marcaciones")
    .update(updateData)
    .eq("id", marcacionId);

  if (updateError) return { ok: false, error: traducirError(updateError) };

  // Registrar en auditoría
  const { error: corrError } = await supabase
    .from("jornada_correcciones")
    .insert({
      marcacion_id: marcacionId,
      campo_corregido: campo,
      valor_anterior: valorAnterior,
      valor_nuevo: parsed.data.valor_nuevo,
      motivo: parsed.data.motivo,
      corregido_por: userId,
    });

  if (corrError) return { ok: false, error: traducirError(corrError) };

  revalidatePath("/jornada/asistencia");
  return { ok: true };
}

export async function autorizarHoraExtra(
  marcacionId: string,
  input: AutorizacionExtraInput
): Promise<ResultadoJornada> {
  await requireUser();

  if (!(await requierePermisoJornada(permisoJornada("corregir")))) {
    return {
      ok: false,
      error: "No tienes permiso para autorizar horas extra.",
    };
  }

  const idParsed = idSchema.safeParse({ id: marcacionId });
  if (!idParsed.success) {
    return { ok: false, error: "ID inválido." };
  }

  const parsed = autorizacionExtraSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  const { error } = await supabase
    .from("jornada_autorizaciones_extra")
    .insert({
      marcacion_id: marcacionId,
      autorizado_por: userId,
      motivo: parsed.data.motivo,
    });

  if (error) return { ok: false, error: traducirError(error) };

  return { ok: true };
}
