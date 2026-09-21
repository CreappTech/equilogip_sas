"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas/uuid";
import {
  dotacionEditarSchema,
  type DotacionEditarInput,
} from "../schemas/dotacionSchema";
import { emptyToNull, requierePermisoDotacion, traducirError } from "./shared";
import { permisoDotacion } from "../types/dotacion.types";
import type { ResultadoDotacion } from "../types/dotacion.types";

/**
 * Actualiza cabecera y líneas de una entrega vía el RPC
 * `actualizar_entrega_dotacion` (transaccional). La evidencia y la firma
 * quedan intactas: la edición nunca las toca (auditoría). El RPC impide
 * editar una entrega anulada.
 */
export async function updateEntrega(
  input: DotacionEditarInput & { id: string }
): Promise<ResultadoDotacion> {
  await requireUser();

  if (!(await requierePermisoDotacion(permisoDotacion("editar")))) {
    return {
      ok: false,
      error: "No tienes permiso para editar entregas de dotación.",
    };
  }

  const idParsed = uuidSchema("Entrega inválida.").safeParse(input.id);
  if (!idParsed.success) {
    return { ok: false, error: "Entrega inválida." };
  }

  const parsed = dotacionEditarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const lineasJson = data.lineas.map((linea) => ({
    descripcion: linea.descripcion,
    cantidad: linea.cantidad,
    talla: emptyToNull(linea.talla),
  }));

  const { error } = await supabase.rpc("actualizar_entrega_dotacion", {
    p_entrega_id: input.id,
    p_empleado_id: data.empleado_id,
    p_fecha_entrega: data.fecha_entrega,
    p_tipo_entrega: data.tipo_entrega,
    p_entregado_por: data.entregado_por,
    p_observaciones: emptyToNull(data.observaciones),
    p_lineas: lineasJson,
  });

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  revalidatePath("/dotacion");
  revalidatePath(`/dotacion/${input.id}`);
  return { ok: true };
}