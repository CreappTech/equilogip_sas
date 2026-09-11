"use client";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import ActivoForm from "../ActivoForm";
import type {
  CentroServicio,
  ProveedorSubarriendo,
  SubtipoActivoOpcion,
} from "@/features/activos/types/activo.types";

interface ActivoNuevoClientProps {
  centros?: CentroServicio[];
  proveedores?: ProveedorSubarriendo[];
  subtipos?: SubtipoActivoOpcion[];
}

export default function ActivoNuevoClient({
  centros = [],
  proveedores = [],
  subtipos = [],
}: ActivoNuevoClientProps) {
  return (
    <div>
      <PageHeader
        title="Nuevo activo"
        description="Registra un vehículo, maquinaria o equipo en el sistema."
      />

      <ComponentCard title="Información del activo">
        <ActivoForm mode="create" centros={centros} proveedores={proveedores} subtipos={subtipos} />
      </ComponentCard>
    </div>
  );
}