"use server";

import { requireUser } from "@/lib/auth/permisos";
import { retirarActivoSchema } from "../schemas/retirarActivoSchema";
import { autorizar, traducirError } from "./shared";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { permisoActivo, tipoARecurso } from "../types/activo.types";
import type { ResultadoActivo, TipoActivo } from "../types/activo.types";

/**
 * Retiro de activo = cambio de estado a 'retirado' (nunca DELETE).
 * Solo puede ejecutarlo quien tenga activos.<tipo>.eliminar; un activo
 * retirado no puede volver a editarse (lo garantiza RLS).
 */
export async function retirarActivo(input: {
  id: string;
}): Promise<ResultadoActivo> {
  await requireUser();

  const parsed = retirarActivoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Activo inválido." };
  }
  const { id } = parsed.data;

  const supabase = await createClient();

  const { data: activo } = await supabase
    .from("activos")
    .select("id, tipo, estado, nombre")
    .eq("id", id)
    .single();

  if (!activo) {
    return { ok: false, error: "No se encontró el activo." };
  }

  if (activo.estado === "retirado") {
    return { ok: false, error: "El activo ya está retirado." };
  }

  const tipo = activo.tipo as TipoActivo;
  if (!(await autorizar(permisoActivo(tipo, "eliminar")))) {
    return {
      ok: false,
      error: `No tienes permiso para retirar ${tipoARecurso(tipo)}.`,
    };
  }

  const { error } = await supabase
    .from("activos")
    .update({ estado: "retirado" })
    .eq("id", id);

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  revalidatePath("/activos");
  return { ok: true };
}