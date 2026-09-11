import { createClient } from "@/lib/supabase/server";
import type {
  EmpleadoDetalle,
  EmpleadoRow,
  UsuarioVinculado,
} from "../types/empleado.types";

const CAMPOS_SELECCION = [
  "id",
  "nombres",
  "apellidos",
  "documento_identidad",
  "fecha_nacimiento",
  "fecha_ingreso",
  "cargo_id",
  "turno_id",
  "estado",
  "telefono",
  "email_contacto",
  "eps_id",
  "arl_id",
  "fondo_pension_id",
  "talla_camisa",
  "talla_pantalon",
  "talla_zapato",
  "banco_id",
  "numero_cuenta",
  "contacto_emergencia_nombres",
  "contacto_emergencia_apellidos",
  "contacto_emergencia_telefono",
  "cantidad_hijos",
  "edades_hijos",
  "created_at",
  "updated_at",
] as const;

/**
 * Detalle de un empleado: datos + nombre del cargo + nombres de afiliaciones
 * y banco (embeds) + usuario de sistema vinculado (si existe). El vínculo se
 * resuelve consultando profiles por `fk_empleado_id` (RLS de profiles permite
 * leer dentro del tenant).
 */
export async function getEmpleadoDetalle(
  id: string
): Promise<EmpleadoDetalle | null> {
  const supabase = await createClient();

  const { data: empleado, error } = await supabase
    .from("empleados")
    .select(
      `${CAMPOS_SELECCION.join(",")}, cargos(nombre), turnos(nombre), eps(nombre), arl(nombre), fondos_pension(nombre), bancos(nombre)`
    )
    .eq("id", id)
    .single();

  if (error || !empleado) return null;

  const fila = empleado as unknown as EmpleadoRow & {
    cargos: { nombre: string }[] | null;
    turnos: { nombre: string }[] | null;
    eps: { nombre: string }[] | null;
    arl: { nombre: string }[] | null;
    fondos_pension: { nombre: string }[] | null;
    bancos: { nombre: string }[] | null;
  };

  const { data: usuario } = await supabase
    .from("profiles")
    .select("id, nombres, apellidos, email_login, activo")
    .eq("fk_empleado_id", id)
    .maybeSingle();

  const {
    cargos,
    turnos,
    eps,
    arl,
    fondos_pension,
    bancos,
    ...resto
  } = fila;

  return {
    empleado: resto,
    cargo_nombre: cargos?.[0]?.nombre ?? null,
    turno_nombre: turnos?.[0]?.nombre ?? null,
    eps_nombre: eps?.[0]?.nombre ?? null,
    arl_nombre: arl?.[0]?.nombre ?? null,
    fondo_pension_nombre: fondos_pension?.[0]?.nombre ?? null,
    banco_nombre: bancos?.[0]?.nombre ?? null,
    usuario: usuario ? (usuario as UsuarioVinculado) : null,
  };
}