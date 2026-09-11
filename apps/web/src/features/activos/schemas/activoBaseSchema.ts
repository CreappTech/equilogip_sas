import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/uuid";

export const estadoActivoSchema = z.enum(["activo", "inactivo"]);

export const estadoOperativoActivoSchema = z.enum([
  "OPERATIVA",
  "EN_MANTENIMIENTO",
  "FUERA_DE_SERVICIO",
  "ALQUILADA",
]);

export const origenActivoSchema = z.enum(["PROPIA", "SUBARRENDADA"]);

export const subtipoActivoSchema = z.enum([
  "MOTOCICLETA",
  "AUTOMOVIL",
  "MONTACARGAS",
  "CARGADOR_FRONTAL",
  "RETROEXCAVADORA",
  "YALE_MANUAL",
]);

export const anioSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z
    .coerce.number()
    .int("El año debe ser un número entero.")
    .min(1900, "Año inválido (mínimo 1900).")
    .max(2100, "Año inválido (máximo 2100).")
    .nullable()
    .optional()
);

export const lecturaInicialSchema = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z
    .coerce.number()
    .min(0, "El horómetro/kilometraje no puede ser negativo.")
    .nullable()
    .optional()
);

export const textoOpcionalSchema = z.string().trim().optional();

/**
 * Base del formulario de flota. `nombre` no se exige (se deriva de
 * marca+modelo en las actions). `centro_servicio_id` es obligatorio y
 * `proveedor_id` solo es obligatorio cuando `origen = SUBARRENDADA`
 * (se valida en cada schema por tipo con superRefine).
 */
export const activoBaseSchema = z.object({
  codigo_interno: z.string().trim().min(1, "El código interno es obligatorio."),
  estado: estadoActivoSchema.default("activo"),
  subtipo: subtipoActivoSchema,
  estado_operativo: estadoOperativoActivoSchema.default("OPERATIVA"),
  fecha_adquisicion: z.string().nullable().optional(),
  color: textoOpcionalSchema,
  numero_motor: textoOpcionalSchema,
  lectura_inicial: lecturaInicialSchema,
  serie: textoOpcionalSchema,
  origen: origenActivoSchema.default("PROPIA"),
  centro_servicio_id: z.string().min(1, "La sede es obligatoria."),
  proveedor_id: z
    .preprocess((value) => (value === "" ? null : value), uuidSchema("Proveedor inválido.").nullish()),
  datos_tecnicos: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .optional(),
  datos_fabricante: z.record(z.string(), z.string()).optional(),
});

export type ActivoBaseInput = z.infer<typeof activoBaseSchema>;