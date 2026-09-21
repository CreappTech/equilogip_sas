"use server";

import { revalidatePath } from "next/cache";

import type { PostgrestError } from "@supabase/supabase-js";

import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { dotacionSchema, type DotacionInput } from "../schemas/dotacionSchema";
import { emptyToNull, requierePermisoDotacion, traducirError } from "./shared";
import { permisoDotacion } from "../types/dotacion.types";
import type { ResultadoDotacion } from "../types/dotacion.types";

const BUCKET = "dotacion-evidencias";

/**
 * Registra una entrega de dotación. La cabecera + las líneas se escriben en
 * UNA transacción vía el RPC `registrar_entrega_dotacion` (valida permiso,
 * firma y al menos un elemento). Los archivos (evidencia + firma) ya están
 * subidos al bucket por el cliente; si el RPC falla, se limpian en
 * best-effort para no dejar huérfanos.
 */
export async function createEntrega(input: DotacionInput): Promise<ResultadoDotacion> {
  await requireUser();

  if (!(await requierePermisoDotacion(permisoDotacion("crear")))) {
    return {
      ok: false,
      error: "No tienes permiso para registrar entregas de dotación.",
    };
  }

  const parsed = dotacionSchema.safeParse(input);
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

  const { data: entregaId, error } = await supabase.rpc("registrar_entrega_dotacion", {
    p_empleado_id: data.empleado_id,
    p_fecha_entrega: data.fecha_entrega,
    p_tipo_entrega: data.tipo_entrega,
    p_entregado_por: data.entregado_por,
    p_observaciones: emptyToNull(data.observaciones),
    p_evidencia_paths: data.evidencia_paths,
    p_firma_path: data.firma_path,
    p_lineas: lineasJson,
  });

  if (error || !entregaId) {
    const paths = [...data.evidencia_paths, data.firma_path].filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
    const errorPostgrest: PostgrestError =
      error ??
      ({
        code: "P0001",
        message: "No se pudo registrar la entrega.",
        details: "",
        hint: "",
      } as unknown as PostgrestError);
    return { ok: false, error: traducirError(errorPostgrest) };
  }

  revalidatePath("/dotacion");
  return { ok: true };
}