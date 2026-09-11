import { z } from "zod";

/** Datos de la empresa configurados para el encabezado del acta imprimible. */
export const empresaConfigSchema = z.object({
  razon_social: z.string().min(1, "La razón social es obligatoria."),
  nit: z.string().min(1, "El NIT es obligatorio."),
  direccion: z.string().min(1, "La dirección es obligatoria."),
  ciudad: z.string().min(1, "La ciudad es obligatoria."),
  telefono: z.string().min(1, "El teléfono es obligatorio."),
  representante: z.string().min(1, "El representante legal es obligatorio."),
});

export type EmpresaConfigValues = z.infer<typeof empresaConfigSchema>;