import { createClient } from "@/lib/supabase/server";
import type {
  ActivoDetalle,
  ActivoRow,
  EquipoRow,
  MaquinaRow,
  TipoActivo,
  VehiculoRow,
} from "../types/activo.types";

const CAMPOS_SELECCION = [
  "id",
  "tipo",
  "codigo_interno",
  "nombre",
  "estado",
  "subtipo",
  "estado_operativo",
  "fecha_adquisicion",
  "color",
  "numero_motor",
  "lectura_inicial",
  "serie",
  "origen",
  "centro_servicio_id",
  "proveedor_id",
  "datos_tecnicos",
  "datos_fabricante",
  "created_at",
  "updated_at",
] as const;

export async function getActivoDetalle(
  id: string
): Promise<ActivoDetalle | null> {
  const supabase = await createClient();

  const { data: activo, error } = await supabase
    .from("activos")
    .select(CAMPOS_SELECCION.join(","))
    .eq("id", id)
    .single();

  if (error || !activo) return null;

  const fila = activo as unknown as ActivoRow;
  const tipo = fila.tipo as TipoActivo;
  const detalle: ActivoDetalle = { activo: fila };

  const tabla =
    tipo === "vehiculo" ? "vehiculos" : tipo === "maquina" ? "maquinas" : "equipos";

  const { data: especialidad, error: errorEspecialidad } = await supabase
    .from(tabla)
    .select("*")
    .eq("activo_id", id)
    .single();

  if (especialidad && !errorEspecialidad) {
    if (tipo === "vehiculo") detalle.vehiculo = especialidad as VehiculoRow;
    else if (tipo === "maquina") detalle.maquina = especialidad as MaquinaRow;
    else detalle.equipo = especialidad as EquipoRow;
  }

  const [centro, proveedor] = await Promise.all([
    fila.centro_servicio_id
      ? supabase
          .from("centros_servicio")
          .select("nombre")
          .eq("id", fila.centro_servicio_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    fila.proveedor_id
      ? supabase
          .from("proveedores")
          .select("nombre")
          .eq("id", fila.proveedor_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  detalle.centro_servicio_nombre = (centro.data?.nombre as string | null) ?? null;
  detalle.proveedor_nombre = (proveedor.data?.nombre as string | null) ?? null;

  return detalle;
}