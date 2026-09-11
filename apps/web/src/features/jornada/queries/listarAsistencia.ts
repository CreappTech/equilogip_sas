import { createClient } from "@/lib/supabase/server";
import type {
  ListadoAsistencia,
  EmpleadoOpcion,
} from "../types/jornada.types";

export type FiltrosAsistencia = {
  fecha: string;
};

export async function listarAsistenciaDelDia(
  filtros: FiltrosAsistencia
): Promise<ListadoAsistencia[]> {
  const supabase = await createClient();

  // Obtener programación del día con marcaciones (si existen)
  const { data: programaciones, error: progError } = await supabase
    .from("jornada_programacion")
    .select(
      `id, operador_id, fecha, hora_inicio_programada, hora_fin_programada,
       empleados(nombres, apellidos),
       jornada_marcaciones (
         id, hora_inicio_real, hora_fin_real,
         registrado_por_inicio, registrado_por_fin, estado
       )`
    )
    .eq("fecha", filtros.fecha)
    .order("hora_inicio_programada");

  if (progError) throw new Error(progError.message);

  type MarcacionRaw = {
    id: string;
    hora_inicio_real: string | null;
    hora_fin_real: string | null;
    registrado_por_inicio: string | null;
    registrado_por_fin: string | null;
    estado: string;
  };

  type ProgRaw = {
    id: string;
    operador_id: string;
    fecha: string;
    hora_inicio_programada: string;
    hora_fin_programada: string;
    empleados?: { nombres?: string; apellidos?: string } | null;
    jornada_marcaciones?: MarcacionRaw[] | null;
  };

  const resultado: ListadoAsistencia[] = [];

  for (const prog of (programaciones ?? []) as unknown as ProgRaw[]) {
    const emp = prog.empleados;
    const marcs = prog.jornada_marcaciones ?? [];
    const marc = marcs[0] ?? null;

    resultado.push({
      id: marc?.id ?? "",
      programacion_id: prog.id,
      hora_inicio_real: marc?.hora_inicio_real ?? null,
      hora_fin_real: marc?.hora_fin_real ?? null,
      registrado_por_inicio: marc?.registrado_por_inicio ?? null,
      registrado_por_fin: marc?.registrado_por_fin ?? null,
      estado: (marc?.estado as string) ?? "pendiente",
      operador_id: prog.operador_id,
      operador_nombre: emp
        ? `${emp.nombres ?? ""} ${emp.apellidos ?? ""}`.trim()
        : null,
      fecha: prog.fecha,
      hora_inicio_programada: prog.hora_inicio_programada,
      hora_fin_programada: prog.hora_fin_programada,
    } as ListadoAsistencia);
  }

  return resultado;
}

export async function listarEmpleadosOpciones(): Promise<EmpleadoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("empleados")
    .select("id, nombres, apellidos, turnos(nombre)")
    .eq("estado", "activo")
    .order("apellidos");

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as Array<{
    id: string;
    nombres: string;
    apellidos: string;
    turnos?: { nombre?: string } | null;
  }>).map((row) => ({
    id: row.id,
    nombres: row.nombres,
    apellidos: row.apellidos,
    turno_txt: row.turnos?.nombre ?? null,
  }));
}
