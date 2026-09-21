"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { configuracionSchema, type ConfiguracionFormValues } from "../schemas/configuracionSchema";
import type { ResultadoMantenimiento } from "../types/mantenimiento.types";
import { autorizar, traducirError } from "./shared";

export async function actualizarConfiguracion(
  input: ConfiguracionFormValues
): Promise<ResultadoMantenimiento> {
  const user = await autorizar("mantenimiento.configuracion.editar");
  if (!user) {
    return { ok: false, error: "No tienes permiso para editar la configuración." };
  }

  const parsed = configuracionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("mantenimiento_configuracion")
    .update({
      tiempo_minimo_segundos: parsed.data.tiempo_minimo_segundos,
      updated_by: user.id,
    })
    .eq("id", "00000000-0000-4000-8000-000000000001");

  if (error) return { ok: false, error: traducirError(error) };

  revalidatePath("/mantenimiento");
  revalidatePath("/mantenimiento/configuracion");
  return { ok: true };
}