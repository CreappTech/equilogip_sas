import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPermisos } from "@/lib/auth/permisos";
import { tipoAUbicacion } from "../types/activo.types";
import type { ResultadoActivo, TipoActivo } from "../types/activo.types";

export async function autorizar(codigo: string): Promise<boolean> {
  const permisos = await getPermisos();
  return permisos.includes("*") || permisos.includes(codigo);
}

export function emptyToNull(value?: string | null): string | null {
  const limpio = value?.trim();
  return limpio ? limpio : null;
}

export function traducirError(error: PostgrestError): string {
  if (error.code === "23505") {
    if (error.message.includes("codigo_interno")) {
      return "Ya existe un activo con ese código interno.";
    }
    if (error.message.includes("placa")) {
      return "Ya existe un vehículo con esa placa.";
    }
    return "Ya existe un registro con esos datos únicos.";
  }
  if (error.code === "23503") {
    if (error.message.includes("centro_servicio")) {
      return "La sede seleccionada no es válida.";
    }
    if (error.message.includes("proveedor")) {
      return "El proveedor seleccionado no es válido.";
    }
    return "Registro referenciado no encontrado.";
  }
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  if (
    error.code === "P0001" &&
    error.message.toLowerCase().includes("subtipo")
  ) {
    return "El tipo de equipo no corresponde a la categoría seleccionada.";
  }
  return error.message;
}

/** Nombre de referencia derivado de marca + modelo (columna `nombre` nullable). */
export function derivarNombre(
  marca?: string | null,
  modelo?: string | null
): string | null {
  const nombre = [marca?.trim(), modelo?.trim()].filter(Boolean).join(" ");
  return nombre || null;
}

interface DatosBase {
  codigo_interno: string;
  nombre: string | null;
  estado: string;
  fecha_adquisicion: string | null;
  subtipo: string;
  estado_operativo: string;
  color: string | null;
  numero_motor: string | null;
  lectura_inicial: number | null;
  serie: string | null;
  origen: string;
  centro_servicio_id: string;
  proveedor_id: string | null;
  datos_tecnicos: Record<string, unknown> | undefined;
  datos_fabricante: Record<string, unknown> | undefined;
}

/**
 * Inserta la fila base en `activos` y la especialidad (vehiculos/maquinas/
 * equipos) en la misma operación. Como RLS bloquea el DELETE del actor, si la
 * especialidad falla se compensa con el cliente admin (service role) borrando
 * únicamente la fila base recién creada.
 */
export async function crearActivoEspecialidad(
  tipo: TipoActivo,
  base: DatosBase,
  especialidad: Record<string, unknown>
): Promise<ResultadoActivo> {
  const supabase = await createClient();

  const { data: nuevo, error: errorBase } = await supabase
    .from("activos")
    .insert({ ...base, tipo })
    .select("id")
    .single();

  if (errorBase || !nuevo) {
    return {
      ok: false,
      error: errorBase ? traducirError(errorBase) : "No se pudo crear el activo.",
    };
  }

  const tabla = tipoAUbicacion(tipo);

  const { error: errorEspecialidad } = await supabase
    .from(tabla)
    .insert({ activo_id: nuevo.id, ...especialidad });

  if (errorEspecialidad) {
    try {
      const admin = createAdminClient();
      await admin.from("activos").delete().eq("id", nuevo.id);
    } catch {
      // La compensación es un salvaguarda; el error original es el que importa.
    }
    return { ok: false, error: traducirError(errorEspecialidad) };
  }

  revalidatePath("/activos");
  return { ok: true };
}

/**
 * Actualiza la fila base y la especialidad. Valida que el activo exista, no
 * esté retirado y que su `tipo` coincida con la especialidad que se edita
 * (la RLS `activos_update_datos` impide fijar `retirado` desde aquí).
 */
export async function actualizarActivoEspecialidad(
  tipo: TipoActivo,
  id: string,
  base: DatosBase,
  especialidad: Record<string, unknown>
): Promise<ResultadoActivo> {
  const supabase = await createClient();

  const { data: actual, error: errorLee } = await supabase
    .from("activos")
    .select("id, estado, tipo")
    .eq("id", id)
    .single();

  if (errorLee || !actual) {
    return { ok: false, error: "No se encontró el activo." };
  }

  if (actual.estado === "retirado") {
    return { ok: false, error: "No se puede editar un activo retirado." };
  }

  if (actual.tipo !== tipo) {
    return { ok: false, error: "El tipo del activo no coincide con la operación." };
  }

  const { error: errorBase } = await supabase
    .from("activos")
    .update({
      codigo_interno: base.codigo_interno,
      nombre: base.nombre,
      estado: base.estado,
      subtipo: base.subtipo,
      estado_operativo: base.estado_operativo,
      fecha_adquisicion: base.fecha_adquisicion,
      color: base.color,
      numero_motor: base.numero_motor,
      lectura_inicial: base.lectura_inicial,
      serie: base.serie,
      origen: base.origen,
      centro_servicio_id: base.centro_servicio_id,
      proveedor_id: base.proveedor_id,
      datos_tecnicos: base.datos_tecnicos ?? {},
      datos_fabricante: base.datos_fabricante ?? {},
    })
    .eq("id", id);

  if (errorBase) {
    return { ok: false, error: traducirError(errorBase) };
  }

  const tabla = tipoAUbicacion(tipo);

  const { error: errorEspecialidad } = await supabase
    .from(tabla)
    .update(especialidad)
    .eq("activo_id", id);

  if (errorEspecialidad) {
    return { ok: false, error: traducirError(errorEspecialidad) };
  }

  revalidatePath("/activos");
  return { ok: true };
}