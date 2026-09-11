export type RecursoCatalogo =
  | "cargos"
  | "areas"
  | "tipos_contrato"
  | "turnos"
  | "subtipos_activos"
  | "centros_servicio"
  | "proveedores"
  | "marcas"
  | "modelos"
  | "unidades_medida"
  | "tipos_documento_identidad"
  | "tipos_mantenimiento"
  | "tipos_repuesto_servicio"
  | "grupos_actividad"
  | "tipos_actividad"
  | "categorias_ingreso"
  | "categorias_gasto"
  | "clientes"
  | "conceptos_liquidacion"
  | "tipos_hora"
  | "eps"
  | "arl"
  | "fondos_pension"
  | "bancos";

export type AccionCatalogo = "ver" | "crear" | "editar" | "eliminar";

/** Permiso de acción para un catálogo, ej: ('cargos','crear') -> 'catalogos.cargos.crear' */
export function catalogoPermiso(
  recurso: RecursoCatalogo,
  accion: AccionCatalogo
): string {
  return `catalogos.${recurso}.${accion}`;
}

/**
 * Filas de los catálogos tenant-scoped (cargos, areas, tipos_contrato, turnos).
 */
export interface CatalogoTenantRow {
  id: string;
  tenant_id: string;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export type CargoRow = CatalogoTenantRow;
export type AreaRow = CatalogoTenantRow;
export type TipoContratoRow = CatalogoTenantRow;

/**
 * Turno: catálogo tenant con rango horario. Si `hora_fin < hora_inicio`, el
 * turno cruza la medianoche (nocturno). En BD ambas columnas son `time`.
 */
export interface TurnoRow extends CatalogoTenantRow {
  hora_inicio: string;
  hora_fin: string;
}

/** Tipo de hora: catálogo tenant con el % de recargo que lo identifica. */
export interface TipoHoraRow extends CatalogoTenantRow {
  porcentaje_recargo: number;
}

/** Actividad (tipo de actividad): catálogo tenant con la tarifa por hora o servicio. */
export interface TipoActividadRow extends CatalogoTenantRow {
  tarifa: number;
  /** Código CIIU (4 dígitos) de la actividad según el RUT. */
  codigo_ciiu: string | null;
  /** Agrupador interno de la empresa al que pertenece la actividad. */
  grupo_actividad_id: string | null;
}

/** Grupo de actividad (agrupador interno de la empresa). */
export type GrupoActividadRow = CatalogoTenantRow;

/**
 * Subtipo de activo (técnico, sin tenant). El catálogo alimenta el formulario
 * de flota; `categoria` + `codigo` son únicos y el trigger de activos valida
 * contra esta tabla.
 */
export interface ActivoSubtipoRow {
  id: string;
  categoria: "vehiculo" | "maquina" | "equipo";
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Centros de trabajo: reutiliza la tabla centros_servicio (1 fila por tenant). */
export interface CentroTrabajoRow {
  id: string;
  tenant_id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
}

/** Proveedores (global, sin tenant). Catálogo compartido entre módulos. */
export interface ProveedorMaestroRow {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  created_at: string;
}

/**
 * Catálogo técnico global con nombre + orden (marcas).
 * Se usa además como base de `modelos`.
 */
export interface CatalogoTecnicoRow {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}
export type MarcaRow = CatalogoTecnicoRow;

/** Modelo de equipo: referencia `marcas.id` (FK). */
export interface ModeloRow extends CatalogoTecnicoRow {
  marca_id: string;
}

/**
 * Catálogo técnico global con código + nombre (unidades de medida, tipos de
 * documento de identidad). El código se guarda en mayúsculas.
 */
export interface CatalogoCodigoRow {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}
export type UnidadMedidaRow = CatalogoCodigoRow;
export type TipoDocumentoIdentidadRow = CatalogoCodigoRow;

/** Cliente: catálogo de negocio tenant-scoped con datos de contacto. */
export interface ClienteRow extends CatalogoTenantRow {
  telefono: string | null;
  email: string | null;
  direccion: string | null;
}

/**
 * Fila genérica de catálogo para el CRUD del maestro de datos.
 * Las columnas se leen por nombre desde el config (ver catalogo.config.ts).
 */
export type CatalogoRow = { id: string } & Record<string, unknown>;