"use server";

import { requireUser } from "@/lib/auth/permisos";
import { requierePermisoJornada } from "./shared";
import { permisoJornada } from "../types/jornada.types";
import {
  listarProgramacionSemanal as querySemanal,
  type FiltrosProgramacionSemanal,
} from "../queries/listarProgramacionSemanal";
import type { ListadoProgramacion } from "../types/jornada.types";

export async function fetchProgramacionSemanal(
  filtros: FiltrosProgramacionSemanal
): Promise<ListadoProgramacion[]> {
  await requireUser();
  if (!(await requierePermisoJornada(permisoJornada("ver")))) {
    return [];
  }
  return querySemanal(filtros);
}
