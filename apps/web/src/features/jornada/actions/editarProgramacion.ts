"use server";

import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  programacionSchema,
  idSchema,
  type ProgramacionInput,
} from "../schemas/jornadaSchema";
import { emptyToNull, requierePermisoJornada, traducirError } from "./shared";
import { permisoJornada, type ResultadoJornada } from "../types/jornada.types";

export async function editarProgramacion(
  id: string,
  input: ProgramacionInput
): Promise<ResultadoJornada> {
  await requireUser();

  if (!(await requierePermisoJornada(permisoJornada("editar")))) {
    return { ok: false, error: "No tienes permiso para editar programación." };
  }

  const idParsed = idSchema.safeParse({ id });
  if (!idParsed.success) {
    return { ok: false, error: "ID inválido." };
  }

  const parsed = programacionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();
  const { operador_id, fecha, hora_inicio_programada, hora_fin_programada, turno_id, centro_servicio_id } =
    parsed.data;

  const { error } = await supabase
    .from("jornada_programacion")
    .update({
      operador_id,
      fecha,
      hora_inicio_programada,
      hora_fin_programada,
      turno_id: emptyToNull(turno_id),
      centro_servicio_id: emptyToNull(centro_servicio_id),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  return { ok: true };
}
