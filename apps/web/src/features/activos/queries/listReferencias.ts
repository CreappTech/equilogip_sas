import { createClient } from "@/lib/supabase/server";
import type {
  CatalogoOpcion,
  CentroServicio,
  ProveedorSubarriendo,
  SubtipoActivoOpcion,
} from "../types/activo.types";

/**
 * Sedes disponibles para el formulario de flota. La RLS de centros_servicio
 * ya limita al tenant del usuario autenticado y a las sedes asignadas.
 */
export async function listCentrosServicio(): Promise<CentroServicio[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("centros_servicio")
    .select("id, nombre, activo")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as CentroServicio[];
}

/** Proveedores de subarriendo activos. */
export async function listProveedores(): Promise<ProveedorSubarriendo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre, telefono, email, activo")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ProveedorSubarriendo[];
}

/**
 * Subtipos de activo activos del catálogo (maestro de datos). Alimentan el
 * select "Tipo de equipo" del formulario de flota filtrado por categoría.
 */
export async function listActivoSubtipos(): Promise<SubtipoActivoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activos_subtipos")
    .select("id, categoria, codigo, nombre")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as SubtipoActivoOpcion[];
}

/** Estados del ciclo de vida de un activo (catálogo de solo lectura). */
export async function listActivoEstados(): Promise<CatalogoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activo_estados")
    .select("codigo, nombre")
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as CatalogoOpcion[];
}

/** Estados operativos de un activo (catálogo de solo lectura). */
export async function listActivoEstadosOperativos(): Promise<CatalogoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activo_estados_operativos")
    .select("codigo, nombre")
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as CatalogoOpcion[];
}

/** Orígenes de un activo (catálogo de solo lectura). */
export async function listActivoOrigenes(): Promise<CatalogoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activo_origenes")
    .select("codigo, nombre")
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as CatalogoOpcion[];
}