export type TipoActivo = "vehiculo" | "maquina" | "equipo";

export type EstadoActivo = "activo" | "inactivo" | "retirado";

/** Tipos de equipo del módulo Flota (equilogip), preservados por compatibilidad. */
export type SubtipoActivo =
  | "MOTOCICLETA"
  | "AUTOMOVIL"
  | "MONTACARGAS"
  | "CARGADOR_FRONTAL"
  | "RETROEXCAVADORA"
  | "YALE_MANUAL";

/**
 * Estado operativo (independiente del ciclo de vida `estado`).
 * ALQUILADA no se ofrece en el formulario; solo se asigna por flujo de alquiler.
 */
export type EstadoOperativoActivo =
  | "OPERATIVA"
  | "EN_MANTENIMIENTO"
  | "FUERA_DE_SERVICIO"
  | "ALQUILADA";

export type OrigenActivo = "PROPIA" | "SUBARRENDADA";

export type ResultadoActivo =
  | { ok: true }
  | { ok: false; error: string };

export interface ActivoRow {
  id: string;
  tipo: TipoActivo;
  codigo_interno: string;
  nombre: string | null;
  estado: EstadoActivo;
  subtipo: SubtipoActivo;
  estado_operativo: EstadoOperativoActivo;
  fecha_adquisicion: string | null;
  color: string | null;
  numero_motor: string | null;
  lectura_inicial: number | null;
  serie: string | null;
  origen: OrigenActivo;
  centro_servicio_id: string | null;
  proveedor_id: string | null;
  datos_tecnicos: Record<string, string | string[]>;
  datos_fabricante: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/** Fila de listado: incluye marca/modelo (join a la especialidad) para el nombre de referencia. */
export interface ListadoActivo extends ActivoRow {
  marca: string | null;
  modelo: string | null;
}

export interface VehiculoRow {
  activo_id: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
}

export interface MaquinaRow {
  activo_id: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
}

export interface EquipoRow {
  activo_id: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
}

export interface ActivoDetalle {
  activo: ActivoRow;
  vehiculo?: VehiculoRow;
  maquina?: MaquinaRow;
  equipo?: EquipoRow;
  centro_servicio_nombre?: string | null;
  proveedor_nombre?: string | null;
}

export interface ProveedorSubarriendo {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  activo: boolean;
}

export interface CentroServicio {
  id: string;
  nombre: string;
  activo: boolean;
}

/** Opción de subtipo proveniente del catálogo activos_subtipos (BD). */
export interface SubtipoActivoOpcion {
  id: string;
  categoria: TipoActivo;
  codigo: string;
  nombre: string;
}

/** Opción de catálogo técnico (estados, estado operativo, origen) desde BD. */
export interface CatalogoOpcion {
  codigo: string;
  nombre: string;
}

export const TIPO_ACTIVO_LABELS: Record<TipoActivo, string> = {
  vehiculo: "Vehículo",
  maquina: "Maquinaria",
  equipo: "Equipo",
};

export const ESTADO_ACTIVO_LABELS: Record<EstadoActivo, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  retirado: "Retirado",
};

export const SUBTIPO_ACTIVO_LABELS: Record<SubtipoActivo, string> = {
  MOTOCICLETA: "Motocicleta",
  AUTOMOVIL: "Automóvil",
  MONTACARGAS: "Montacargas",
  CARGADOR_FRONTAL: "Cargador frontal",
  RETROEXCAVADORA: "Retroexcavadora",
  YALE_MANUAL: "Yale manual",
};

export const ESTADO_OPERATIVO_ACTIVO_LABELS: Record<EstadoOperativoActivo, string> = {
  OPERATIVA: "Operativa",
  EN_MANTENIMIENTO: "En mantenimiento",
  FUERA_DE_SERVICIO: "Fuera de servicio",
  ALQUILADA: "Alquilada",
};

export const ORIGEN_ACTIVO_LABELS: Record<OrigenActivo, string> = {
  PROPIA: "Propia",
  SUBARRENDADA: "Subarrendada",
};

/** Mapa de subtipos disponibles por categoría (equiparable a la fuente equilogip). */
export const SUBTIPOS_POR_CATEGORIA: Record<TipoActivo, readonly SubtipoActivo[]> = {
  vehiculo: ["MOTOCICLETA", "AUTOMOVIL"],
  maquina: ["MONTACARGAS", "CARGADOR_FRONTAL", "RETROEXCAVADORA"],
  equipo: ["YALE_MANUAL"],
};

/** Categoría a la que pertenece un subtipo. */
export function categoriaDeSubtipo(subtipo: SubtipoActivo): TipoActivo {
  if (subtipo === "MOTOCICLETA" || subtipo === "AUTOMOVIL") return "vehiculo";
  if (subtipo === "YALE_MANUAL") return "equipo";
  return "maquina";
}

/** Referencia legible: nombre, o `marca modelo` cuando el nombre se deriva. */
export function nombreActivo(activo: {
  nombre?: string | null;
  marca?: string | null;
  modelo?: string | null;
}): string {
  if (activo.nombre) return activo.nombre;
  const derivado = [activo.marca, activo.modelo].filter(Boolean).join(" ");
  return derivado || "Sin referencia";
}

/**
 * Etiqueta legible de un subtipo. Usa el mapa estático como fallback para los
 * códigos conocidos del catálogo sembrado; para códigos nuevos (que crecen en
 * el maestro de datos sin tocar código) devuelve el propio código.
 */
export function nombreSubtipo(
  subtipo: string | null | undefined
): string {
  if (!subtipo) return "—";
  return SUBTIPO_ACTIVO_LABELS[subtipo as SubtipoActivo] ?? subtipo;
}

export function tipoARecurso(tipo: TipoActivo): string {
  if (tipo === "vehiculo") return "vehiculos";
  if (tipo === "maquina") return "maquinas";
  return "equipos";
}

export function tipoAUbicacion(tipo: TipoActivo): string {
  if (tipo === "vehiculo") return "vehiculos";
  if (tipo === "maquina") return "maquinas";
  return "equipos";
}

/** Permiso de acción para un activo, ej: ('vehiculo','crear') -> 'activos.vehiculos.crear' */
export function permisoActivo(tipo: TipoActivo, accion: "ver" | "crear" | "editar" | "eliminar"): string {
  return `activos.${tipoARecurso(tipo)}.${accion}`;
}