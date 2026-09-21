import { z } from "zod";

export const preguntaSchema = z.object({
  categoria_id: z.string().uuid("La categoría es obligatoria."),
  tipo_activo: z.enum(["vehiculo", "maquina", "ambos"], {
    message: "Selecciona el tipo de equipo.",
  }),
  texto: z
    .string()
    .min(3, "La pregunta debe tener al menos 3 caracteres.")
    .max(300, "La pregunta no puede superar los 300 caracteres."),
  orden: z.coerce
    .number({ message: "El orden debe ser un número." })
    .int("El orden debe ser un entero.")
    .min(0, "El orden no puede ser negativo."),
  activo: z.boolean().default(true),
});

export type PreguntaFormValues = z.infer<typeof preguntaSchema>;