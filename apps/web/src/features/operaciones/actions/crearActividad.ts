"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import {
  actividadFormSchema,
  type ActividadFormValues,
} from "../schemas/actividadFormSchema";
import type { CrearActividadResultado } from "../types/operaciones.types";

function traducirError(error: PostgrestError): string {
  if (error.code === "23505") {
    if (error.message.includes("activo_id")) {
      return "Este equipo ya tiene una actividad abierta. Debe finalizarla antes de crear otra.";
    }
    return "Ya existe un registro con esos datos únicos.";
  }
  if (error.code === "23503") {
    if (error.message.includes("activo")) {
      return "El equipo seleccionado no es válido.";
    }
    if (error.message.includes("operador")) {
      return "El operador seleccionado no es válido.";
    }
    if (error.message.includes("centro_servicio")) {
      return "El centro de servicio seleccionado no es válido.";
    }
    if (error.message.includes("tipo_actividad")) {
      return "El tipo de actividad seleccionado no es válido.";
    }
    if (error.message.includes("cliente")) {
      return "El cliente seleccionado no es válido.";
    }
    return "Registro referenciado no encontrado.";
  }
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  if (error.code === "23514") {
    return "Los datos no cumplen las reglas de la actividad.";
  }
  return error.message;
}

export async function crearActividad(
  input: ActividadFormValues
): Promise<CrearActividadResultado> {
  const user = await requireUser();
  const permisos = await getPermisos();
  if (!permisos.includes("*") && !permisos.includes("operaciones.actividades.crear")) {
    return { ok: false, error: "No tienes permiso para crear actividades." };
  }

  const parsed = actividadFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;

  const supabase = await createClient();

  /**
   * `centro_servicio_id` no se pide en el formulario: se deriva de la sede del
   * equipo (activos.centro_servicio_id). Se lee con el cliente admin para no
   * acoplar el permiso `activos.*` a quien planea servicios.
   */
  const admin = createAdminClient();
  const { data: activo, error: errorActivo } = await admin
    .from("activos")
    .select("centro_servicio_id")
    .eq("id", data.activo_id)
    .maybeSingle();

  if (errorActivo || !activo) {
    return { ok: false, error: "El equipo seleccionado no es válido." };
  }

  if (!activo.centro_servicio_id) {
    return { ok: false, error: "El equipo no tiene una sede asignada." };
  }

  const { data: insertada, error } = await supabase
    .from("operacion_actividades")
    .insert({
      activo_id: data.activo_id,
      operador_id: data.operador_id,
      centro_servicio_id: activo.centro_servicio_id,
      tipo_actividad_id: data.tipo_actividad_id,
      cliente_id: data.cliente_id,
      estado: "creada",
      creado_por: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  if (!insertada?.id) {
    return { ok: false, error: "No se pudo confirmar la actividad creada." };
  }

  revalidatePath("/operaciones");
  return { ok: true, extra: { actividadId: insertada.id } };
}