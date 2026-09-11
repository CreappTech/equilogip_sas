"use server";

import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  programacionSemanalSchema,
  type ProgramacionSemanalInput,
} from "../schemas/jornadaSchema";
import { emptyToNull, requierePermisoJornada, traducirError } from "./shared";
import { permisoJornada, type ResultadoJornada } from "../types/jornada.types";

export async function crearProgramacionSemanal(
  input: ProgramacionSemanalInput
): Promise<ResultadoJornada> {
  await requireUser();

  if (!(await requierePermisoJornada(permisoJornada("crear")))) {
    return { ok: false, error: "No tienes permiso para crear programación." };
  }

  const parsed = programacionSemanalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  const { operadores, semana_inicio, turno_id, centro_servicio_id } =
    parsed.data;

  if (operadores.length === 0) {
    return { ok: false, error: "No hay operadores activos para programar." };
  }

  // Las horas de la semana salen del turno elegido (única fuente de verdad);
  // se revalidan en servidor contra el catálogo de turnos.
  const { data: turno, error: turnoError } = await supabase
    .from("turnos")
    .select("hora_inicio, hora_fin")
    .eq("id", turno_id)
    .maybeSingle();

  if (turnoError || !turno?.hora_inicio || !turno?.hora_fin) {
    return {
      ok: false,
      error: "El turno seleccionado no existe o fue desactivado.",
    };
  }

  const hora_inicio = turno.hora_inicio;
  const hora_fin = turno.hora_fin;

  // Generar las 7 fechas de la semana (lunes a domingo)
  const fechas: string[] = [];
  const inicio = new Date(semana_inicio);
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    fechas.push(d.toISOString().split("T")[0]);
  }

  // Crear programación para cada operador × día
  const registros = [];
  for (const operadorId of operadores) {
    for (const fecha of fechas) {
      registros.push({
        operador_id: operadorId,
        fecha,
        hora_inicio_programada: hora_inicio,
        hora_fin_programada: hora_fin,
        turno_id,
        centro_servicio_id: emptyToNull(centro_servicio_id),
        creado_por: userId,
      });
    }
  }

  const { error } = await supabase
    .from("jornada_programacion")
    .upsert(registros, {
      onConflict: "operador_id,fecha",
      ignoreDuplicates: false,
    });

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  return { ok: true };
}
