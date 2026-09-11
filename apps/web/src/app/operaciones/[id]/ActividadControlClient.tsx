"use client";

import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/ui/button/Button";
import type {
  CausalPausaOpcion,
  DetalleActividad,
} from "@/features/operaciones/types/operaciones.types";
import ActividadControlCard from "./ActividadControlCard";

interface ActividadControlClientProps {
  detalle: DetalleActividad;
  causales: CausalPausaOpcion[];
}

export default function ActividadControlClient({
  detalle,
  causales,
}: ActividadControlClientProps) {
  return (
    <div>
      <PageHeader
        title="Control de actividad"
        description="Inicia, pausa, reanuda o finaliza la actividad y consulta su bitácora."
        actions={
          <Link href="/operaciones">
            <Button variant="outline">Volver al listado</Button>
          </Link>
        }
      />

      <ActividadControlCard detalle={detalle} causales={causales} />
    </div>
  );
}