export type EstadoEmpleado = "activo" | "inactivo" | "retirado";

export type ResultadoEmpleado =
  | { ok: true }
  | { ok: false; error: string };

export interface EmpleadoRow {
  id: string;
  nombres: string;
  apellidos: string;
  documento_identidad: string;
  fecha_nacimiento: string | null;
  fecha_ingreso: string;
  cargo_id: string;
  turno_id: string | null;
  estado: EstadoEmpleado;
  telefono: string | null;
  email_contacto: string | null;
  eps_id: string | null;
  arl_id: string | null;
  fondo_pension_id: string | null;
  talla_camisa: string | null;
  talla_pantalon: string | null;
  talla_zapato: string | null;
  banco_id: string | null;
  numero_cuenta: string | null;
  contacto_emergencia_nombres: string | null;
  contacto_emergencia_apellidos: string | null;
  contacto_emergencia_telefono: string | null;
  cantidad_hijos: number | null;
  edades_hijos: number[] | null;
  created_at: string;
  updated_at: string;
}

/** Fila de listado: incluye el nombre del cargo (join al catálogo). */
export interface ListadoEmpleado extends EmpleadoRow {
  cargo_nombre?: string | null;
}

/** Usuario de sistema (profiles) vinculado al empleado, sin datos sensibles. */
export interface UsuarioVinculado {
  id: string;
  nombres: string;
  apellidos: string | null;
  email_login: string | null;
  activo: boolean | null;
}

export interface EmpleadoDetalle {
  empleado: EmpleadoRow;
  cargo_nombre?: string | null;
  eps_nombre?: string | null;
  arl_nombre?: string | null;
  fondo_pension_nombre?: string | null;
  banco_nombre?: string | null;
  turno_nombre?: string | null;
  usuario?: UsuarioVinculado | null;
}

/** Opción del catálogo `cargos` (tenant-scoped) para el formulario. */
export interface CargoOpcion {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number | null;
}

/** Opción de catálogo de RRHH (EPS, ARL, fondo de pensión, banco) para el formulario. */
export interface RrhhOpcion {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number | null;
}

/** Opción del catálogo `turnos` (tenant-scoped) para el formulario de empleados. */
export interface TurnoOpcion {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number | null;
  hora_inicio: string;
  hora_fin: string;
}

/** Usuario del sistema disponible para vincular (activo y sin relación con otro empleado). */
export interface UsuarioVinculable {
  id: string;
  nombres: string;
  apellidos: string | null;
  email_login: string | null;
}

export const ESTADO_EMPLEADO_LABELS: Record<EstadoEmpleado, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  retirado: "Retirado",
};

export function nombreEmpleado(empleado: {
  nombres: string;
  apellidos: string;
}): string {
  return `${empleado.nombres} ${empleado.apellidos}`.trim();
}

export function nombreUsuario(usuario: {
  nombres: string;
  apellidos?: string | null;
  email_login?: string | null;
}): string {
  const nombre = `${usuario.nombres} ${usuario.apellidos ?? ""}`.trim();
  return nombre || usuario.email_login || "Usuario";
}

export function permisoEmpleado(
  accion:
    | "ver"
    | "crear"
    | "editar"
    | "eliminar"
    | "vincular_usuario"
): string {
  return `empleados.empleados.${accion}`;
}