import { z } from "zod";

export const configuracionSchema = z.object({
  tiempo_minimo_segundos: z.coerce
    .number({ message: "El tiempo debe ser un número." })
    .int("El tiempo debe ser un entero.")
    .min(10, "El tiempo mínimo no puede ser menor a 10 segundos."),
});

export type ConfiguracionFormValues = z.infer<typeof configuracionSchema>;