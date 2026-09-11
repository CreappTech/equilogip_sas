"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { empleadoSchema, type EmpleadoInput } from "../schemas/empleadoSchema";
import { emptyToNull, requierePermisoEmpleado, traducirError } from "./shared";
import { permisoEmpleado } from "../types/empleado.types";
import type { ResultadoEmpleado } from "../types/empleado.types";

const idSchema = z.object({ id: z.string().uuid("Empleado inválido.") });

export async function updateEmpleado(
  input: EmpleadoInput & { id: string }
): Promise<ResultadoEmpleado> {
  await requireUser();

  if (!(await requierePermisoEmpleado(permisoEmpleado("editar")))) {
    return { ok: false, error: "No tienes permiso para editar empleados." };
  }

  const idParsed = idSchema.safeParse({ id: input.id });
  if (!idParsed.success) {
    return { ok: false, error: "Empleado inválido." };
  }

  const parsed = empleadoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const supabase = await createClient();

  const { data: actual } = await supabase
    .from("empleados")
    .select("id, estado")
    .eq("id", input.id)
    .single();

  if (!actual) {
    return { ok: false, error: "No se encontró el empleado." };
  }

  if (actual.estado === "retirado") {
    return { ok: false, error: "No se puede editar un empleado retirado." };
  }

  const data = parsed.data;
  const { error } = await supabase
    .from("empleados")
    .update({
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
    })
    .eq("id", input.id);

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  revalidatePath("/empleados");
  revalidatePath(`/empleados/${input.id}`);
  return { ok: true };
}