import type {
  SubtipoActivo,
  TipoActivo,
} from "@/features/activos/types/activo.types";

/** Filtro de preguntas/rutinas: un tipo concreto o "ambos". */
export type TipoActivoAplica = Extract<TipoActivo, "vehiculo" | "maquina"> | "ambos";

/** Unidad de la lectura registrada en la inspección (según el tipo de equipo). */
export type UnidadLectura = "kilometraje" | "horometro";

export type NivelCombustible = "VACIO" | "1/4" | "1/2" | "3/4" | "LLENO";

export type NivelAceite = "MIN" | "MEDIO" | "MAX";

export type EstadoInspeccion = "borrador" | "completada";

export type OpcionRespuesta = "bueno" | "malo" | "no_aplica";

export interface CategoriaMantenimiento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PreguntaMantenimiento {
  id: string;
  categoria_id: string;
  categoria_nombre?: string | null;
  categoria_codigo?: string | null;
  tipo_activo: TipoActivoAplica;
  texto: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RutinaMantenimiento {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo_activo: TipoActivoAplica;
  subtipo: SubtipoActivo | null;
  unidad: UnidadLectura;
  umbral: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Puntaje acumulado de una categoría (radar). */
export interface PuntajeCategoria {
  bueno: number;
  malo: number;
  no_aplica: number;
  aplica: number;
  puntaje: number;
  porcentaje: number | null;
}

/** Mapa {codigo_categoria -> puntaje} almacenado en la inspección al finalizar. */
export type Puntajes = Record<string, PuntajeCategoria>;

export interface ConfiguracionMantenimiento {
  id: string;
  tiempo_minimo_segundos: number;
  updated_at: string;
}

/** Opción de equipo para iniciar una inspección (solo operativos). */
export interface ActivoOperativoOpcion {
  id: string;
  codigo_interno: string;
  nombre: string;
  tipo: TipoActivo;
  subtipo: SubtipoActivo;
  lectura_unidad: UnidadLectura;
}

export interface RespuestaInspeccion {
  id: string;
  inspeccion_id: string;
  pregunta_id: string;
  respuesta: OpcionRespuesta;
  justificacion: string | null;
  foto_path: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Fila de listado del dashboard (nombres resueltos). */
export interface InspeccionFila {
  id: string;
  activo_id: string;
  operador_id: string;
  lectura: number;
  lectura_unidad: UnidadLectura;
  nivel_combustible: NivelCombustible;
  nivel_aceite: NivelAceite;
  estado: EstadoInspeccion;
  iniciada_en: string;
  finalizada_en: string | null;
  tiempo_segundos: number | null;
  es_express: boolean;
  puntajes: Puntajes;
  activo_codigo: string | null;
  activo_nombre: string | null;
  operador_nombre: string | null;
  rutinas_activadas: string[];
}

/** Borrador completo para reanudar el flujo paso a paso. */
export interface DetalleInspeccion extends InspeccionFila {
  respuesta_por_pregunta: Record<string, RespuestaInspeccion>;
}

/** Agregación de salud por categoría (radar global o por equipo). */
export interface SaludCategoria {
  categoria_codigo: string;
  categoria_nombre: string;
  bueno: number;
  malo: number;
  no_aplica: number;
  aplica: number;
  puntaje: number;
  porcentaje: number | null;
}

export const TIPO_ACTIVO_APLICA_LABELS: Record<TipoActivoAplica, string> = {
  vehiculo: "Vehículo",
  maquina: "Maquinaria",
  ambos: "Ambos",
};

export const UNIDAD_LECTURA_LABELS: Record<UnidadLectura, string> = {
  kilometraje: "Kilometraje (km)",
  horometro: "Horómetro (h)",
};

export const NIVEL_COMBUSTIBLE_OPTIONS: NivelCombustible[] = [
  "VACIO",
  "1/4",
  "1/2",
  "3/4",
  "LLENO",
];

export const NIVEL_ACEITE_OPTIONS: NivelAceite[] = ["MIN", "MEDIO", "MAX"];

export const RESPUESTA_OPTIONS: OpcionRespuesta[] = ["bueno", "malo", "no_aplica"];

export const ESTADO_INSPECCION_LABELS: Record<EstadoInspeccion, string> = {
  borrador: "Borrador",
  completada: "Completada",
};

export const RESPUESTA_LABELS: Record<OpcionRespuesta, string> = {
  bueno: "Bueno",
  malo: "Malo",
  no_aplica: "No aplica",
};

export type ResultadoMantenimiento =
  | { ok: true }
  | { ok: false; error: string };

export type CrearInspeccionResultado =
  | { ok: true; extra: { inspeccionId: string } }
  | { ok: false; error: string };

export type FinalizarInspeccionResultado =
  | { ok: true; extra: { es_express: boolean; tiempo_segundos: number } }
  | { ok: false; error: string };