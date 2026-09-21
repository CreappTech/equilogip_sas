import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/uuid";

const textoOpcional = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : value,
  z.string().trim().max(2000, "El texto no puede superar 2000 caracteres.").optional()
);

const tallaLinea = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : value,
  z.string().trim().max(10, "La talla no puede superar 10 caracteres.").optional()
);

const cantidadLinea = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z
    .number()
    .int("La cantidad debe ser un número entero.")
    .min(1, "La cantidad mínima es 1.")
    .max(999, "La cantidad no puede superar 999.")
);

export const lineaDotacionSchema = z.object({
  descripcion: z.string().trim().min(1, "La descripción es obligatoria."),
  cantidad: cantidadLinea,
  talla: tallaLinea,
});

export type LineaDotacionInput = z.infer<typeof lineaDotacionSchema>;

/**
 * Schema de registro de una entrega de dotación. `firma_path` (PNG) y
 * `evidencia_paths` (imágenes/PDF) son obligatorios en el registro: quedan
 * congelados para auditoría y no se modifican en la edición.
 * `fecha_entrega` y `entregado_por` son obligatorios; `observaciones` es
 * opcional. El RPC de la base valida que exista al menos una línea.
 */
export const dotacionSchema = z.object({
  empleado_id: z.string().min(1, "El empleado es obligatorio."),
  fecha_entrega: z.string().min(1, "La fecha de entrega es obligatoria."),
  tipo_entrega: z.enum(["inicial", "renovacion", "reposicion"]).default("inicial"),
  entregado_por: z.string().trim().min(1, "Indica quién entrega la dotación."),
  observaciones: textoOpcional,
  evidencia_paths: z.array(z.string()),
  firma_path: z.string().min(1, "La firma del receptor es obligatoria."),
  lineas: z.array(lineaDotacionSchema).min(1, "La entrega debe tener al menos un elemento."),
});

export type DotacionInput = z.infer<typeof dotacionSchema>;

/**
 * Schema de edición: nunca se tocan la evidencia ni la firma (función
 * `actualizar_entrega_dotacion` del lado de la base las conserva).
 */
export const dotacionEditarSchema = z.object({
  empleado_id: z.string().min(1, "El empleado es obligatorio."),
  fecha_entrega: z.string().min(1, "La fecha de entrega es obligatoria."),
  tipo_entrega: z.enum(["inicial", "renovacion", "reposicion"]).default("inicial"),
  entregado_por: z.string().trim().min(1, "Indica quién entrega la dotación."),
  observaciones: textoOpcional,
  lineas: z.array(lineaDotacionSchema).min(1, "La entrega debe tener al menos un elemento."),
});

export type DotacionEditarInput = z.infer<typeof dotacionEditarSchema>;

/** Validación de `evidencia_paths` y `firma_path` contra el id de la entrega. */
export const entregaIdSchema = z.object({
  id: uuidSchema("Entrega inválida."),
});