"use client";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DotacionForm from "../../DotacionForm";
import type { EmpleadoDotacionOpcion } from "@/features/dotacion/types/dotacion.types";
import type { DotacionFormProps } from "../../DotacionForm";

interface DotacionEditarClientProps {
  id: string;
  initialValues: DotacionFormProps["initialValues"] &
    Required<Pick<NonNullable<DotacionFormProps["initialValues"]>, "lineas">>;
  empleados: EmpleadoDotacionOpcion[];
}

export default function DotacionEditarClient({
  id,
  initialValues,
  empleados = [],
}: DotacionEditarClientProps) {
  return (
    <div>
      <PageHeader
        title="Editar entrega"
        description="La firma y las evidencias quedan intactas (auditoría)."
      />

      <ComponentCard title="Datos de la entrega">
        <DotacionForm
          mode="edit"
          entregaId={id}
          initialValues={initialValues}
          empleados={empleados}
        />
      </ComponentCard>
    </div>
  );
}