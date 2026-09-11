import { listActivos } from "./listActivos";
import type { ListadoActivo, TipoActivo } from "../types/activo.types";

export async function listPorTipo(
  tipo: TipoActivo
): Promise<ListadoActivo[]> {
  return listActivos({ tipo });
}

export async function listVehiculos(): Promise<ListadoActivo[]> {
  return listPorTipo("vehiculo");
}

export async function listMaquinas(): Promise<ListadoActivo[]> {
  return listPorTipo("maquina");
}

export async function listEquipos(): Promise<ListadoActivo[]> {
  return listPorTipo("equipo");
}