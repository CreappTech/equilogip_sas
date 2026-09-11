import { z } from "zod";

export const retirarActivoSchema = z.object({
  id: z.string().uuid("Activo inválido."),
});

export type RetirarActivoInput = z.infer<typeof retirarActivoSchema>;