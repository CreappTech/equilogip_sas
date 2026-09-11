import { z } from "zod";

/**
 * Datos mínimos para generar un acta: cliente + equipo dentro de un periodo
 * de fechas (vacaciones/semana de prestación).
 */
export const actaGeneracionSchema = z
  .object({
    cliente_id: z.string().uuid("Selecciona un cliente válido."),
    equipo_id: z.string().uuid("Selecciona un equipo válido."),
    fecha_desde: z.string().min(1, "La fecha inicial es obligatoria."),
    fecha_hasta: z.string().min(1, "La fecha final es obligatoria."),
  })
  .refine((d) => !d.fecha_desde || !d.fecha_hasta || d.fecha_desde <= d.fecha_hasta, {
    message: "La fecha inicial no puede ser posterior a la final.",
    path: ["fecha_hasta"],
  });

export type ActaGeneracionValues = z.infer<typeof actaGeneracionSchema>;