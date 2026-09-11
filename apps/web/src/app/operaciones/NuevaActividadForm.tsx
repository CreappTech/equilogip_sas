"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller } from "react-hook-form";

import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Select from "@/components/form/Select";
import Combobox from "@/components/form/Combobox";
import Button from "@/components/ui/button/Button";
import { useAppForm } from "@/lib/forms/useAppForm";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useToast } from "@/components/ui/toast/ToastProvider";
import {
  actividadFormSchema,
  type ActividadFormValues,
} from "@/features/operaciones/schemas/actividadFormSchema";
import { crearActividad } from "@/features/operaciones/actions/crearActividad";
import { nombreEmpleado } from "@/features/empleados/types/empleado.types";
import { nombreActivo } from "@/features/activos/types/activo.types";
import type {
  ActivoOpcion,
  ClienteOpcion,
  CrearActividadResultado,
  EmpleadoOpcion,
  TipoActividadOpcion,
} from "@/features/operaciones/types/operaciones.types";

interface NuevaActividadFormProps {
  empleados: EmpleadoOpcion[];
  activos: ActivoOpcion[];
  tipos: TipoActividadOpcion[];
  clientes: ClienteOpcion[];
}

export default function NuevaActividadForm({
  empleados = [],
  activos = [],
  tipos = [],
  clientes = [],
}: NuevaActividadFormProps) {
  const router = useRouter();
  const toast = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useAppForm(actividadFormSchema, {
    defaultValues: {
      operador_id: "",
      tipo_actividad_id: "",
      activo_id: "",
      cliente_id: "",
    },
  });

  const mutation = useResourceMutation<ActividadFormValues, CrearActividadResultado>(
    crearActividad
  );

  const empleadoOptions = empleados.map((empleado) => ({
    value: empleado.id,
    label: nombreEmpleado({
      nombres: empleado.nombres,
      apellidos: empleado.apellidos,
    }),
  }));

  const activoOptions = activos.map((activo) => ({
    value: activo.id,
    label: `${activo.codigo_interno} — ${nombreActivo({
      nombre: activo.nombre,
      marca: activo.marca,
      modelo: activo.modelo,
    })}`,
  }));

  async function onSubmit(values: ActividadFormValues) {
    const result = await mutation.mutate(values);
    if (result.ok) {
      toast.success(
        "Servicio planeado",
        "El servicio se planeó correctamente."
      );
      router.replace(`/operaciones/${result.extra.actividadId}`);
      router.refresh();
    } else {
      toast.error("No se pudo planear el servicio", result.error);
    }
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Planeación del servicio
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="tipo_actividad_id"
            render={({ field }) => (
              <FormField
                label="Actividad"
                htmlFor="tipo_actividad_id"
                required
                error={errors.tipo_actividad_id?.message}
              >
                <Select
                  placeholder={
                    tipos.length
                      ? "Selecciona la actividad"
                      : "No hay actividades registradas"
                  }
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  disabled={tipos.length === 0}
                  options={tipos.map((tipo) => ({
                    value: tipo.id,
                    label: tipo.nombre,
                  }))}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="activo_id"
            render={({ field }) => (
              <FormField
                label="Equipo"
                htmlFor="activo_id"
                required
                error={errors.activo_id?.message}
              >
                <Combobox
                  id="activo_id"
                  name={field.name}
                  options={activoOptions}
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={Boolean(errors.activo_id)}
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
            name="operador_id"
            render={({ field }) => (
              <FormField
                label="Operador"
                htmlFor="operador_id"
                required
                error={errors.operador_id?.message}
              >
                <Combobox
                  id="operador_id"
                  name={field.name}
                  options={empleadoOptions}
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  error={Boolean(errors.operador_id)}
                  placeholder={
                    empleadoOptions.length
                      ? "Busca y selecciona el operador"
                      : "No hay operadores disponibles"
                  }
                />
              </FormField>
            )}
          />

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
                  options={clientes.map((cliente) => ({
                    value: cliente.id,
                    label: cliente.nombre,
                  }))}
                />
              </FormField>
            )}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={mutation.status === "submitting"}>
          {mutation.status === "submitting" ? "Planeando..." : "Planear servicio"}
        </Button>
        <Link href="/operaciones">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </Form>
  );
}