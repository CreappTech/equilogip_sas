"use client";

import { Controller } from "react-hook-form";

import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useAppForm } from "@/lib/forms/useAppForm";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import {
  pausaSchema,
  type PausaFormValues,
} from "@/features/operaciones/schemas/pausaSchema";
import { registrarPausa } from "@/features/operaciones/actions/registrarEventos";
import type { CausalPausaOpcion } from "@/features/operaciones/types/operaciones.types";

interface PausaModalProps {
  actividadId: string;
  causales: CausalPausaOpcion[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PausaModal({
  actividadId,
  causales,
  isOpen,
  onClose,
  onSuccess,
}: PausaModalProps) {
  const toast = useToast();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useAppForm(pausaSchema, {
    defaultValues: { causal_id: "", observaciones: "" },
  });

  const mutation = useResourceMutation<PausaFormValues>((input) =>
    registrarPausa(actividadId, input)
  );

  async function onSubmit(values: PausaFormValues) {
    const result = await mutation.mutate(values);
    if (result.ok) {
      toast.success("Pausa registrada", "La actividad quedó en pausa.");
      reset();
      onClose();
      onSuccess();
    } else {
      toast.error("No se pudo pausar la actividad", result.error);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6">
      <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
        Registrar pausa
      </h3>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Indica la causal y describe la novedad o limitación.
      </p>

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          control={control}
          name="causal_id"
          render={({ field }) => (
            <FormField
              label="Causal"
              htmlFor="causal_id"
              required
              error={errors.causal_id?.message}
            >
              <Select
                placeholder={
                  causales.length
                    ? "Selecciona una causal"
                    : "No hay causales registradas"
                }
                value={field.value}
                onChange={(value) => field.onChange(value)}
                onBlur={field.onBlur}
                disabled={causales.length === 0}
                options={causales.map((c) => ({
                  value: c.id,
                  label: c.nombre,
                }))}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="observaciones"
          render={({ field }) => (
            <FormField
              label="Observaciones"
              htmlFor="observaciones"
              required
              error={errors.observaciones?.message}
            >
              <TextArea
                placeholder="Describe la novedad..."
                rows={3}
                value={field.value}
                onChange={(value) => field.onChange(value)}
                error={Boolean(errors.observaciones)}
              />
            </FormField>
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.status === "submitting"}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.status === "submitting"}>
            {mutation.status === "submitting"
              ? "Registrando..."
              : "Registrar pausa"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}