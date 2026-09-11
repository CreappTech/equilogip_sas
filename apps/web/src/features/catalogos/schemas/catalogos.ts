import { z } from "zod";
import { uuidSchema } from "@/lib/schemas/uuid";
import type { RecursoCatalogo } from "../types/catalogos";

const nombreObligatorio = (mensaje: string) =>
  z
    .string()
    .trim()
    .min(1, mensaje)
    .max(120, "Máximo 120 caracteres.");

const ordenCatalogo = z.preprocess(
  (value) => (value === "" || value === null ? 0 : value),
  z.coerce
    .number()
    .int("El orden debe ser un número entero.")
    .min(0, "El orden no puede ser negativo.")
);

export const catalogoTenantSchema = z.object({
  nombre: nombreObligatorio("El nombre es obligatorio."),
  orden: ordenCatalogo.default(0),
  activo: z.boolean().default(true),
});

/** Grupo de actividad (agrupador interno de la empresa). */
export const grupoActividadCatalogoSchema = catalogoTenantSchema;

const horaTurno = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:MM (ej. 06:00).");

/**
 * Turno: extiende el catálogo tenant con hora de inicio y fin. Si la hora de
 * fin es menor que la de inicio, el turno cruza la medianoche (nocturno).
 */
export const turnoCatalogoSchema = catalogoTenantSchema
  .extend({
    hora_inicio: horaTurno,
    hora_fin: horaTurno,
  })
  .refine((turno) => turno.hora_inicio !== turno.hora_fin, {
    path: ["hora_fin"],
    message: "La hora de fin no puede ser igual a la de inicio.",
  });

const porcentajeRecargo = z.preprocess(
  (value) => (value === "" || value === null ? 0 : value),
  z.coerce
    .number("El porcentaje debe ser un número.")
    .min(0, "El porcentaje no puede ser negativo.")
    .max(999.99, "El porcentaje no puede superar 999.99.")
    .multipleOf(0.01, "Usa máximo dos decimales.")
);

/**
 * Tipo de hora: extiende el catálogo tenant con el % de recargo que
 * identifica el tipo (ej. "Hora extra diurna, 25%").
 */
export const tipoHoraCatalogoSchema = catalogoTenantSchema.extend({
  porcentaje_recargo: porcentajeRecargo.default(0),
});

const tarifaActividadSchema = z.preprocess(
  (value) => (value === "" || value === null ? 0 : value),
  z.coerce
    .number("La tarifa debe ser un número.")
    .min(0, "La tarifa no puede ser negativa.")
    .max(9999999.99, "La tarifa no puede superar 9999999.99.")
    .multipleOf(0.01, "Usa máximo dos decimales.")
);

/**
 * Actividad (tipo de actividad): catálogo tenant que alimenta el dropdown de
 * actividades de la planeación de servicio. `tarifa` (por hora o por servicio)
 * se usa por los módulos futuros (finanzas). `codigo_ciiu` (4 dígitos, del
 * RUT) y `grupo_actividad_id` (agrupador interno de la empresa) son
 * obligatorios para las actividades nuevas.
 */
const codigoCiiu = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "El código CIIU debe tener 4 dígitos.")
  .transform((valor) => valor.toUpperCase());

export const actividadCatalogoSchema = catalogoTenantSchema.extend({
  grupo_actividad_id: uuidSchema("Selecciona el grupo de actividad."),
  codigo_ciiu: codigoCiiu,
  tarifa: tarifaActividadSchema.default(0),
});

const codigoSubtipo = z
  .string()
  .trim()
  .min(1, "El código es obligatorio.")
  .max(40, "Máximo 40 caracteres.")
  .transform((valor) => valor.toUpperCase());

export const subtipoActivoCatalogoSchema = z.object({
  categoria: z.enum(["vehiculo", "maquina", "equipo"], {
    message: "Selecciona una categoría.",
  }),
  codigo: codigoSubtipo,
  nombre: nombreObligatorio("El nombre es obligatorio."),
  orden: ordenCatalogo.default(0),
  activo: z.boolean().default(true),
});

export const centroTrabajoSchema = z.object({
  nombre: nombreObligatorio("El nombre es obligatorio."),
  activo: z.boolean().default(true),
});

const textoOpcional = (label: string, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().trim().max(max, `Máximo ${max} caracteres.`).nullable()
  );

export const proveedorCatalogoSchema = z.object({
  nombre: nombreObligatorio("El nombre es obligatorio."),
  telefono: textoOpcional("teléfono", 40),
  email: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z
      .string()
      .trim()
      .toLowerCase()
      .max(120, "Máximo 120 caracteres.")
      .email("Correo electrónico inválido.")
      .nullable()
  ),
  direccion: textoOpcional("dirección", 200),
  activo: z.boolean().default(true),
});

/**
 * Modelo de equipo: `nombre` + `marca_id` (FK a marcas.id). El select de
 * marca se resuelve en servidor (catálogo de marcas activas).
 */
export const modeloCatalogoSchema = z.object({
  marca_id: uuidSchema("Selecciona la marca."),
  nombre: nombreObligatorio("El nombre es obligatorio."),
  orden: ordenCatalogo.default(0),
  activo: z.boolean().default(true),
});

/** Catálogo técnico global con código (mayúsculas) + nombre. */
const codigoNombreCatalogoSchema = z.object({
  codigo: codigoSubtipo,
  nombre: nombreObligatorio("El nombre es obligatorio."),
  orden: ordenCatalogo.default(0),
  activo: z.boolean().default(true),
});

export const unidadMedidaCatalogoSchema = codigoNombreCatalogoSchema;
export const tipoDocumentoCatalogoSchema = codigoNombreCatalogoSchema;

/**
 * Cliente (tenant-scoped, con contacto). Misma forma que el proveedor:
 * el contacto opcional se normaliza a null cuando viene vacío.
 */
export const clienteCatalogoSchema = proveedorCatalogoSchema;

/**
 * Esquemas por recurso. Son el contrato de entrada de las actions de catálogo
 * (el servidor SIEMPRE revalida con estos esquemas) y también los usa el
 * formulario cliente vía useAppForm.
 */
export const CATALOGO_ESQUEMAS = {
  cargos: catalogoTenantSchema,
  areas: catalogoTenantSchema,
  tipos_contrato: catalogoTenantSchema,
  turnos: turnoCatalogoSchema,
  subtipos_activos: subtipoActivoCatalogoSchema,
  centros_servicio: centroTrabajoSchema,
  proveedores: proveedorCatalogoSchema,
  marcas: catalogoTenantSchema,
  modelos: modeloCatalogoSchema,
  unidades_medida: unidadMedidaCatalogoSchema,
  tipos_documento_identidad: tipoDocumentoCatalogoSchema,
  tipos_mantenimiento: catalogoTenantSchema,
  tipos_repuesto_servicio: catalogoTenantSchema,
  grupos_actividad: grupoActividadCatalogoSchema,
  tipos_actividad: actividadCatalogoSchema,
  categorias_ingreso: catalogoTenantSchema,
  categorias_gasto: catalogoTenantSchema,
  clientes: clienteCatalogoSchema,
  conceptos_liquidacion: catalogoTenantSchema,
  tipos_hora: tipoHoraCatalogoSchema,
  eps: catalogoTenantSchema,
  arl: catalogoTenantSchema,
  fondos_pension: catalogoTenantSchema,
  bancos: catalogoTenantSchema,
} as const;

export type CatalogoInput<
  TRecurso extends RecursoCatalogo
> = z.infer<(typeof CATALOGO_ESQUEMAS)[TRecurso]>;