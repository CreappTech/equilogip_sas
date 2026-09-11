import { z } from "zod";

import { uuidSchema } from "@/lib/schemas/uuid";

export const estadoEmpleadoSchema = z.enum(["activo", "inactivo"]);

const fechaNula = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.string().nullable().optional()
);

const textoOpcional = z.string().trim().optional();

const emailOpcional = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? undefined : value,
  z.string().email("El correo de contacto no es válido.").optional()
);

const opcionCatalogo = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  uuidSchema("Opción inválida.").nullable().optional()
);

const tallaCamisa = z.enum(["S", "M", "L", "XL", "XXL", "XXXL"], {
  message: "Talla de camisa no válida.",
});

const tallaPantalon = z.enum(
  ["28", "30", "32", "34", "36", "38", "40", "42"],
  { message: "Talla de pantalón no válida." }
);

const tallaZapato = z.enum(["38", "39", "40", "41", "42", "43", "44", "45"], {
  message: "Talla de zapato no válida.",
});

const numeroCuentaOpcional = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().trim().max(50, "El número de cuenta no puede superar 50 caracteres.").optional()
);

const numeroOpcional = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.string().trim().optional()
);

const cantidadHijos = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
  z.number().int("La cantidad de hijos debe ser un número entero.").min(0, "No puede ser negativa.").max(20, "Máximo 20 hijos.").nullable().optional()
);

/**
 * Schema único de empleados (no hay especialización por tipo, a diferencia de
 * activos). `fecha_ingreso` y `cargo_id` son obligatorios; el resto de campos
 * de contacto, seguridad social, dotación, financieros y bienestar son
 * opcionales. `estado` nunca llega a `retirado` desde el formulario: el retiro
 * es una operación aparte (retirarEmpleado). Las edades de los hijos se validan
 * contra `cantidad_hijos` en el formulario (se generan N inputs dinámicos).
 */
export const empleadoSchema = z
  .object({
    nombres: z.string().trim().min(1, "El nombre es obligatorio."),
    apellidos: z.string().trim().min(1, "El apellido es obligatorio."),
    documento_identidad: z
      .string()
      .trim()
      .min(1, "El documento de identidad es obligatorio."),
    fecha_nacimiento: fechaNula,
    fecha_ingreso: z.string().min(1, "La fecha de ingreso es obligatoria."),
    cargo_id: z.string().min(1, "El cargo es obligatorio."),
    turno_id: opcionCatalogo,
    estado: estadoEmpleadoSchema.default("activo"),
    telefono: textoOpcional,
    email_contacto: emailOpcional,
    eps_id: opcionCatalogo,
    arl_id: opcionCatalogo,
    fondo_pension_id: opcionCatalogo,
    talla_camisa: tallaCamisa.nullable().optional(),
    talla_pantalon: tallaPantalon.nullable().optional(),
    talla_zapato: tallaZapato.nullable().optional(),
    banco_id: opcionCatalogo,
    numero_cuenta: numeroCuentaOpcional,
    contacto_emergencia_nombres: numeroOpcional,
    contacto_emergencia_apellidos: numeroOpcional,
    contacto_emergencia_telefono: numeroOpcional,
    cantidad_hijos: cantidadHijos,
    edades_hijos: z.preprocess(
      (value) =>
        Array.isArray(value)
          ? value
              .filter((v) => v !== "" && v !== null && v !== undefined)
              .map((v) => (typeof v === "number" ? v : Number(v)))
          : value,
      z
        .array(
          z
            .number()
            .int("La edad debe ser un número entero.")
            .min(1, "La edad debe ser mayor que 0.")
            .max(100, "La edad no puede superar 100.")
        )
        .max(20, "No pueden registrarse más de 20 hijos.")
        .optional()
    ),
  });

export type EmpleadoInput = z.infer<typeof empleadoSchema>;