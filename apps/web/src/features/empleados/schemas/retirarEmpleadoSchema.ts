import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/uuid";

export const retirarEmpleadoSchema = z.object({
  id: uuidSchema("Empleado inválido."),
});

export type RetirarEmpleadoInput = z.infer<typeof retirarEmpleadoSchema>;