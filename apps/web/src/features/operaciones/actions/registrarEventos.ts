"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import type {
  ResultadoOperaciones,
  TipoEvento,
} from "../types/operaciones.types";
import { pausaSchema, type PausaFormValues } from "../schemas/pausaSchema";

const PERMISO_POR_EVENTO: Record<TipoEvento, string> = {
  inicio: "operaciones.actividades.iniciar",
  pausa: "operaciones.actividades.pausar",
  reanudacion: "operaciones.actividades.reanudar",
  fin: "operaciones.actividades.finalizar",
};

const VERBO_POR_EVENTO: Record<TipoEvento, string> = {
  inicio: "iniciar",
  pausa: "pausar",
  reanudacion: "reanudar",
  fin: "finalizar",
};

const actividadIdSchema = z.string().uuid("La actividad no es válida.");

function traducirError(error: PostgrestError): string {
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  if (error.code === "P0002") {
    return "La actividad no existe.";
  }
  if (error.code === "P0001") {
    if (error.message.includes("Transición inválida")) {
      return "La actividad ya fue modificada. Recarga la página para ver su estado actual.";
    }
    if (error.message.includes("Tipo de evento")) {
      return "La operación solicitada no es válida.";
    }
    return "No se pudo actualizar la actividad.";
  }
  if (error.code === "23514") {
    return "Debes indicar la causal y las observaciones para pausar la actividad.";
  }
  if (error.code === "23503") {
    return "La causal seleccionada no es válida.";
  }
  return error.message;
}

/**
 * Núcleo compartido del cuadro de control. Registra el evento de bitácora y el
 * cambio de estado en UNA transacción vía el RPC `operaciones_registrar_evento`
 * (máquina de estados y autorización en la base, AGENTS §19).
 */
async function registrarEvento(
  actividadId: string,
  tipo: TipoEvento,
  pausa?: PausaFormValues
): Promise<ResultadoOperaciones> {
  await requireUser();
  const permisos = await getPermisos();

  const permiso = PERMISO_POR_EVENTO[tipo];
  if (!permisos.includes("*") && !permisos.includes(permiso)) {
    return {
      ok: false,
      error: `No tienes permiso para ${VERBO_POR_EVENTO[tipo]} actividades.`,
    };
  }

  if (!actividadIdSchema.safeParse(actividadId).success) {
    return { ok: false, error: "La actividad no es válida." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("operaciones_registrar_evento", {
    p_actividad_id: actividadId,
    p_tipo_evento: tipo,
    p_causal_id: pausa?.causal_id ?? null,
    p_observaciones: pausa?.observaciones ?? null,
  });

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  revalidatePath("/operaciones");
  return { ok: true };
}

export async function registrarInicio(actividadId: string) {
  return registrarEvento(actividadId, "inicio");
}

export async function registrarPausa(actividadId: string, input: PausaFormValues) {
  const parsed = pausaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  return registrarEvento(actividadId, "pausa", parsed.data);
}

export async function registrarReanudacion(actividadId: string) {
  return registrarEvento(actividadId, "reanudacion");
}

export async function registrarFin(actividadId: string) {
  return registrarEvento(actividadId, "fin");
}