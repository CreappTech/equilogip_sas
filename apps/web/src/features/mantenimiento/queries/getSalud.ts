import { createClient } from "@/lib/supabase/server";
import { listCategorias } from "./listCategorias";
import type { SaludCategoria } from "../types/mantenimiento.types";

interface FilaSaludRaw {
  inspeccion_id: string;
  activo_id: string;
  categoria_codigo: string;
  categoria_nombre: string;
  bueno: number;
  malo: number;
  no_aplica: number;
  aplica: number;
  puntaje: number;
  porcentaje: number | null;
}

/**
 * Salud por categoría (ejes del radar) calculada sobre las inspecciones
 * COMPLETADAS. Si se pasa `activoId`, se filtra a un equipo; si no, agrega
 * todas. Devuelve siempre las categorías activas (con ceros si no hay datos).
 */
export async function getSalud(
  activoId?: string
): Promise<SaludCategoria[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vw_mantenimiento_salud")
    .select("*");

  if (error) throw new Error(error.message);

  const filas = (data ?? []) as unknown as FilaSaludRaw[];

  // Solo inspecciones finalizadas aportan al radar.
  const inspeccionIds = [...new Set(filas.map((f) => f.inspeccion_id))];
  let completadas = new Set<string>();
  if (inspeccionIds.length > 0) {
    const { data: c } = await supabase
      .from("mantenimiento_inspecciones")
      .select("id")
      .in("id", inspeccionIds)
      .eq("estado", "completada");
    completadas = new Set((c ?? []).map((r) => r.id as string));
  }

  const filtradas = filas.filter(
    (f) =>
      completadas.has(f.inspeccion_id) &&
      (!activoId || f.activo_id === activoId)
  );

  const categorias = await listCategorias();

  const acumulado: Record<
    string,
    Record<"bueno" | "malo" | "no_aplica" | "aplica" | "puntaje", number>
  > = {};
  for (const c of categorias) {
    acumulado[c.codigo] = { bueno: 0, malo: 0, no_aplica: 0, aplica: 0, puntaje: 0 };
  }

  for (const f of filtradas) {
    const acc = acumulado[f.categoria_codigo];
    if (!acc) continue;
    acc.bueno += f.bueno;
    acc.malo += f.malo;
    acc.no_aplica += f.no_aplica;
    acc.aplica += f.aplica;
    acc.puntaje += f.puntaje;
  }

  const salud: SaludCategoria[] = categorias
    .filter((c) => c.activo)
    .map((c) => {
      const acc = acumulado[c.codigo] ?? {
        bueno: 0,
        malo: 0,
        no_aplica: 0,
        aplica: 0,
        puntaje: 0,
      };
      const porcentaje =
        acc.aplica > 0
          ? Math.round((Math.max(0, acc.puntaje) / acc.aplica) * 100)
          : null;
      return {
        categoria_codigo: c.codigo,
        categoria_nombre: c.nombre,
        bueno: acc.bueno,
        malo: acc.malo,
        no_aplica: acc.no_aplica,
        aplica: acc.aplica,
        puntaje: acc.puntaje,
        porcentaje,
      };
    });

  return salud;
}