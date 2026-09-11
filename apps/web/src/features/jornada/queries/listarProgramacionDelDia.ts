import { createClient } from "@/lib/supabase/server";
import type { ListadoProgramacion } from "../types/jornada.types";

export type FiltrosProgramacionDia = {
  fecha: string;
  centro_servicio_id?: string;
};

const CAMPOS = [
  "id",
  "operador_id",
  "fecha",
  "hora_inicio_programada",
  "hora_fin_programada",
  "turno_id",
  "centro_servicio_id",
  "creado_por",
  "created_at",
  "updated_at",
] as const;

export async function listarProgramacionDelDia(
  filtros: FiltrosProgramacionDia
): Promise<ListadoProgramacion[]> {
  const supabase = await createClient();

  let query = supabase
    .from("jornada_programacion")
    .select(
      `${CAMPOS.join(",")},empleados(nombres,apellidos),turnos(nombre),centros_servicio(nombre)`
    )
    .eq("fecha", filtros.fecha)
    .order("hora_inicio_programada");

  if (filtros.centro_servicio_id) {
    query = query.eq("centro_servicio_id", filtros.centro_servicio_id);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  type RawRow = Record<string, unknown> & {
    empleados?: { nombres?: string; apellidos?: string } | null;
    turnos?: { nombre?: string } | null;
    centros_servicio?: { nombre?: string } | null;
  };

  const lista: ListadoProgramacion[] = ((data ?? []) as unknown as RawRow[]).map(
    (row) => {
      const emp = row.empleados;
      const turno = row.turnos;
      const cs = row.centros_servicio;
      return {
        id: row.id as string,
        operador_id: row.operador_id as string,
        fecha: row.fecha as string,
        hora_inicio_programada: row.hora_inicio_programada as string,
        hora_fin_programada: row.hora_fin_programada as string,
        turno_id: row.turno_id as string | null,
        centro_servicio_id: row.centro_servicio_id as string | null,
        creado_por: row.creado_por as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        operador_nombre: emp
          ? `${emp.nombres ?? ""} ${emp.apellidos ?? ""}`.trim()
          : null,
        turno_nombre: turno?.nombre ?? null,
        centro_servicio_nombre: cs?.nombre ?? null,
      };
    }
  );

  return lista;
}
