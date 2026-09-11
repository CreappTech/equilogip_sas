import { z } from "zod";

import { uuidSchema } from "./uuid";

export const registrarUsuarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  apellido: z.string().min(1, "El apellido es obligatorio."),
  numeroDocumento: z.string().min(1, "El número de documento es obligatorio."),
  correo: z
    .string()
    .min(1, "El correo es obligatorio.")
    .email("El correo no es un email válido.")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres."),
  rol: z.string().min(1, "El rol es obligatorio."),
  telefono: z.string().trim().optional(),
  rolIds: z.array(uuidSchema("Rol inválido")).optional(),
});

export const cambiarEstadoSchema = z.object({
  id: uuidSchema("Usuario inválido."),
  estado: z.enum(["activo", "inactivo", "bloqueado"]),
});

export const asignarRolesSchema = z.object({
  usuarioId: uuidSchema("Usuario inválido."),
  rolIds: z.array(uuidSchema("Rol inválido")),
});

export const actualizarUsuarioSchema = z.object({
  id: uuidSchema("Usuario inválido."),
  nombre: z.string().min(1, "El nombre es obligatorio."),
  apellido: z.string().min(1, "El apellido es obligatorio."),
  numeroDocumento: z.string().min(1, "El número de documento es obligatorio."),
  telefono: z.string().trim().optional(),
  rolIds: z.array(uuidSchema("Rol inválido")).optional(),
});

export const eliminarUsuarioSchema = z.object({
  id: uuidSchema("Usuario inválido."),
});

export const rolSchema = z.object({
  nombre: z.string().min(1, "El nombre del rol es obligatorio."),
  codigo: z
    .string()
    .min(1, "El código del rol es obligatorio.")
    .regex(/^[A-Z0-9_]+$/, "El código solo admite mayúsculas, números y guiones bajos.")
    .trim()
    .toUpperCase(),
  descripcion: z.string().trim().optional(),
  estado: z.enum(["activo", "inactivo"]).default("activo"),
  permisoIds: z.array(uuidSchema("Permiso inválido")).optional(),
});

export type RegistrarInput = z.infer<typeof registrarUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
export type RolInput = z.infer<typeof rolSchema>;
