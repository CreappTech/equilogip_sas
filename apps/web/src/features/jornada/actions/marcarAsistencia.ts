"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { requierePermisoJornada, traducirError } from "./shared";
import { permisoJornada, type ResultadoJornada } from "../types/jornada.types";

export async function marcarLlegada(
  programacionId: string
): Promise<ResultadoJornada> {
  await requireUser();

  if (!(await requierePermisoJornada(permisoJornada("marcar")))) {
    return { ok: false, error: "No tienes permiso para marcar asistencia." };
  }

  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  // Verificar que no exista ya una marcación para esta programación
  const { data: existente } = await supabase
    .from("jornada_marcaciones")
    .select("id, estado")
    .eq("programacion_id", programacionId)
    .single();

  if (existente && existente.estado !== "pendiente") {
    return {
      ok: false,
      error: "Ya se registró la llegada para esta programación.",
    };
  }

  if (existente) {
    // Actualizar marcación existente (pendiente → en_curso)
    const { error } = await supabase
      .from("jornada_marcaciones")
      .update({
        hora_inicio_real: new Date().toISOString(),
        registrado_por_inicio: userId,
        estado: "en_curso",
      })
      .eq("id", existente.id);

    if (error) return { ok: false, error: traducirError(error) };
  } else {
    // Crear nueva marcación
    const { error } = await supabase.from("jornada_marcaciones").insert({
      programacion_id: programacionId,
      hora_inicio_real: new Date().toISOString(),
      registrado_por_inicio: userId,
      estado: "en_curso",
    });

    if (error) return { ok: false, error: traducirError(error) };
  }

  revalidatePath("/jornada/asistencia");
  return { ok: true };
}

export async function marcarSalida(
  marcacionId: string
): Promise<ResultadoJornada> {
  await requireUser();

  if (!(await requierePermisoJornada(permisoJornada("marcar")))) {
    return { ok: false, error: "No tienes permiso para marcar asistencia." };
  }

  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  const { error } = await supabase
    .from("jornada_marcaciones")
    .update({
      hora_fin_real: new Date().toISOString(),
      registrado_por_fin: userId,
      estado: "completa",
    })
    .eq("id", marcacionId)
    .eq("estado", "en_curso");

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/jornada/asistencia");
  return { ok: true };
}
