import { z } from "zod";

export const respuestaSchema = z
  .object({
    inspeccion_id: z.string().uuid(),
    pregunta_id: z.string().uuid(),
    respuesta: z.enum(["bueno", "malo", "no_aplica"]),
    justificacion: z
      .string()
      .max(600, "La justificación no puede superar los 600 caracteres.")
      .optional(),
    foto_path: z.string().max(255).optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.respuesta === "malo" &&
      (!val.justificacion || !val.justificacion.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["justificacion"],
        message: "Al marcar Malo la justificación es obligatoria.",
      });
    }
  });

export type RespuestaFormValues = z.infer<typeof respuestaSchema>;