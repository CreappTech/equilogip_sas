"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { entregaIdSchema } from "../schemas/dotacionSchema";
import { requierePermisoDotacion, traducirError } from "./shared";
import { permisoDotacion } from "../types/dotacion.types";
import type { ResultadoDotacion } from "../types/dotacion.types";

/**
 * Anulación de una entrega = cambio de estado a 'anulada' (nunca DELETE).
 * Es terminal y no editable (lo garantiza RLS); la evidencia y la firma se
 * conservan para auditoría aunque la entrega se anule.
 */
export async function anularEntrega(input: { id: string }): Promise<ResultadoDotacion> {
  await requireUser();

  const parsed = entregaIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Entrega inválida." };
  }
  const { id } = parsed.data;

  const supabase = await createClient();

  const { data: entrega } = await supabase
    .from("entregas_dotacion")
    .select("id, estado")
    .eq("id", id)
    .maybeSingle();

  if (!entrega) {
    return { ok: false, error: "No se encontró la entrega." };
  }

  if (entrega.estado === "anulada") {
    return { ok: false, error: "La entrega ya está anulada." };
  }

  if (!(await requierePermisoDotacion(permisoDotacion("eliminar")))) {
    return { ok: false, error: "No tienes permiso para anular entregas." };
  }

  const { error } = await supabase
    .from("entregas_dotacion")
    .update({ estado: "anulada" })
    .eq("id", id);

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  revalidatePath("/dotacion");
  revalidatePath(`/dotacion/${id}`);
  return { ok: true };
}