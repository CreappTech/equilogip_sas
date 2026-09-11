"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { CATALOGOS, type CatalogoConfig } from "../catalogo.config";
import { CATALOGO_ESQUEMAS, type CatalogoInput } from "../schemas/catalogos";
import {
  catalogoPermiso,
  type AccionCatalogo,
  type RecursoCatalogo,
} from "../types/catalogos";

export type ResultadoCatalogo =
  | { ok: true }
  | { ok: false; error: string };

async function autorizar(
  recurso: RecursoCatalogo,
  accion: AccionCatalogo
): Promise<boolean> {
  const permisos = await getPermisos();
  return (
    permisos.includes("*") || permisos.includes(catalogoPermiso(recurso, accion))
  );
}

function traducirErrorCatalogo(
  error: PostgrestError,
  config: CatalogoConfig
): string {
  if (error.code === "23505") {
    if (config.recurso === "subtipos_activos") {
      return "Ya existe un tipo de equipo con ese código en la categoría.";
    }
    return "Ya existe un registro con esos datos únicos.";
  }
  if (error.code === "23503") {
    return "Registro referenciado no encontrado.";
  }
  if (error.code === "42501") {
    return "No tienes permiso para realizar esta operación.";
  }
  if (error.code === "P0001") {
    return error.message;
  }
  return error.message;
}

/**
 * Tenant del usuario autenticado (1:1 entre profiles y tenants). Se usa para
 * sembrar tenant_id en los catálogos tenant-scoped; las RLS validan luego que
 * la fila pertenezca al tenant real del actor.
 */
async function tenantDeUsuario(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();
  return data?.tenant_id ?? null;
}

/**
 * Espejo server del guard de normalización del cliente: reemplaza
 * `undefined`/`null` por los mismos defaults que el formulario, para que la
 * revalidación de Zod nunca devuelva el mensaje crudo "Invalid input: expected
 * string, received undefined" sino los mensajes de dominio del schema
 * (AGENTS.md §17). No debilita la validación: un string vacío sigue exigido.
 */
function normalizarInput<TRecurso extends RecursoCatalogo>(
  input: CatalogoInput<TRecurso>,
  config: CatalogoConfig
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(input as object) };
  for (const campo of config.campos) {
    const valor = out[campo.name];
    if (valor === undefined || valor === null) {
      if (campo.kind === "number") out[campo.name] = 0;
      else if (campo.kind === "switch") out[campo.name] = true;
      else out[campo.name] = "";
    }
  }
  return out;
}

async function prepararFila<TRecurso extends RecursoCatalogo>(
  recurso: TRecurso,
  userId: string,
  input: CatalogoInput<TRecurso>
): Promise<
  | { ok: true; fila: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const config = CATALOGOS[recurso];
  const schema = CATALOGO_ESQUEMAS[recurso];
  const parsed = schema.safeParse(normalizarInput(input, config));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const fila: Record<string, unknown> = { ...(parsed.data as object) };

  if (config.tenant) {
    const tenantId = await tenantDeUsuario(userId);
    if (!tenantId) {
      return {
        ok: false,
        error: "No se pudo identificar la compañía del usuario.",
      };
    }
    fila.tenant_id = tenantId;
  }

  return { ok: true, fila };
}

export async function crearCatalogo<TRecurso extends RecursoCatalogo>(
  recurso: TRecurso,
  input: CatalogoInput<TRecurso>
): Promise<ResultadoCatalogo> {
  const user = await requireUser();
  if (!(await autorizar(recurso, "crear"))) {
    return {
      ok: false,
      error: "No tienes permiso para crear este catálogo.",
    };
  }

  const config = CATALOGOS[recurso];
  const preparada = await prepararFila(recurso, user.id, input);
  if (!preparada.ok) return preparada;

  const supabase = await createClient();
  const { error } = await supabase.from(config.tabla).insert(preparada.fila);

  if (error) {
    return { ok: false, error: traducirErrorCatalogo(error, config) };
  }

  revalidatePath("/catalogos");
  revalidatePath(`/catalogos/${recurso}`);
  return { ok: true };
}

export async function actualizarCatalogo<TRecurso extends RecursoCatalogo>(
  recurso: TRecurso,
  id: string,
  input: CatalogoInput<TRecurso>
): Promise<ResultadoCatalogo> {
  const user = await requireUser();
  if (!(await autorizar(recurso, "editar"))) {
    return {
      ok: false,
      error: "No tienes permiso para editar este catálogo.",
    };
  }

  const config = CATALOGOS[recurso];
  const preparada = await prepararFila(recurso, user.id, input);
  if (!preparada.ok) return preparada;

  const supabase = await createClient();
  const { data: actual } = await supabase
    .from(config.tabla)
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!actual) {
    return { ok: false, error: "El registro no existe." };
  }

  const { error } = await supabase
    .from(config.tabla)
    .update(preparada.fila)
    .eq("id", id);

  if (error) {
    return { ok: false, error: traducirErrorCatalogo(error, config) };
  }

  revalidatePath("/catalogos");
  revalidatePath(`/catalogos/${recurso}`);
  return { ok: true };
}

/**
 * "Eliminar" es un borrado lógico: pone `activo = false`. La fila permanece
 * para no romper referencias (activos que la usan, históricos, etc.).
 */
export async function eliminarCatalogo<TRecurso extends RecursoCatalogo>(
  recurso: TRecurso,
  id: string
): Promise<ResultadoCatalogo> {
  await requireUser();
  if (!(await autorizar(recurso, "eliminar"))) {
    return {
      ok: false,
      error: "No tienes permiso para eliminar este catálogo.",
    };
  }

  const config = CATALOGOS[recurso];

  const supabase = await createClient();
  const { error } = await supabase
    .from(config.tabla)
    .update({ activo: false })
    .eq("id", id);

  if (error) {
    return { ok: false, error: traducirErrorCatalogo(error, config) };
  }

  revalidatePath("/catalogos");
  revalidatePath(`/catalogos/${recurso}`);
  return { ok: true };
}