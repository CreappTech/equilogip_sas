"use client";

import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useAppForm } from "@/lib/forms/useAppForm";
import { actualizarConfiguracion } from "@/features/mantenimiento/actions/config";
import { configuracionSchema } from "@/features/mantenimiento/schemas/configuracionSchema";

interface ConfiguracionClientProps {
  tiempoMinimoSegundos: number;
}

export default function ConfiguracionClient({
  tiempoMinimoSegundos,
}: ConfiguracionClientProps) {
  const router = useRouter();
  const toast = useToast();
  const mutation = useResourceMutation(actualizarConfiguracion);

  const form = useAppForm(configuracionSchema, {
    defaultValues: { tiempo_minimo_segundos: tiempoMinimoSegundos },
  });

  const { register, handleSubmit, formState } = form;

  async function onGuardar(values: { tiempo_minimo_segundos: number }) {
    const result = await mutation.mutate(values);
    if (!result.ok) {
      toast.error("No se pudo guardar", result.error);
      return;
    }
    toast.success(
      "Configuración actualizada",
      `Tiempo mínimo: ${values.tiempo_minimo_segundos} segundos.`
    );
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Configuración de mantenimiento"
        description="Parámetros globales del checklist preoperacional"
      />

      <ComponentCard
        title="Detección de inspección exprés"
        desc="Una inspección se marca como exprés cuando tarda menos que este tiempo."
      >
        <Form onSubmit={handleSubmit((values) => void onGuardar(values))}>
          <div className="max-w-sm space-y-4">
            <FormField
              label="Tiempo mínimo (segundos)"
              htmlFor="config-tiempo"
              required
              error={formState.errors.tiempo_minimo_segundos?.message}
              hint={`Equivale a ${Math.round(
                (form.watch("tiempo_minimo_segundos") || tiempoMinimoSegundos) / 60
              )} minuto(s)`}
            >
              <Input
                id="config-tiempo"
                type="number"
                min={10}
                step={10}
                {...register("tiempo_minimo_segundos")}
                error={Boolean(formState.errors.tiempo_minimo_segundos)}
              />
            </FormField>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={mutation.status === "submitting"}
              >
                {mutation.status === "submitting"
                  ? "Guardando…"
                  : "Guardar configuración"}
              </Button>
            </div>
          </div>
        </Form>
      </ComponentCard>
    </div>
  );
}