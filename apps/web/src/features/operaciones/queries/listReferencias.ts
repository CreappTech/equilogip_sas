import { createClient } from "@/lib/supabase/server";
import type {
  ActivoOpcion,
  CausalPausaOpcion,
  ClienteOpcion,
  EmpleadoOpcion,
  TipoActividadOpcion,
} from "../types/operaciones.types";

/** Empleados activos disponibles como operador. */
export async function listEmpleadosActivos(): Promise<EmpleadoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("empleados")
    .select("id, nombres, apellidos")
    .eq("estado", "activo")
    .order("apellidos", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as EmpleadoOpcion[];
}

/** Activos activos (ciclo de vida) disponibles para operar. */
export async function listActivosOperativos(): Promise<ActivoOpcion[]> {
  const supabase = await createClient();

  const activos = await supabase
    .from("activos")
    .select("id, codigo_interno, nombre, estado_operativo, tipo")
    .eq("estado", "activo")
    .not("estado_operativo", "in", '("FUERA_DE_SERVICIO","ALQUILADA")')
    .order("codigo_interno", { ascending: true });

  if (activos.error) {
    throw new Error(activos.error.message);
  }

  const filas = activos.data ?? [];
  const conEspecialidad: ActivoOpcion[] = [];

  for (const fila of filas) {
    let marca: string | null = null;
    let modelo: string | null = null;

    if (fila.tipo === "vehiculo") {
      const { data, error } = await supabase
        .from("vehiculos")
        .select("marca, modelo")
        .eq("activo_id", fila.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      marca = data?.marca ?? null;
      modelo = data?.modelo ?? null;
    } else if (fila.tipo === "maquina") {
      const { data, error } = await supabase
        .from("maquinas")
        .select("marca, modelo")
        .eq("activo_id", fila.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      marca = data?.marca ?? null;
      modelo = data?.modelo ?? null;
    } else {
      const { data, error } = await supabase
        .from("equipos")
        .select("marca, modelo")
        .eq("activo_id", fila.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      marca = data?.marca ?? null;
      modelo = data?.modelo ?? null;
    }

    conEspecialidad.push({
      id: fila.id,
      codigo_interno: fila.codigo_interno,
      nombre: fila.nombre,
      marca,
      modelo,
      estado_operativo: fila.estado_operativo,
    });
  }

  return conEspecialidad;
}

/** Catalogo comunes tenant-scoped: centros_servicio, tipos_actividad, clientes. */
export async function listTipoActividad(): Promise<TipoActividadOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tipos_actividad")
    .select("id, nombre")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as TipoActividadOpcion[];
}

/** Clientes activos del tenant. */
export async function listClientes(): Promise<ClienteOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ClienteOpcion[];
}

/** Causales de pausa activas, para el modal de pausa. */
export async function listCausalesPausa(): Promise<CausalPausaOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("causales_pausa")
    .select("id, nombre")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as CausalPausaOpcion[];
}