export type TipoEntrega = "inicial" | "renovacion" | "reposicion";

export type EstadoEntrega = "entregada" | "anulada";

export type ResultadoDotacion =
  | { ok: true }
  | { ok: false; error: string };

export interface EntregaDotacionRow {
  id: string;
  empleado_id: string;
  fecha_entrega: string;
  tipo_entrega: TipoEntrega;
  entregado_por: string;
  observaciones: string | null;
  evidencia_paths: string[];
  firma_path: string;
  estado: EstadoEntrega;
  created_at: string;
  updated_at: string;
}

/** Fila de listado: incluye el nombre y documento del empleado (join). */
export interface ListadoEntrega extends EntregaDotacionRow {
  empleado_nombre?: string | null;
  empleado_documento?: string | null;
}

export interface EntregaDetalleLinea {
  id: string;
  descripcion: string;
  cantidad: number;
  talla: string | null;
}

export interface EntregaDetalle {
  entrega: EntregaDotacionRow;
  lineas: EntregaDetalleLinea[];
  empleado_nombre: string;
  empleado_documento: string;
}

/** Empleado activo para el selector del formulario. */
export interface EmpleadoDotacionOpcion {
  id: string;
  nombres: string;
  apellidos: string;
  documento_identidad: string;
  cargo_nombre?: string | null;
}

export const TIPO_ENTREGA_LABELS: Record<TipoEntrega, string> = {
  inicial: "Dotación inicial",
  renovacion: "Renovación",
  reposicion: "Reposición",
};

export const ESTADO_ENTREGA_LABELS: Record<EstadoEntrega, string> = {
  entregada: "Entregada",
  anulada: "Anulada",
};

export function permisoDotacion(
  accion: "ver" | "crear" | "editar" | "eliminar"
): string {
  return `dotacion.entregas.${accion}`;
}