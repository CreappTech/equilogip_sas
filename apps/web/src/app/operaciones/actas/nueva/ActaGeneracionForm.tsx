"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller } from "react-hook-form";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Select from "@/components/form/Select";
import Combobox from "@/components/form/Combobox";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useAppForm } from "@/lib/forms/useAppForm";
import { nombreActivo } from "@/features/activos/types/activo.types";
import {
  actaGeneracionSchema,
  type ActaGeneracionValues,
} from "@/features/operaciones/schemas/actaGeneracionSchema";
import type {
  ActivoOpcion,
  ClienteOpcion,
} from "@/features/operaciones/types/operaciones.types";

interface ActaGeneracionFormProps {
  clientes: ClienteOpcion[];
  activos: ActivoOpcion[];
}

export default function ActaGeneracionForm({
  clientes = [],
  activos = [],
}: ActaGeneracionFormProps) {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useAppForm(actaGeneracionSchema, {
    defaultValues: {
      cliente_id: "",
      equipo_id: "",
      fecha_desde: "",
      fecha_hasta: "",
    },
  });

  const activoOptions = activos.map((activo) => ({
    value: activo.id,
    label: `${activo.codigo_interno} — ${nombreActivo({
      nombre: activo.nombre,
      marca: activo.marca,
      modelo: activo.modelo,
    })}`,
  }));

  function onSubmit(values: ActaGeneracionValues) {
    const params = new URLSearchParams({
      cliente: values.cliente_id,
      equipo: values.equipo_id,
      desde: values.fecha_desde,
      hasta: values.fecha_hasta,
    });
    router.push(`/operaciones/actas/preview?${params.toString()}`);
  }

  return (
    <div>
      <PageHeader
        title="Nueva acta de servicio"
        description="Selecciona el cliente, el equipo y el periodo del acta."
      />

      <ComponentCard title="Generar acta">
        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Controller
              control={control}
              name="cliente_id"
              render={({ field }) => (
                <FormField
                  label="Cliente"
                  htmlFor="cliente_id"
                  required
                  error={errors.cliente_id?.message}
                >
                  <Select
                    placeholder={
                      clientes.length
                        ? "Selecciona el cliente"
                        : "No hay clientes registrados"
                    }
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    onBlur={field.onBlur}
                    disabled={clientes.length === 0}
                    options={clientes.map((c) => ({
                      value: c.id,
                      label: c.nombre,
                    }))}
                  />
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="equipo_id"
              render={({ field }) => (
                <FormField
                  label="Equipo"
                  htmlFor="equipo_id"
                  required
                  error={errors.equipo_id?.message}
                >
                  <Combobox
                    id="equipo_id"
                    name={field.name}
                    options={activoOptions}
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    error={Boolean(errors.equipo_id)}
                    placeholder={
                      activoOptions.length
                        ? "Busca y selecciona el equipo"
                        : "No hay equipos disponibles"
                    }
                  />
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="fecha_desde"
              render={({ field }) => (
                <FormField
                  label="Periodo desde"
                  htmlFor="fecha_desde"
                  required
                  error={errors.fecha_desde?.message}
                >
                  <Input
                    id="fecha_desde"
                    type="date"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="fecha_hasta"
              render={({ field }) => (
                <FormField
                  label="Periodo hasta"
                  htmlFor="fecha_hasta"
                  required
                  error={errors.fecha_hasta?.message}
                >
                  <Input
                    id="fecha_hasta"
                    type="date"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormField>
              )}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">Generar acta</Button>
            <Link href="/operaciones/actas">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </Form>
      </ComponentCard>
    </div>
  );
}