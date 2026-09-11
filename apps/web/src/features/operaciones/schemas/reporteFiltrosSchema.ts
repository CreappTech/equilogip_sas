import { z } from "zod";

/**
 * Filtros de reportes/actas. Las fechas y selects van vacíos ("") cuando no
 * se aplican; la validación de orden de fechas impide consultas invertidas.
 */
export const reporteFiltrosSchema = z
  .object({
    fecha_desde: z.string().trim(),
    fecha_hasta: z.string().trim(),
    activo_id: z.string().trim(),
    centro_servicio_id: z.string().trim(),
  })
  .refine(
    (d) => {
      if (!d.fecha_desde || !d.fecha_hasta) return true;
      return d.fecha_desde <= d.fecha_hasta;
    },
    {
      message: "La fecha inicial no puede ser posterior a la final.",
      path: ["fecha_hasta"],
    }
  );

export type ReporteFiltrosValues = z.infer<typeof reporteFiltrosSchema>;