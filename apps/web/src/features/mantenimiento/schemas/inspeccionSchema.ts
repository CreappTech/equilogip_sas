import { z } from "zod";

/** Encabezado de la inspección. `lectura_unidad` se deriva en servidor según el tipo del activo. */
export const inspeccionSchema = z.object({
  activo_id: z.string().uuid("Selecciona un equipo."),
  lectura: z.coerce
    .number({ message: "La lectura es obligatoria." })
    .int("La lectura debe ser un entero.")
    .min(0, "La lectura no puede ser negativa."),
  nivel_combustible: z.enum(["VACIO", "1/4", "1/2", "3/4", "LLENO"], {
    message: "Selecciona el nivel de combustible.",
  }),
  nivel_aceite: z.enum(["MIN", "MEDIO", "MAX"], {
    message: "Selecciona el nivel de aceite.",
  }),
});

export type InspeccionFormValues = z.infer<typeof inspeccionSchema>;