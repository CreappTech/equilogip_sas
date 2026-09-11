import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/uuid";

export const retirarActivoSchema = z.object({
  id: uuidSchema("Activo inválido."),
});

export type RetirarActivoInput = z.infer<typeof retirarActivoSchema>;