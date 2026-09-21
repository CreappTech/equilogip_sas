import { createClient } from "@/lib/supabase/server";
import { tipoARecurso, type TipoActivo } from "@/features/activos/types/activo.types";
import type { InspeccionFila } from "../types/mantenimiento.types";

const CAMPOS_INSPECCION = [
  "id",
  "activo_id",
  "operador_id",
  "lectura",
  "lectura_unidad",
  "nivel_combustible",
  "nivel_aceite",
  "estado",
  "iniciada_en",
  "finalizada_en",
  "tiempo_segundos",
  "es_express",
  "puntajes",
  "created_at",
] as const;

export async function listInspecciones(): Promise<InspeccionFila[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("mantenimiento_inspecciones")
    .select(
      `${CAMPOS_INSPECCION.join(",")},
       operador:profiles(nombres, apellidos)`
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const filas = (data ?? []) as unknown as Array<
    Record<(typeof CAMPOS_INSPECCION)[number], unknown> & {
      operador: { nombres: string | null; apellidos: string | null } | null;
    }
  >;

  const ids = [...new Set(filas.map((f) => f.activo_id as string))];

  const mapaActivos = new Map<string, { codigo_interno: string; nombre: string }>();
  if (ids.length > 0) {
    const { data: activos } = await supabase
      .from("activos")
      .select(
        `id, codigo_interno, nombre, tipo,
         ${tipoARecurso("vehiculo")}(marca, modelo),
         ${tipoARecurso("maquina")}(marca, modelo),
         ${tipoARecurso("equipo")}(marca, modelo)`
      )
      .in("id", ids);

    for (const fila of activos ?? []) {
      const raw = fila as unknown as {
        id: string;
        codigo_interno: string;
        nombre: string | null;
        tipo: TipoActivo;
        vehiculos: { marca: string | null; modelo: string | null }[] | null;
        maquinas: { marca: string | null; modelo: string | null }[] | null;
        equipos: { marca: string | null; modelo: string | null }[] | null;
      };
      const especialidad =
        raw.vehiculos?.[0] ?? raw.maquinas?.[0] ?? raw.equipos?.[0];
      const derivado = [especialidad?.marca, especialidad?.modelo]
        .filter(Boolean)
        .join(" ");
      mapaActivos.set(raw.id, {
        codigo_interno: raw.codigo_interno,
        nombre: raw.nombre ?? (derivado || raw.codigo_interno),
      });
    }
  }

  const lista: InspeccionFila[] = filas.map((fila) => {
    const activo = mapaActivos.get(fila.activo_id as string);
    const operador = fila.operador;
    const nombreOperador = operador
      ? `${operador.nombres ?? ""} ${operador.apellidos ?? ""}`.trim()
      : null;

    return {
      id: fila.id as string,
      activo_id: fila.activo_id as string,
      operador_id: fila.operador_id as string,
      lectura: fila.lectura as number,
      lectura_unidad: fila.lectura_unidad as InspeccionFila["lectura_unidad"],
      nivel_combustible: fila.nivel_combustible as InspeccionFila["nivel_combustible"],
      nivel_aceite: fila.nivel_aceite as InspeccionFila["nivel_aceite"],
      estado: fila.estado as InspeccionFila["estado"],
      iniciada_en: fila.iniciada_en as string,
      finalizada_en: (fila.finalizada_en as string | null) ?? null,
      tiempo_segundos: (fila.tiempo_segundos as number | null) ?? null,
      es_express: (fila.es_express as boolean) ?? false,
      puntajes: (fila.puntajes as InspeccionFila["puntajes"]) ?? {},
      activo_codigo: activo?.codigo_interno ?? null,
      activo_nombre: activo?.nombre ?? null,
      operador_nombre: nombreOperador || null,
      rutinas_activadas: [],
    };
  });

  return lista;
}