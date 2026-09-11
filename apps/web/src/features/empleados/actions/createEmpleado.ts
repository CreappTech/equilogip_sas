"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { empleadoSchema, type EmpleadoInput } from "../schemas/empleadoSchema";
import { emptyToNull, requierePermisoEmpleado, traducirError } from "./shared";
import { permisoEmpleado } from "../types/empleado.types";
import type { ResultadoEmpleado } from "../types/empleado.types";

export async function createEmpleado(
  input: EmpleadoInput
): Promise<ResultadoEmpleado> {
  await requireUser();

  if (!(await requierePermisoEmpleado(permisoEmpleado("crear")))) {
    return { ok: false, error: "No tienes permiso para crear empleados." };
  }

  const parsed = empleadoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("empleados").insert({
    nombres: data.nombres,
    apellidos: data.apellidos,
    documento_identidad: data.documento_identidad,
    fecha_nacimiento: data.fecha_nacimiento ?? null,
    fecha_ingreso: data.fecha_ingreso,
    cargo_id: data.cargo_id,
    turno_id: emptyToNull(data.turno_id),
    estado: data.estado ?? "activo",
    telefono: emptyToNull(data.telefono),
    email_contacto: emptyToNull(data.email_contacto),
    eps_id: emptyToNull(data.eps_id),
    arl_id: emptyToNull(data.arl_id),
    fondo_pension_id: emptyToNull(data.fondo_pension_id),
    talla_camisa: emptyToNull(data.talla_camisa),
    talla_pantalon: emptyToNull(data.talla_pantalon),
    talla_zapato: emptyToNull(data.talla_zapato),
    banco_id: emptyToNull(data.banco_id),
    numero_cuenta: emptyToNull(data.numero_cuenta),
    contacto_emergencia_nombres: emptyToNull(data.contacto_emergencia_nombres),
    contacto_emergencia_apellidos: emptyToNull(
      data.contacto_emergencia_apellidos
    ),
    contacto_emergencia_telefono: emptyToNull(
      data.contacto_emergencia_telefono
    ),
    cantidad_hijos: data.cantidad_hijos ?? null,
    edades_hijos: (data.cantidad_hijos ?? 0) > 0 ? (data.edades_hijos ?? []) : [],
  });

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  revalidatePath("/empleados");
  return { ok: true };
}