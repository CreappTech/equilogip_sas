import type { OpcionRespuesta } from "../types/mantenimiento.types";

/**
 * Persistencia local del contexto de la inspección en curso: la posición de la
 * pregunta actual y las respuestas respondidas se guardan en el navegador para
 * que un cierre accidental o una recarga no pierdan el avance. La fuente de
 * verdad es la base de datos (autoguardado vía acciones); esto es solo contexto
 * de sesión del navegador.
 */
export interface RespuestaLocal {
  respuesta: OpcionRespuesta;
  justificacion: string;
  foto_path: string;
}

export interface BorradorLocal {
  inspeccion_id: string;
  activo_id: string;
  activo_nombre: string;
  pregunta_actual: number;
  total_preguntas: number;
  respuestas: Record<string, RespuestaLocal>;
  actualizado_en: string;
}

const PREFIX = "equilogip.mantenimiento.borrador.v1.";

function claveUsuario(userId: string): string {
  return `${PREFIX}${userId}`;
}

export function guardarBorrador(userId: string, borrador: BorradorLocal): void {
  try {
    localStorage.setItem(
      claveUsuario(userId),
      JSON.stringify({ ...borrador, actualizado_en: new Date().toISOString() })
    );
  } catch {
    // Almacenamiento lleno o inválido: el autoguardado remoto sigue funcionando.
  }
}

export function leerBorrador(userId: string): BorradorLocal | null {
  try {
    const raw = localStorage.getItem(claveUsuario(userId));
    if (!raw) return null;
    return JSON.parse(raw) as BorradorLocal;
  } catch {
    return null;
  }
}

export function limpiarBorrador(userId: string): void {
  try {
    localStorage.removeItem(claveUsuario(userId));
  } catch {
    // ignorar
  }
}