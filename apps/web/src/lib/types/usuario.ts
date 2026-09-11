export type EstadoUsuario = "activo" | "inactivo" | "bloqueado";

export type Resultado =
  | { ok: true }
  | { ok: false; error: string };

export type RegistrarInput = {
  nombre: string;
  apellido: string;
  numeroDocumento: string;
  correo: string;
  password: string;
  tenantId: string;
  rol: string;
  telefono?: string;
  rolIds?: string[];
};
