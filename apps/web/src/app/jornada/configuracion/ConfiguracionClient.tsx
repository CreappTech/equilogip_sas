"use client";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import EmptyState from "@/components/ui/states/EmptyState";
import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Input from "@/components/form/input/InputField";
import { useAppForm } from "@/lib/forms/useAppForm";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { editarConfiguracionJornada } from "@/features/jornada/actions/editarConfiguracion";
import {
  configuracionJornadaSchema,
  type ConfiguracionJornadaInput,
} from "@/features/jornada/schemas/jornadaSchema";
import type { ConfiguracionJornada } from "@/features/jornada/types/jornada.types";

interface ConfiguracionClientProps {
  initialConfig: ConfiguracionJornada | null;
  permisos?: string[];
}

export default function ConfiguracionClient({
  initialConfig,
  permisos: permisosServidor = [],
}: ConfiguracionClientProps) {
  const toast = useToast();

  const puedeEditar =
    permisosServidor.includes("*") ||
    permisosServidor.includes("jornada.configuracion.editar");

  const mutation = useResourceMutation(editarConfiguracionJornada);

  const { register, handleSubmit, formState: { errors } } =
    useAppForm(configuracionJornadaSchema, {
      defaultValues: {
        hora_inicio_nocturna: initialConfig?.hora_inicio_nocturna ?? "21:00",
        hora_fin_nocturna: initialConfig?.hora_fin_nocturna ?? "06:00",
        horas_jornada_ordinaria: initialConfig?.horas_jornada_ordinaria ?? 8,
      },
    });

  async function onSubmit(data: ConfiguracionJornadaInput) {
    const result = await mutation.mutate(data);
    if (result.ok) {
      toast.success("Configuración actualizada", "Se guardaron los cambios correctamente.");
    } else {
      toast.error("Error", result.error);
    }
  }

  return (
    <div>
      <PageHeader
        title="Configuración de Jornada"
        description="Parametros de horario nocturno y jornada ordinaria."
      />

      {!initialConfig ? (
        <EmptyState
          title="Sin configuración"
          description="No se encontró la configuración de jornada para tu tenant."
        />
      ) : (
        <ComponentCard title="Parámetros de jornada">
          <Form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-6">
            <FormField
              label="Hora inicio nocturna"
              htmlFor="hora_inicio_nocturna"
              required
              error={errors.hora_inicio_nocturna?.message}
              hint="Hora a partir de la cual aplica el recargo nocturno."
            >
              <Input
                id="hora_inicio_nocturna"
                type="time"
                {...register("hora_inicio_nocturna")}
                error={Boolean(errors.hora_inicio_nocturna)}
              />
            </FormField>

            <FormField
              label="Hora fin nocturna"
              htmlFor="hora_fin_nocturna"
              required
              error={errors.hora_fin_nocturna?.message}
              hint="Hora hasta la cual aplica el recargo nocturno."
            >
              <Input
                id="hora_fin_nocturna"
                type="time"
                {...register("hora_fin_nocturna")}
                error={Boolean(errors.hora_fin_nocturna)}
              />
            </FormField>

            <FormField
              label="Horas jornada ordinaria"
              htmlFor="horas_jornada_ordinaria"
              required
              error={errors.horas_jornada_ordinaria?.message}
              hint="Número de horas que dura la jornada ordinaria."
            >
              <Input
                id="horas_jornada_ordinaria"
                type="number"
                step={0.5}
                min={1}
                max={24}
                {...register("horas_jornada_ordinaria", { valueAsNumber: true })}
                error={Boolean(errors.horas_jornada_ordinaria)}
              />
            </FormField>

            {puedeEditar && (
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={mutation.status === "submitting"}
                >
                  {mutation.status === "submitting" ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            )}
          </Form>
        </ComponentCard>
      )}
    </div>
  );
}
