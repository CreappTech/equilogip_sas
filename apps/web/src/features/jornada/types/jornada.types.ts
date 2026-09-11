export type EstadoMarcacion = "pendiente" | "en_curso" | "completa";

export type TipoNovedad =
  | "incapacidad"
  | "permiso"
  | "vacaciones"
  | "ausencia_injustificada"
  | "otro";

export type ResultadoJornada =
  | { ok: true }
  | { ok: false; error: string };

export interface ProgramacionRow {
  id: string;
  operador_id: string;
  fecha: string;
  hora_inicio_programada: string;
  hora_fin_programada: string;
  turno_id: string | null;
  centro_servicio_id: string | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListadoProgramacion extends ProgramacionRow {
  operador_nombre?: string | null;
  turno_nombre?: string | null;
  centro_servicio_nombre?: string | null;
}

export interface MarcacionRow {
  id: string;
  programacion_id: string;
  hora_inicio_real: string | null;
  hora_fin_real: string | null;
  registrado_por_inicio: string | null;
  registrado_por_fin: string | null;
  estado: EstadoMarcacion;
  created_at: string;
  updated_at: string;
}

export interface ListadoAsistencia extends MarcacionRow {
  operador_id: string;
  operador_nombre?: string | null;
  fecha: string;
  hora_inicio_programada: string;
  hora_fin_programada: string;
}

export interface NovedadRow {
  id: string;
  operador_id: string;
  fecha: string;
  tipo_novedad: TipoNovedad;
  observaciones: string | null;
  registrado_por: string | null;
  created_at: string;
}

export interface CorreccionRow {
  id: string;
  marcacion_id: string;
  campo_corregido: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  motivo: string;
  corregido_por: string | null;
  fecha_correccion: string;
}

export interface AutorizacionExtraRow {
  id: string;
  marcacion_id: string;
  autorizado_por: string | null;
  motivo: string;
  fecha_autorizacion: string;
}

export interface ResumenNominaFila {
  operador_id: string;
  operador_nombre: string;
  semana_inicio: string;
  semana_fin: string;
  horas_ordinarias: number;
  recargo_nocturno_ordinaria: number;
  hora_extra_diurna: number;
  hora_extra_nocturna: number;
  hora_dominical_festiva_ordinaria: number;
  hora_nocturna_dominical_festiva: number;
  hora_extra_diurna_dominical_festiva: number;
  hora_extra_nocturna_dominical_festiva: number;
}

export interface ConfiguracionJornada {
  id: string;
  tenant_id: string;
  hora_inicio_nocturna: string;
  hora_fin_nocturna: string;
  horas_jornada_ordinaria: number;
}

export interface EmpleadoOpcion {
  id: string;
  nombres: string;
  apellidos: string;
  /** Turno habitual del operador (nombre), para mostrarlo al programar. */
  turno_txt?: string | null;
}

/** Turno del catálogo de turnos, para la creación semanal de la planeación. */
export interface TurnoOpcion {
  id: string;
  nombre: string;
  activo: boolean;
  hora_inicio: string;
  hora_fin: string;
}

export const ESTADO_MARCACION_LABELS: Record<EstadoMarcacion, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completa: "Completada",
};

export const TIPO_NOVEDAD_LABELS: Record<TipoNovedad, string> = {
  incapacidad: "Incapacidad",
  permiso: "Permiso",
  vacaciones: "Vacaciones",
  ausencia_injustificada: "Ausencia injustificada",
  otro: "Otro",
};

export function nombreEmpleado(empleado: {
  nombres: string;
  apellidos: string;
}): string {
  return `${empleado.nombres} ${empleado.apellidos}`.trim();
}

export function permisoJornada(
  accion:
    | "ver"
    | "crear"
    | "editar"
    | "marcar"
    | "corregir"
    | "exportar"
    | "configurar"
): string {
  const map: Record<string, string> = {
    ver: "jornada.planeacion.ver",
    crear: "jornada.planeacion.crear",
    editar: "jornada.planeacion.editar",
    marcar: "jornada.asistencia.marcar",
    corregir: "jornada.asistencia.corregir",
    exportar: "jornada.nomina.exportar",
    configurar: "jornada.configuracion.editar",
  };
  return map[accion] ?? "jornada.planeacion.ver";
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${suffix}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
