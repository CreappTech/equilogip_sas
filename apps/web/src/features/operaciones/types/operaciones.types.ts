export type EstadoActividad =
  | "creada"
  | "en_curso"
  | "pausada"
  | "finalizada";

export type TipoEvento =
  | "inicio"
  | "pausa"
  | "reanudacion"
  | "fin";

export type ResultadoOperaciones =
  | { ok: true }
  | { ok: false; error: string };

/** Resultado de `crearActividad`: devuelve el id de la actividad creada. */
export type CrearActividadResultado =
  | { ok: true; extra: { actividadId: string } }
  | { ok: false; error: string };

/** Fila de listado: incluye joins para mostrar nombres legibles. */
export interface ListadoActividad {
  id: string;
  activo_id: string;
  operador_id: string;
  centro_servicio_id: string;
  tipo_actividad_id: string;
  cliente_id: string | null;
  estado: EstadoActividad;
  fecha_creacion: string;
  activo_codigo: string | null;
  activo_nombre: string | null;
  activo_marca: string | null;
  activo_modelo: string | null;
  operador_nombres: string | null;
  operador_apellidos: string | null;
  centro_servicio_nombre: string | null;
  tipo_actividad_nombre: string | null;
  cliente_nombre: string | null;
  horas_trabajadas: number | null;
  horas_limitadas: number | null;
  total_novedades: number | null;
  inicio_hora: string | null;
  fin_hora: string | null;
}

/** Opción para el formulario de nueva actividad. */
export interface EmpleadoOpcion {
  id: string;
  nombres: string;
  apellidos: string;
}

export interface ActivoOpcion {
  id: string;
  codigo_interno: string;
  nombre: string | null;
  marca: string | null;
  modelo: string | null;
  estado_operativo: string | null;
}

export interface TipoActividadOpcion {
  id: string;
  nombre: string;
}

export interface ClienteOpcion {
  id: string;
  nombre: string;
}

export interface CausalPausaOpcion {
  id: string;
  nombre: string;
}

/** Evento de la bitácora de una actividad (inicio/pausa/reanudacion/fin). */
export interface EventoActividad {
  id: string;
  tipo_evento: TipoEvento;
  fecha_hora: string;
  causal_nombre: string | null;
  observaciones: string | null;
}

/** Detalle completo para el cuadro de control: datos de la actividad + bitácora. */
export interface DetalleActividad extends ListadoActividad {
  eventos: EventoActividad[];
}

export interface CatalogoOpcion {
  id: string;
  nombre: string;
}

/** Equipo para el filtro de reportes/actas (independiente del estado). */
export interface ActivoFiltroOpcion {
  id: string;
  codigo_interno: string;
  nombre: string | null;
}

/** Filtros comunes de reportes. Las fechas van vacías si no se filtra. */
export interface FiltrosReporte {
  fecha_desde: string;
  fecha_hasta: string;
  activo_id: string;
  centro_servicio_id: string;
}

/** Fila del reporte de horas: agregación por equipo dentro del periodo. */
export interface ReporteHorasFila {
  activo_id: string;
  activo_codigo: string;
  activo_nombre: string | null;
  centro_servicio_id: string;
  centro_servicio_nombre: string | null;
  cantidad_actividades: number;
  horas_trabajadas: number;
  horas_limitadas: number;
  total_novedades: number;
}

/** Fila del reporte de novedades: una pausa con su causal y duración. */
export interface ReporteNovedadFila {
  actividad_id: string;
  activo_codigo: string;
  activo_nombre: string | null;
  centro_servicio_nombre: string | null;
  fecha_pausa: string;
  causal_nombre: string | null;
  observaciones: string | null;
  horas_duracion: number | null;
}

export const ESTADO_ACTIVIDAD_LABELS: Record<EstadoActividad, string> = {
  creada: "Creada",
  en_curso: "En curso",
  pausada: "Pausada",
  finalizada: "Finalizada",
};

/** Datos de la empresa para el encabezado del acta (fila única). */
export interface EmpresaConfigDatos {
  razon_social: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  representante: string;
}

/** Equipo dentro del acta (con marca/modelo para el encabezado). */
export interface ActaEquipoDatos {
  id: string;
  codigo_interno: string;
  nombre: string | null;
  marca: string | null;
  modelo: string | null;
}

/** Fila de la Tabla A (detalle de actividades del periodo). */
export interface ActaTablaARow {
  fecha: string;
  inicio: string;
  fin: string | null;
  horas_trabajadas: number;
}

/** Fila de la Tabla B (novedades del periodo). */
export interface ActaTablaBRow {
  fecha: string;
  causal_nombre: string | null;
  observaciones: string | null;
  horas_duracion: number | null;
}

/** Datos calculados para una acta (o congelados en su snapshot). */
export interface DatosActa {
  empresa: EmpresaConfigDatos;
  cliente_nombre: string;
  equipo: ActaEquipoDatos;
  periodo_inicio: string;
  periodo_fin: string;
  total_actividades: number;
  horas_trabajadas: number;
  total_novedades: number;
  tabla_a: ActaTablaARow[];
  tabla_b: ActaTablaBRow[];
}

/** Fila del histórico de actas. */
export interface ActaResumen {
  id: string;
  numero: string;
  periodo_inicio: string;
  periodo_fin: string;
  fecha_generacion: string;
  cliente_nombre: string | null;
  equipo_codigo: string | null;
  equipo_nombre: string | null;
  generado_por_nombre: string | null;
}

/** Acta completa para el documento imprimible (incluye lo no computable). */
export interface ActaDocumento extends DatosActa {
  numero: string | null;
  fecha_generacion: string | null;
}
