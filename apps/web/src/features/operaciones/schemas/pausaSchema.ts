import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/uuid";

/**
 * Schema del modal de pausa (spec §7). Causal y observaciones obligatorias
 * (la BD ya lo garantiza con constraints condicionales en operacion_eventos).
 */
export const pausaSchema = z.object({
  causal_id: uuidSchema("La causal es obligatoria."),
  observaciones: z
    .string()
    .trim()
    .min(1, "Las observaciones son obligatorias."),
});

export type PausaFormValues = z.infer<typeof pausaSchema>;