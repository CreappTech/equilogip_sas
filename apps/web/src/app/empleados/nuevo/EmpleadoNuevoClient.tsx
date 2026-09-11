"use client";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import EmpleadoForm from "../EmpleadoForm";
import type {
  CargoOpcion,
  RrhhOpcion,
  TurnoOpcion,
} from "@/features/empleados/types/empleado.types";

interface EmpleadoNuevoClientProps {
  cargos?: CargoOpcion[];
  eps?: RrhhOpcion[];
  arl?: RrhhOpcion[];
  fondosPension?: RrhhOpcion[];
  bancos?: RrhhOpcion[];
  turnos?: TurnoOpcion[];
}

export default function EmpleadoNuevoClient({
  cargos = [],
  eps = [],
  arl = [],
  fondosPension = [],
  bancos = [],
  turnos = [],
}: EmpleadoNuevoClientProps) {
  return (
    <div>
      <PageHeader
        title="Nuevo empleado"
        description="Registra un empleado en el sistema."
      />

      <ComponentCard title="Información del empleado">
        <EmpleadoForm
          mode="create"
          cargos={cargos}
          eps={eps}
          arl={arl}
          fondosPension={fondosPension}
          bancos={bancos}
          turnos={turnos}
        />
      </ComponentCard>
    </div>
  );
}