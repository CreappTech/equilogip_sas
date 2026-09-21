import { createClient } from "@/lib/supabase/server";
import type { EntregaDetalle, EntregaDetalleLinea, TipoEntrega } from "../types/dotacion.types";

const CAMPOS_SELECCION = [
  "id",
  "empleado_id",
  "fecha_entrega",
  "tipo_entrega",
  "entregado_por",
  "observaciones",
  "evidencia_paths",
  "firma_path",
  "estado",
  "created_at",
  "updated_at",
] as const;

interface EntregaRowFila {
  id: string;
  empleado_id: string;
  fecha_entrega: string;
  tipo_entrega: TipoEntrega;
  entregado_por: string;
  observaciones: string | null;
  evidencia_paths: string[];
  firma_path: string;
  estado: "entregada" | "anulada";
  created_at: string;
  updated_at: string;
  empleados?: { nombres: string; apellidos: string; documento_identidad: string }[] | null;
}

/**
 * Detalle de una entrega: cabecera + empleado + líneas de la entrega.
 */
export async function getEntregaDetalle(id: string): Promise<EntregaDetalle | null> {
  const supabase = await createClient();

  const { data: entrega, error } = await supabase
    .from("entregas_dotacion")
    .select(
      `${CAMPOS_SELECCION.join(",")}, empleados(nombres, apellidos, documento_identidad)`
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !entrega) return null;

  const fila = entrega as unknown as EntregaRowFila;

  const { data: lineas, error: errorLineas } = await supabase
    .from("entregas_dotacion_detalle")
    .select("id, descripcion, cantidad, talla")
    .eq("entrega_id", id)
    .order("created_at", { ascending: true });

  if (errorLineas) return null;

  const { empleados, ...resto } = fila;

  const empleado_nombre = empleados
    ? `${empleados[0]?.nombres ?? ""} ${empleados[0]?.apellidos ?? ""}`.trim()
    : "";

  return {
    entrega: {
      ...resto,
      evidencia_paths: resto.evidencia_paths ?? [],
    },
    empleado_nombre: empleado_nombre || "—",
    empleado_documento: empleados?.[0]?.documento_identidad ?? "—",
    lineas: (lineas ?? []) as EntregaDetalleLinea[],
  };
}