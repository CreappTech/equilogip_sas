import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/uuid";

export const programacionSchema = z.object({
  operador_id: uuidSchema("Seleccione un operador válido"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  hora_inicio_programada: z
    .string()
    .min(1, "La hora de inicio es obligatoria"),
  hora_fin_programada: z.string().min(1, "La hora de fin es obligatoria"),
  turno_id: uuidSchema("Turno inválido.").nullable().optional(),
  centro_servicio_id: uuidSchema("Sede inválida.").nullable().optional(),
});

export type ProgramacionInput = z.infer<typeof programacionSchema>;

export const programacionSemanalSchema = z.object({
  operadores: z
    .array(uuidSchema("Operador inválido."))
    .min(1, "Seleccione al menos un operador"),
  semana_inicio: z.string().min(1, "La fecha de inicio es obligatoria"),
  turno_id: uuidSchema("Seleccione un turno"),
  centro_servicio_id: uuidSchema("Sede inválida.").nullable().optional(),
});

export type ProgramacionSemanalInput = z.infer<
  typeof programacionSemanalSchema
>;

export const novedadSchema = z.object({
  operador_id: uuidSchema("Seleccione un operador válido"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipo_novedad: z.enum([
    "incapacidad",
    "permiso",
    "vacaciones",
    "ausencia_injustificada",
    "otro",
  ]),
  observaciones: z.string().nullable().optional(),
});

export type NovedadInput = z.infer<typeof novedadSchema>;

export const correccionSchema = z.object({
  campo_corregido: z.enum(["hora_inicio_real", "hora_fin_real"]),
  valor_nuevo: z.string().min(1, "El nuevo valor es obligatorio"),
  motivo: z
    .string()
    .min(3, "El motivo es obligatorio (mínimo 3 caracteres)")
    .max(500),
});

export type CorreccionInput = z.infer<typeof correccionSchema>;

export const autorizacionExtraSchema = z.object({
  motivo: z
    .string()
    .min(3, "El motivo es obligatorio (mínimo 3 caracteres)")
    .max(500),
});

export type AutorizacionExtraInput = z.infer<typeof autorizacionExtraSchema>;

export const idSchema = z.object({
  id: uuidSchema("ID inválido"),
});

export const configuracionJornadaSchema = z.object({
  hora_inicio_nocturna: z.string().min(1, "La hora de inicio nocturna es obligatoria"),
  hora_fin_nocturna: z.string().min(1, "La hora de fin nocturna es obligatoria"),
  horas_jornada_ordinaria: z
    .number({ message: "Debe ser un número" })
    .positive("Debe ser mayor a 0")
    .max(24, "No puede exceder 24 horas"),
});

export type ConfiguracionJornadaInput = z.infer<typeof configuracionJornadaSchema>;
