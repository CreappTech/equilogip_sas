import { z } from "zod";

export const retirarEmpleadoSchema = z.object({
  id: z.string().uuid("Empleado inválido."),
});

export type RetirarEmpleadoInput = z.infer<typeof retirarEmpleadoSchema>;