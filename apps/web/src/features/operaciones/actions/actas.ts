"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { obtenerDatosActa } from "../queries/actas";
import { empresaConfigSchema, type EmpresaConfigValues } from "../schemas/empresaConfigSchema";
import { actaGeneracionSchema, type ActaGeneracionValues } from "../schemas/actaGeneracionSchema";
import type { ResultadoOperaciones } from "../types/operaciones.types";

const PERMISO_ACTAS = "operaciones.actas.generar";

export type ResultadoGenerarActa =
  | { ok: true; numero: string }
  | { ok: false; error: string };

function traducirError(error: PostgrestError): string {
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  if (error.code === "23505") {
    return "Ya existe un acta con ese número. Intenta nuevamente.";
  }
  if (error.code === "23514") {
    return "El rango de fechas del acta no es válido.";
  }
  if (error.code === "23503") {
    return "El cliente o el equipo seleccionado no es válido.";
  }
  return error.message;
}

/** Guarda o actualiza los datos de configuración de la empresa. */
export async function guardarEmpresaConfig(
  input: EmpresaConfigValues
): Promise<ResultadoOperaciones> {
  await requireUser();
  const permisos = await getPermisos();
  if (!permisos.includes("*") && !permisos.includes(PERMISO_ACTAS)) {
    return {
      ok: false,
      error: "No tienes permiso para editar la configuración de la empresa.",
    };
  }

  const parsed = empresaConfigSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();

  const valores = { ...parsed.data, updated_at: new Date().toISOString() };

  const existente = await supabase
    .from("empresa_config")
    .select("id")
    .eq("id", 1)
    .maybeSingle();

  if (existente.error) {
    return { ok: false, error: traducirError(existente.error) };
  }

  const resultado = existente.data
    ? await supabase.from("empresa_config").update(valores).eq("id", 1)
    : await supabase.from("empresa_config").insert(valores);

  if (resultado.error) {
    return { ok: false, error: traducirError(resultado.error) };
  }

  revalidatePath("/operaciones/actas");
  return { ok: true };
}

/** Genera y persiste un acta (snapshot congelado, spec 7.6). */
export async function generarActa(
  input: ActaGeneracionValues
): Promise<ResultadoGenerarActa> {
  const user = await requireUser();
  const permisos = await getPermisos();
  if (!permisos.includes("*") && !permisos.includes(PERMISO_ACTAS)) {
    return {
      ok: false,
      error: "No tienes permiso para generar actas de prestación de servicios.",
    };
  }

  const parsed = actaGeneracionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const datos = await obtenerDatosActa(
    parsed.data.cliente_id,
    parsed.data.equipo_id,
    parsed.data.fecha_desde,
    parsed.data.fecha_hasta
  );

  if (
    !datos.empresa.razon_social ||
    !datos.empresa.nit
  ) {
    return {
      ok: false,
      error:
        "Completa los datos de la empresa (razón social y NIT) antes de generar el acta.",
    };
  }

  if (datos.total_actividades === 0) {
    return {
      ok: false,
      error:
        "No hay actividades registradas para el cliente y equipo en el periodo seleccionado.",
    };
  }

  const supabase = await createClient();

  const anio = new Date().getFullYear();
  const prefijo = `ACTA-${anio}-`;
  const { data: existentes, error: errorConteo } = await supabase
    .from("actas_servicio")
    .select("numero")
    .like("numero", `${prefijo}%`);

  if (errorConteo) {
    return { ok: false, error: traducirError(errorConteo) };
  }

  const siguiente = (existentes?.length ?? 0) + 1;
  const numero = `${prefijo}${String(siguiente).padStart(4, "0")}`;

  const snapshot = JSON.stringify({
    empresa: datos.empresa,
    cliente_nombre: datos.cliente_nombre,
    equipo: datos.equipo,
    periodo_inicio: datos.periodo_inicio,
    periodo_fin: datos.periodo_fin,
    total_actividades: datos.total_actividades,
    horas_trabajadas: datos.horas_trabajadas,
    total_novedades: datos.total_novedades,
    tabla_a: datos.tabla_a,
    tabla_b: datos.tabla_b,
  });

  const { error } = await supabase.from("actas_servicio").insert({
    numero,
    periodo_inicio: parsed.data.fecha_desde,
    periodo_fin: parsed.data.fecha_hasta,
    cliente_id: parsed.data.cliente_id,
    equipo_id: parsed.data.equipo_id,
    generado_por: user.id,
    snapshot,
  });

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  revalidatePath("/operaciones/actas");
  return { ok: true, numero };
}