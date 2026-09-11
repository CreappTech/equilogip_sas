import { z } from "zod";

/**
 * Schema del modal de pausa (spec §7). Causal y observaciones obligatorias
 * (la BD ya lo garantiza con constraints condicionales en operacion_eventos).
 */
export const pausaSchema = z.object({
  causal_id: z.string().uuid("La causal es obligatoria."),
  observaciones: z
    .string()
    .trim()
    .min(1, "Las observaciones son obligatorias."),
});

export type PausaFormValues = z.infer<typeof pausaSchema>;