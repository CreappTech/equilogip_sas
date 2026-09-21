import { z } from "zod";
import type { SubtipoActivo } from "@/features/activos/types/activo.types";
import { SUBTIPOS_POR_CATEGORIA } from "@/features/activos/types/activo.types";

export const rutinaSchema = z
  .object({
    nombre: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres.")
      .max(120, "El nombre no puede superar los 120 caracteres."),
    descripcion: z
      .string()
      .max(300, "La descripción no puede superar los 300 caracteres.")
      .optional()
      .nullable(),
    tipo_activo: z.enum(["vehiculo", "maquina", "ambos"], {
      message: "Selecciona el tipo de equipo.",
    }),
    subtipo: z
      .string()
      .transform((v) => (v ? (v as SubtipoActivo) : null))
      .nullable()
      .optional(),
    unidad: z.enum(["kilometraje", "horometro"], {
      message: "Selecciona la unidad de la lectura.",
    }),
    umbral: z.coerce
      .number({ message: "El umbral debe ser un número." })
      .int("El umbral debe ser un entero.")
      .positive("El umbral debe ser mayor que cero."),
    activo: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if (
      val.tipo_activo !== "ambos" &&
      val.subtipo &&
      !SUBTIPOS_POR_CATEGORIA[val.tipo_activo].includes(val.subtipo as never)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subtipo"],
        message: "El subtipo no corresponde al tipo de equipo seleccionado.",
      });
    }
  });

export type RutinaFormValues = z.infer<typeof rutinaSchema>;