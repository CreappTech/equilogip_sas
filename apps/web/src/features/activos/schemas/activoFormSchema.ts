import { z } from "zod";
import { estadoActivoSchema } from "./activoBaseSchema";

/**
 * Schema del formulario de activos (cliente). Mismo conjunto base para los
 * tres tipos; la estructura es "laxa" (subtipo como texto, marca/modelo
 * requeridos) y el servidor revalida con los schemas estrictos por tipo
 * (vehiculoSchema/maquinaSchema/equipoSchema), que además restringen el
 * subtipo a la categoría. `nombre` no se pide en el formulario: se deriva de
 * marca + modelo en las actions.
 * La ficha técnica y la información del fabricante no forman parte de este
 * schema (se gestionan con estado y se adjuntan al payload antes de enviar).
 */
const texto = (mensaje: string) =>
  z.preprocess((value) => value ?? "", z.string().trim().min(1, mensaje));

const textoOpcional = z.preprocess(
  (value) => (value === null || value === undefined ? "" : value),
  z.string().trim().optional()
);

const anio = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z
    .coerce.number()
    .int("El año debe ser un número entero.")
    .min(1900, "Año inválido (mínimo 1900).")
    .max(2100, "Año inválido (máximo 2100).")
    .nullable()
    .optional()
);

const lecturaInicial = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.coerce
    .number()
    .min(0, "El horómetro/kilometraje no puede ser negativo.")
    .nullable()
    .optional()
);

export const activoFormSchema = z
  .object({
    tipo: z.enum(["vehiculo", "maquina", "equipo"]),
    codigo_interno: texto("El código interno es obligatorio."),
    estado: estadoActivoSchema.default("activo"),
    subtipo: texto("El tipo de equipo es obligatorio."),
    estado_operativo: z
      .enum(["OPERATIVA", "EN_MANTENIMIENTO", "FUERA_DE_SERVICIO"])
      .default("OPERATIVA"),
    fecha_adquisicion: z.string().nullable().optional(),
    placa: textoOpcional,
    marca: texto("La marca es obligatoria."),
    modelo: texto("El modelo es obligatorio."),
    serie: textoOpcional,
    numero_motor: textoOpcional,
    color: textoOpcional,
    lectura_inicial: lecturaInicial,
    origen: z.enum(["PROPIA", "SUBARRENDADA"]).default("PROPIA"),
    centro_servicio_id: texto("La sede es obligatoria."),
    proveedor_id: z
      .preprocess(
        (value) => (value === "" ? null : value),
        z.string().trim().nullish()
      ),
    anio: anio,
  })
  .superRefine((values, ctx) => {
    if (values.tipo === "vehiculo" && !values.placa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La placa es obligatoria.",
        path: ["placa"],
      });
    }
    if (values.origen === "SUBARRENDADA" && !values.proveedor_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Debes indicar el proveedor de subarriendo.",
        path: ["proveedor_id"],
      });
    }
  });

export type ActivoFormValues = z.infer<typeof activoFormSchema>;