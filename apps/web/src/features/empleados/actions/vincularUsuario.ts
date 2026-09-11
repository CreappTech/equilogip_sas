"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/schemas/uuid";
import { traducirError } from "./shared";
import { permisoEmpleado } from "../types/empleado.types";
import type { ResultadoEmpleado } from "../types/empleado.types";

const vincularUsuarioSchema = z.object({
  empleado_id: uuidSchema("Empleado inválido."),
  profile_id: uuidSchema("Usuario inválido.").nullable(),
});

/**
 * Asocia/desasocia un usuario de sistema (profiles) a un empleado.
 * La acción escribe en `profiles.fk_empleado_id`, así que exige AMBOS
 * permisos: `empleados.empleados.vincular_usuario` (del módulo) y
 * `auth.usuarios.editar` (lo que la RLS de profiles valida en el UPDATE).
 * Nunca se debilita la RLS de profiles.
 */
export async function vincularUsuario(input: {
  empleado_id: string;
  profile_id: string | null;
}): Promise<ResultadoEmpleado> {
  await requireUser();

  const permisos = await getPermisos();

  const puedeVincular =
    permisos.includes("*") ||
    (permisos.includes(permisoEmpleado("vincular_usuario")) &&
      permisos.includes("auth.usuarios.editar"));

  if (!puedeVincular) {
    return { ok: false, error: "No tienes permiso para vincular usuarios." };
  }

  const parsed = vincularUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Vínculo inválido." };
  }

  const { empleado_id, profile_id } = parsed.data;
  const supabase = await createClient();

  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, estado")
    .eq("id", empleado_id)
    .single();

  if (!empleado) {
    return { ok: false, error: "No se encontró el empleado." };
  }

  if (empleado.estado === "retirado") {
    return {
      ok: false,
      error: "No se puede vincular un usuario a un empleado retirado.",
    };
  }

  if (profile_id) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("id, fk_empleado_id")
      .eq("id", profile_id)
      .maybeSingle();

    if (!perfil) {
      return { ok: false, error: "El usuario seleccionado no existe." };
    }

    if (perfil.fk_empleado_id && perfil.fk_empleado_id !== empleado_id) {
      return { ok: false, error: "El usuario ya está vinculado a otro empleado." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ fk_empleado_id: empleado_id })
      .eq("id", profile_id);

    if (error) {
      return { ok: false, error: traducirError(error) };
    }
  } else {
    // Desvincular: limpiar la relación en el perfil actualmente asociado.
    const { data: actual } = await supabase
      .from("profiles")
      .select("id")
      .eq("fk_empleado_id", empleado_id)
      .maybeSingle();

    if (actual) {
      const { error } = await supabase
        .from("profiles")
        .update({ fk_empleado_id: null })
        .eq("id", actual.id);

      if (error) {
        return { ok: false, error: traducirError(error) };
      }
    }
  }

  revalidatePath("/empleados");
  revalidatePath(`/empleados/${empleado_id}`);
  return { ok: true };
}