"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import {
  configuracionJornadaSchema,
  type ConfiguracionJornadaInput,
} from "../schemas/jornadaSchema";
import { requierePermisoJornada, traducirError } from "./shared";
import { permisoJornada, type ResultadoJornada } from "../types/jornada.types";

export async function editarConfiguracionJornada(
  input: ConfiguracionJornadaInput
): Promise<ResultadoJornada> {
  await requireUser();

  if (!(await requierePermisoJornada(permisoJornada("configurar")))) {
    return {
      ok: false,
      error: "No tienes permiso para editar la configuración de jornada.",
    };
  }

  const parsed = configuracionJornadaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();

  const { data: config, error: fetchError } = await supabase
    .from("configuracion_jornada")
    .select("id")
    .single();

  if (fetchError || !config) {
    return {
      ok: false,
      error: "No se encontró la configuración de jornada.",
    };
  }

  const { error } = await supabase
    .from("configuracion_jornada")
    .update({
      hora_inicio_nocturna: parsed.data.hora_inicio_nocturna,
      hora_fin_nocturna: parsed.data.hora_fin_nocturna,
      horas_jornada_ordinaria: parsed.data.horas_jornada_ordinaria,
    })
    .eq("id", config.id);

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/jornada/configuracion");
  return { ok: true };
}
