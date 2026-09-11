import { z } from "zod";

const uuidRequerido = (mensaje: string) => z.string().uuid(mensaje);

/**
 * Schema del formulario de planeación del servicio (spec §6.2, simplificado).
 * Solo cuatro campos: Actividad (tipo_actividad_id), Equipo (activo_id),
 * Operador (operador_id) y Cliente (cliente_id, obligatorio).
 * `centro_servicio_id` no se pide en el formulario: la server action lo
 * deriva del centro/sede del activo seleccionado (NOT NULL en la BD).
 */
export const actividadFormSchema = z.object({
  activo_id: uuidRequerido("El equipo es obligatorio."),
  operador_id: uuidRequerido("El operador es obligatorio."),
  tipo_actividad_id: uuidRequerido("La actividad es obligatoria."),
  cliente_id: uuidRequerido("El cliente es obligatorio."),
});

export type ActividadFormValues = z.infer<typeof actividadFormSchema>;