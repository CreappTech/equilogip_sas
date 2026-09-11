import { z } from "zod";
import { activoBaseSchema, anioSchema } from "./activoBaseSchema";

export const vehiculoSchema = activoBaseSchema
  .extend({
    tipo: z.literal("vehiculo"),
    subtipo: z.string().trim().min(1, "El tipo de equipo es obligatorio."),
    placa: z.string().trim().min(1, "La placa es obligatoria."),
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

export type VehiculoInput = z.infer<typeof vehiculoSchema>;