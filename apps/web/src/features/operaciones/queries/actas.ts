import { createClient } from "@/lib/supabase/server";
import type {
  ActaDocumento,
  ActaResumen,
  DatosActa,
  EmpresaConfigDatos,
} from "../types/operaciones.types";

const EMPRESA_COLS = [
  "razon_social",
  "nit",
  "direccion",
  "ciudad",
  "telefono",
  "representante",
] as const;

const EMPRESA_VACIA: EmpresaConfigDatos = {
  razon_social: "",
  nit: "",
  direccion: "",
  ciudad: "",
  telefono: "",
  representante: "",
};

/** Datos de la empresa para el acta. Devuelve valores vacíos si aún no se configuró. */
export async function getEmpresaConfig(): Promise<EmpresaConfigDatos> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("empresa_config")
    .select(EMPRESA_COLS.join(","))
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return EMPRESA_VACIA;
  }

  const fila = data as unknown as Record<string, string | null>;
  return {
    razon_social: fila.razon_social ?? "",
    nit: fila.nit ?? "",
    direccion: fila.direccion ?? "",
    ciudad: fila.ciudad ?? "",
    telefono: fila.telefono ?? "",
    representante: fila.representante ?? "",
  };
}

interface ActaResumenRow {
  id: string;
  numero: string;
  periodo_inicio: string;
  periodo_fin: string;
  fecha_generacion: string;
  clientes?: { nombre?: string | null } | null;
  activo_equipos?: { codigo_interno?: string | null; nombre?: string | null } | null;
  perfil_generado?: { nombres?: string | null; apellidos?: string | null } | null;
}

/** Histórico de actas generadas, más reciente primero. */
export async function listActas(): Promise<ActaResumen[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("actas_servicio")
    .select(
      `id,
       numero,
       periodo_inicio,
       periodo_fin,
       fecha_generacion,
       clientes(nombre),
       activo_equipos:activos(codigo_interno, nombre),
       perfil_generado:profiles(nombres, apellidos)`
    )
    .order("fecha_generacion", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as ActaResumenRow[]).map((f) => ({
    id: f.id,
    numero: f.numero,
    periodo_inicio: f.periodo_inicio,
    periodo_fin: f.periodo_fin,
    fecha_generacion: f.fecha_generacion,
    cliente_nombre: f.clientes?.nombre ?? null,
    equipo_codigo: f.activo_equipos?.codigo_interno ?? null,
    equipo_nombre: f.activo_equipos?.nombre ?? null,
    generado_por_nombre: f.perfil_generado
      ? `${f.perfil_generado.nombres ?? ""} ${f.perfil_generado.apellidos ?? ""}`.trim() ||
        null
      : null,
  }));
}

/**
 * Recupera un acta guardada por su id reconstruyendo el documento imprimible
 * desde el snapshot congelado en la generación (spec 7.6).
 */
export async function obtenerActaPorId(id: string): Promise<ActaDocumento> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("actas_servicio")
    .select("numero, periodo_inicio, periodo_fin, fecha_generacion, snapshot")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("El acta no existe.");
  }

  const s = (data.snapshot ?? {}) as Partial<DatosActa>;

  return {
    empresa: s.empresa ?? EMPRESA_VACIA,
    cliente_nombre: s.cliente_nombre ?? "—",
    equipo: s.equipo ?? {
      id: "",
      codigo_interno: "—",
      nombre: null,
      marca: null,
      modelo: null,
    },
    periodo_inicio: s.periodo_inicio ?? "",
    periodo_fin: s.periodo_fin ?? "",
    total_actividades: s.total_actividades ?? 0,
    horas_trabajadas: s.horas_trabajadas ?? 0,
    total_novedades: s.total_novedades ?? 0,
    tabla_a: s.tabla_a ?? [],
    tabla_b: s.tabla_b ?? [],
    numero: data.numero,
    fecha_generacion: data.fecha_generacion,
  };
}

/**
 * Datos calculados de un acta para [cliente, equipo, periodo]. La Tabla A
 * viene de la vista resumen (actividades con inicio dentro del periodo) y la
 * Tabla B de la vista de novedades (pausas dentro del periodo). Ambas son la
 * fuente única del cálculo (AGENTS §19); el frontend no duplica fórmulas.
 */
