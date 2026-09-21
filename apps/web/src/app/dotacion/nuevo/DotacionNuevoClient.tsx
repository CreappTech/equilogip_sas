"use client";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DotacionForm from "../DotacionForm";
import type { EmpleadoDotacionOpcion } from "@/features/dotacion/types/dotacion.types";

interface DotacionNuevoClientProps {
  empleados?: EmpleadoDotacionOpcion[];
}

export default function DotacionNuevoClient({
  empleados = [],
}: DotacionNuevoClientProps) {
  return (
    <div>
      <PageHeader
        title="Nueva entrega"
        description="Registra una entrega de dotación con su evidencia y firma."
      />

      <ComponentCard title="Entrega de dotación">
        <DotacionForm mode="create" empleados={empleados} />
      </ComponentCard>
    </div>
  );
}