import { createClient } from "@/lib/supabase/server";
import type { RrhhOpcion, TurnoOpcion } from "../types/empleado.types";

type CatalogoRrhhKey = "eps" | "arl" | "fondos_pension" | "bancos";

const TABLE_MAP: Record<CatalogoRrhhKey, string> = {
  eps: "eps",
  arl: "arl",
  fondos_pension: "fondos_pension",
  bancos: "bancos",
};

async function listCatalogoRrhh(tabla: string): Promise<RrhhOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(tabla)
    .select("id, nombre, activo, orden")
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RrhhOpcion[];
}

/**
 * Catálogos de RRHH para el formulario de empleados. La RLS de cada tabla
 * limita por tenant (select tenant-scoped).
 */
export async function listAllCatalogosRrhh(): Promise<
  Record<CatalogoRrhhKey, RrhhOpcion[]>
> {
  const [eps, arl, fondosPension, bancos] = await Promise.all([
    listCatalogoRrhh(TABLE_MAP.eps),
    listCatalogoRrhh(TABLE_MAP.arl),
    listCatalogoRrhh(TABLE_MAP.fondos_pension),
    listCatalogoRrhh(TABLE_MAP.bancos),
  ]);

  return { eps, arl, fondos_pension: fondosPension, bancos };
}

/**
 * Turnos activos/inactivos para el formulario de empleados (select "Turno
 * habitual"). La RLS de `turnos` limita por tenant.
 */
export async function listTurnos(): Promise<TurnoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("turnos")
    .select("id, nombre, activo, orden, hora_inicio, hora_fin")
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as TurnoOpcion[];
}