export async function obtenerDatosActa(
  clienteId: string,
  equipoId: string,
  fechaDesde: string,
  fechaHasta: string
): Promise<DatosActa> {
  const supabase = await createClient();

  const [empresa, cliente, activo, tablaA, tablaB] = await Promise.all([
    getEmpresaConfig(),
    supabase
      .from("clientes")
      .select("nombre")
      .eq("id", clienteId)
      .maybeSingle(),
    supabase
      .from("activos")
      .select("id, codigo_interno, nombre, tipo")
      .eq("id", equipoId)
      .maybeSingle(),
    supabase
      .from("vw_operacion_actividades_resumen")
      .select("inicio_hora, fin_hora, horas_trabajadas")
      .eq("activo_id", equipoId)
      .eq("cliente_id", clienteId)
      .not("inicio_hora", "is", null)
      .gte("inicio_hora", `${fechaDesde}T00:00:00`)
      .lte("inicio_hora", `${fechaHasta}T23:59:59.999`)
      .order("inicio_hora", { ascending: true }),
    supabase
      .from("vw_operacion_novedades")
      .select("fecha_pausa, causal_nombre, observaciones, horas_duracion")
      .eq("activo_id", equipoId)
      .eq("cliente_id", clienteId)
      .gte("fecha_pausa", `${fechaDesde}T00:00:00`)
      .lte("fecha_pausa", `${fechaHasta}T23:59:59.999`)
      .order("fecha_pausa", { ascending: true }),
  ]);

  if (cliente.error) {
    throw new Error(cliente.error.message);
  }
  if (activo.error) {
    throw new Error(activo.error.message);
  }
  if (!cliente.data || !activo.data) {
    throw new Error("El cliente o el equipo seleccionado no existe.");
  }

  const tipo = activo.data.tipo as string;

  const sinEspecialidad: () => Promise<{
    marca: string | null;
    modelo: string | null;
  }> = async () => ({ marca: null, modelo: null });

  const especial: Record<
    string,
    () => Promise<{ marca: string | null; modelo: string | null }>
  > = {
    vehiculo: async () => {
      const { data, error } = await supabase
        .from("vehiculos")
        .select("marca, modelo")
        .eq("activo_id", equipoId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { marca: data?.marca ?? null, modelo: data?.modelo ?? null };
    },
    maquina: async () => {
      const { data, error } = await supabase
        .from("maquinas")
        .select("marca, modelo")
        .eq("activo_id", equipoId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { marca: data?.marca ?? null, modelo: data?.modelo ?? null };
    },
    equipo: async () => {
      const { data, error } = await supabase
        .from("equipos")
        .select("marca, modelo")
        .eq("activo_id", equipoId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { marca: data?.marca ?? null, modelo: data?.modelo ?? null };
    },
  };

  const especialidad = await (especial[tipo] ?? sinEspecialidad)();

  const filasAExistentes = tablaA.error
    ? (() => {
        throw new Error(tablaA.error.message);
      })()
    : ((tablaA.data ?? []) as unknown as Array<{
        inicio_hora: string;
        fin_hora: string | null;
        horas_trabajadas: number | null;
      }>);

  const filasBExistentes = tablaB.error
    ? (() => {
        throw new Error(tablaB.error.message);
      })()
    : ((tablaB.data ?? []) as unknown as Array<{
        fecha_pausa: string;
        causal_nombre: string | null;
        observaciones: string | null;
        horas_duracion: number | null;
      }>);

  const horasTrabajadas =
    Math.round(
      filasAExistentes.reduce((suma, f) => suma + (f.horas_trabajadas ?? 0), 0) *
        100
    ) / 100;

  return {
    empresa,
    cliente_nombre: cliente.data.nombre,
    equipo: {
      id: activo.data.id,
      codigo_interno: activo.data.codigo_interno,
      nombre: activo.data.nombre,
      marca: especialidad.marca,
      modelo: especialidad.modelo,
    },
    periodo_inicio: fechaDesde,
    periodo_fin: fechaHasta,
    total_actividades: filasAExistentes.length,
    horas_trabajadas: horasTrabajadas,
    total_novedades: filasBExistentes.length,
    tabla_a: filasAExistentes.map((f) => ({
      fecha: f.inicio_hora,
      inicio: f.inicio_hora,
      fin: f.fin_hora,
      horas_trabajadas: Math.round((f.horas_trabajadas ?? 0) * 100) / 100,
    })),
    tabla_b: filasBExistentes.map((f) => ({
      fecha: f.fecha_pausa,
      causal_nombre: f.causal_nombre,
      observaciones: f.observaciones,
      horas_duracion: f.horas_duracion,
    })),
  };
}