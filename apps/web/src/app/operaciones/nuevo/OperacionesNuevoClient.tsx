"use client";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import NuevaActividadForm from "../NuevaActividadForm";
import type {
  ActivoOpcion,
  ClienteOpcion,
  EmpleadoOpcion,
  TipoActividadOpcion,
} from "@/features/operaciones/types/operaciones.types";

interface OperacionesNuevoClientProps {
  empleados: EmpleadoOpcion[];
  activos: ActivoOpcion[];
  tipos: TipoActividadOpcion[];
  clientes: ClienteOpcion[];
}

export default function OperacionesNuevoClient({
  empleados = [],
  activos = [],
  tipos = [],
  clientes = [],
}: OperacionesNuevoClientProps) {
  return (
    <div>
      <PageHeader
        title="Planear servicio"
        description="Planea un servicio seleccionando la actividad, el equipo, el operador y el cliente."
      />

      <ComponentCard title="Planeación del servicio">
        <NuevaActividadForm
          empleados={empleados}
          activos={activos}
          tipos={tipos}
          clientes={clientes}
        />
      </ComponentCard>
    </div>
  );
}