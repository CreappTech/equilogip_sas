import { z } from "zod";
import { activoBaseSchema, anioSchema } from "./activoBaseSchema";

export const maquinaSchema = activoBaseSchema
  .extend({
    tipo: z.literal("maquina"),
    subtipo: z.string().trim().min(1, "El tipo de equipo es obligatorio."),
    marca: z.string().trim().min(1, "La marca es obligatoria."),
    modelo: z.string().trim().min(1, "El modelo es obligatorio."),
    anio: anioSchema,
  })
  .superRefine((values, ctx) => {
    if (values.origen === "SUBARRENDADA" && !values.proveedor_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes indicar el proveedor de subarriendo.",
        path: ["proveedor_id"],
      });
    }
  });

export type MaquinaInput = z.infer<typeof maquinaSchema>;