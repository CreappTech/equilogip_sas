import { createClient } from "@/lib/supabase/server";
import { nombreActivo, tipoARecurso, type TipoActivo } from "@/features/activos/types/activo.types";
import type {
  ActivoOperativoOpcion,
  UnidadLectura,
} from "../types/mantenimiento.types";

/**
 * Equipos disponibles para iniciar una inspección: ciclo de vida `activo` y
 * estado operativo `OPERATIVA`. La unidad de lectura se deriva del tipo
 * (vehículo -> kilometraje, maquinaria/equipo -> horómetro).
 */
export async function listActivosOperativos(): Promise<ActivoOperativoOpcion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activos")
    .select(
      `id, tipo, codigo_interno, nombre, subtipo,
       ${tipoARecurso("vehiculo")}(marca, modelo),
       ${tipoARecurso("maquina")}(marca, modelo),
       ${tipoARecurso("equipo")}(marca, modelo)`
    )
    .eq("estado", "activo")
    .eq("estado_operativo", "OPERATIVA");

  if (error) throw new Error(error.message);

  const filas = data ?? [];

  const resultado: ActivoOperativoOpcion[] = filas.map((fila) => {
    const raw = fila as unknown as {
      id: string;
      tipo: TipoActivo;
      codigo_interno: string;
      nombre: string | null;
      subtipo: ActivoOperativoOpcion["subtipo"];
      vehiculos: { marca: string | null; modelo: string | null }[] | null;
      maquinas: { marca: string | null; modelo: string | null }[] | null;
      equipos: { marca: string | null; modelo: string | null }[] | null;
    };
    const especialidad =
      raw.vehiculos?.[0] ?? raw.maquinas?.[0] ?? raw.equipos?.[0];

    const unidad: UnidadLectura =
      raw.tipo === "vehiculo" ? "kilometraje" : "horometro";

    return {
      id: raw.id,
      codigo_interno: raw.codigo_interno,
      nombre: nombreActivo({
        nombre: raw.nombre,
        marca: especialidad?.marca ?? null,
        modelo: especialidad?.modelo ?? null,
      }),
      tipo: raw.tipo,
      subtipo: raw.subtipo,
      lectura_unidad: unidad,
    };
  });

  resultado.sort((a, b) =>
    `${a.codigo_interno} ${a.nombre}`.localeCompare(`${b.codigo_interno} ${b.nombre}`)
  );

  return resultado;
}