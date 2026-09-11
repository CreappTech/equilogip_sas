"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/permisos";
import { vehiculoSchema } from "../schemas/vehiculoSchema";
import {
  actualizarActivoEspecialidad,
  autorizar,
  derivarNombre,
  emptyToNull,
} from "./shared";
import type { ResultadoActivo } from "../types/activo.types";

const vehiculoUpdateSchema = vehiculoSchema.and(
  z.object({ id: z.string().uuid("Activo inválido.") })
);

export type VehiculoUpdateInput = z.infer<typeof vehiculoUpdateSchema>;

export async function updateVehiculo(
  input: VehiculoUpdateInput
): Promise<ResultadoActivo> {
  await requireUser();
  if (!(await autorizar("activos.vehiculos.editar"))) {
    return { ok: false, error: "No tienes permiso para editar vehículos." };
  }

  const parsed = vehiculoUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const data = parsed.data;

  return actualizarActivoEspecialidad(
    "vehiculo",
    data.id,
    {
      codigo_interno: data.codigo_interno,
      nombre: derivarNombre(data.marca, data.modelo),
      estado: data.estado ?? "activo",
      subtipo: data.subtipo,
      estado_operativo: data.estado_operativo ?? "OPERATIVA",
      fecha_adquisicion: emptyToNull(data.fecha_adquisicion),
      color: emptyToNull(data.color),
      numero_motor: emptyToNull(data.numero_motor),
      lectura_inicial: data.lectura_inicial ?? null,
      serie: emptyToNull(data.serie),
      origen: data.origen ?? "PROPIA",
      centro_servicio_id: data.centro_servicio_id,
      proveedor_id: data.proveedor_id ?? null,
      datos_tecnicos: data.datos_tecnicos,
      datos_fabricante: data.datos_fabricante,
    },
    {
      placa: data.placa,
      marca: data.marca,
      modelo: data.modelo,
      anio: data.anio ?? null,
    }
  );
}