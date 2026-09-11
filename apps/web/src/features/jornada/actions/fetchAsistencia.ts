"use server";

import { requireUser } from "@/lib/auth/permisos";
import { requierePermisoJornada } from "./shared";
import { permisoJornada } from "../types/jornada.types";
import {
  listarAsistenciaDelDia as queryAsistencia,
  type FiltrosAsistencia,
} from "../queries/listarAsistencia";
import type { ListadoAsistencia } from "../types/jornada.types";

export async function fetchAsistenciaDelDia(
  filtros: FiltrosAsistencia
): Promise<ListadoAsistencia[]> {
  await requireUser();
  if (!(await requierePermisoJornada(permisoJornada("ver")))) {
    return [];
  }
  return queryAsistencia(filtros);
}
