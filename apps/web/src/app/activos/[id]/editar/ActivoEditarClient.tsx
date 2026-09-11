"use client";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import ActivoForm from "../../ActivoForm";
import type { ActivoFormValues } from "@/features/activos/schemas/activoFormSchema";
import type {
  CentroServicio,
  ProveedorSubarriendo,
} from "@/features/activos/types/activo.types";

interface ActivoEditarClientProps {
  id: string;
  tipoLabel: string;
  initialValues: Partial<ActivoFormValues>;
  datosTecnicos?: Record<string, string | string[]>;
  datosFabricante?: Record<string, string>;
  centros?: CentroServicio[];
  proveedores?: ProveedorSubarriendo[];
}

export default function ActivoEditarClient({
  id,
  tipoLabel,
  initialValues,
  datosTecnicos,
  datosFabricante,
  centros = [],
  proveedores = [],
}: ActivoEditarClientProps) {
  return (
    <div>
      <PageHeader
        title="Editar activo"
        description={`Actualizando ${tipoLabel}.`}
      />

      <ComponentCard title="Información del activo">
        <ActivoForm
          mode="edit"
          activoId={id}
          initialValues={initialValues}
          datosTecnicos={datosTecnicos}
          datosFabricante={datosFabricante}
          centros={centros}
          proveedores={proveedores}
        />
      </ComponentCard>
    </div>
  );
}