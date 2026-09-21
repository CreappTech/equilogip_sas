"use client";

import { useEffect } from "react";

import { Modal } from "@/components/ui/modal";
import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Switch from "@/components/form/switch/Switch";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import { useAppForm } from "@/lib/forms/useAppForm";
import { preguntaSchema, type PreguntaFormValues } from "@/features/mantenimiento/schemas/preguntaSchema";
import type { CategoriaMantenimiento, PreguntaMantenimiento } from "@/features/mantenimiento/types/mantenimiento.types";

interface PreguntaFormModalProps {
  open: boolean;
  pregunta: PreguntaMantenimiento | null;
  categorias: CategoriaMantenimiento[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: PreguntaFormValues) => Promise<void>;
}

export function PreguntaFormModal({
  open,
  pregunta,
  categorias,
  submitting,
  error,
  onClose,
  onSave,
}: PreguntaFormModalProps) {
  const form = useAppForm(preguntaSchema, {
    defaultValues: {
      categoria_id: "",
      tipo_activo: "ambos",
      texto: "",
      orden: 0,
      activo: true,
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState } = form;
  const activo = watch("activo");

  useEffect(() => {
    if (!open) return;
    if (pregunta) {
      reset({
        categoria_id: pregunta.categoria_id,
        tipo_activo: pregunta.tipo_activo,
        texto: pregunta.texto,
        orden: pregunta.orden,
        activo: pregunta.activo,
      });
    } else {
      reset({
        categoria_id: "",
        tipo_activo: "ambos",
        texto: "",
        orden: 0,
        activo: true,
      });
    }
  }, [open, pregunta, categorias, reset]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      className="max-w-lg p-6"
    >
      <div>
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          {pregunta ? "Editar pregunta" : "Nueva pregunta"}
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Define el control preoperacional que se mostrará en el checklist.
        </p>

        {error && (
          <div className="mb-4">
            <Alert variant="error" title="No se pudo guardar" message={error} />
          </div>
        )}

        <Form onSubmit={handleSubmit((values) => void onSave(values))}>
          <div className="space-y-4">
            <FormField
              label="Categoría"
              htmlFor="pregunta-categoria"
              required
              error={formState.errors.categoria_id?.message}
            >
              <Select
                value={watch("categoria_id")}
                onChange={(value) => setValue("categoria_id", value, { shouldValidate: true })}
                placeholder="Selecciona la categoría"
                options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
                className="w-full"
              />
            </FormField>

            <FormField
              label="Aplica a"
              htmlFor="pregunta-tipo"
              required
              error={formState.errors.tipo_activo?.message}
            >
              <Select
                value={watch("tipo_activo")}
                onChange={(value) =>
                  setValue("tipo_activo", value as never, { shouldValidate: true })
                }
                placeholder="Tipo de equipo"
                options={[
                  { value: "vehiculo", label: "Vehículo" },
                  { value: "maquina", label: "Maquinaria" },
                  { value: "ambos", label: "Ambos" },
                ]}
                className="w-full"
              />
            </FormField>

            <FormField
              label="Pregunta"
              htmlFor="pregunta-texto"
              required
              error={formState.errors.texto?.message}
            >
              <TextArea
                rows={3}
                value={watch("texto")}
                onChange={(value) => setValue("texto", value, { shouldValidate: true })}
                onBlur={() => formState.errors.texto && form.trigger("texto")}
                placeholder="Ej. ¿El motor arranca correctamente?"
                error={Boolean(formState.errors.texto)}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Orden"
                htmlFor="pregunta-orden"
                error={formState.errors.orden?.message}
                hint="Posición dentro de la categoría"
              >
                <Input
                  id="pregunta-orden"
                  type="number"
                  min={0}
                  {...register("orden")}
                  error={Boolean(formState.errors.orden)}
                />
              </FormField>

              <div className="flex items-end pb-1">
                <Switch
                  label="Activa"
                  defaultChecked={activo}
                  onChange={(checked) => setValue("activo", checked)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando…" : pregunta ? "Guardar cambios" : "Crear pregunta"}
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}