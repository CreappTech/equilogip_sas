"use client";

import { useEffect, useMemo } from "react";

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
import { rutinaSchema, type RutinaFormValues } from "@/features/mantenimiento/schemas/rutinaSchema";
import { UNIDAD_LECTURA_LABELS } from "@/features/mantenimiento/types/mantenimiento.types";
import {
  SUBTIPOS_POR_CATEGORIA,
  SUBTIPO_ACTIVO_LABELS,
  type TipoActivo,
} from "@/features/activos/types/activo.types";
import type { RutinaMantenimiento } from "@/features/mantenimiento/types/mantenimiento.types";

interface RutinaFormModalProps {
  open: boolean;
  rutina: RutinaMantenimiento | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: RutinaFormValues) => Promise<void>;
}

export function RutinaFormModal({
  open,
  rutina,
  submitting,
  error,
  onClose,
  onSave,
}: RutinaFormModalProps) {
  const form = useAppForm(rutinaSchema, {
    defaultValues: {
      nombre: "",
      descripcion: null,
      tipo_activo: "ambos",
      subtipo: null,
      unidad: "kilometraje",
      umbral: 0,
      activo: true,
    },
  });

  const { handleSubmit, reset, setValue, watch, formState } = form;
  const activo = watch("activo");
  const tipoActivo = watch("tipo_activo");

  useEffect(() => {
    if (!open) return;
    if (rutina) {
      reset({
        nombre: rutina.nombre,
        descripcion: rutina.descripcion,
        tipo_activo: rutina.tipo_activo,
        subtipo: rutina.subtipo,
        unidad: rutina.unidad,
        umbral: rutina.umbral,
        activo: rutina.activo,
      });
    } else {
      reset({
        nombre: "",
        descripcion: null,
        tipo_activo: "ambos",
        subtipo: null,
        unidad: "kilometraje",
        umbral: 1,
        activo: true,
      });
    }
  }, [open, rutina, reset]);

  const subtiposDisponibles = useMemo(() => {
    if (tipoActivo !== "vehiculo" && tipoActivo !== "maquina") {
      return [];
    }
    return (SUBTIPOS_POR_CATEGORIA[tipoActivo as TipoActivo] ?? []).map(
      (s) => ({ value: s, label: SUBTIPO_ACTIVO_LABELS[s] ?? s })
    );
  }, [tipoActivo]);

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg p-6">
      <div>
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          {rutina ? "Editar rutina" : "Nueva rutina"}
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Se activará al superar el umbral de lectura del equipo.
        </p>

        {error && (
          <div className="mb-4">
            <Alert variant="error" title="No se pudo guardar" message={error} />
          </div>
        )}

        <Form onSubmit={handleSubmit((values) => void onSave(values))}>
          <div className="space-y-4">
            <FormField
              label="Nombre"
              htmlFor="rutina-nombre"
              required
              error={formState.errors.nombre?.message}
            >
              <Input
                id="rutina-nombre"
                placeholder="Ej. Cambio de aceite de motor"
                error={Boolean(formState.errors.nombre)}
                value={watch("nombre")}
                onChange={(e) =>
                  setValue("nombre", e.target.value, { shouldValidate: true })
                }
              />
            </FormField>

            <FormField
              label="Descripción"
              htmlFor="rutina-descripcion"
              error={formState.errors.descripcion?.message}
            >
              <TextArea
                rows={2}
                value={watch("descripcion") ?? ""}
                onChange={(value) =>
                  setValue("descripcion", value || null, { shouldValidate: true })
                }
                placeholder="Detalle de la actividad preventiva (opcional)"
                error={Boolean(formState.errors.descripcion)}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Aplica a"
                htmlFor="rutina-tipo"
                required
                error={formState.errors.tipo_activo?.message}
              >
                <Select
                  value={watch("tipo_activo")}
                  onChange={(value) => {
                    setValue("tipo_activo", value as never, {
                      shouldValidate: true,
                    });
                    setValue("subtipo", null);
                  }}
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
                label="Tipo de equipo"
                htmlFor="rutina-subtipo"
                error={formState.errors.subtipo?.message}
                hint={tipoActivo === "ambos" || !subtiposDisponibles.length ? "Aplica a todos" : undefined}
              >
                <Select
                  value={watch("subtipo") ?? ""}
                  onChange={(value) =>
                    setValue("subtipo", (value || null) as RutinaFormValues["subtipo"], {
                      shouldValidate: true,
                    })
                  }
                  disabled={!subtiposDisponibles.length}
                  placeholder="Todos"
                  options={[
                    { value: "", label: "Todos" },
                    ...subtiposDisponibles,
                  ]}
                  className="w-full"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Unidad"
                htmlFor="rutina-unidad"
                required
                error={formState.errors.unidad?.message}
              >
                <Select
                  value={watch("unidad")}
                  onChange={(value) =>
                    setValue("unidad", value as never, { shouldValidate: true })
                  }
                  placeholder="Unidad de lectura"
                  options={Object.entries(UNIDAD_LECTURA_LABELS).map(
                    ([value, label]) => ({ value, label })
                  )}
                  className="w-full"
                />
              </FormField>

              <FormField
                label="Umbral"
                htmlFor="rutina-umbral"
                required
                error={formState.errors.umbral?.message}
                hint="Se activa al alcanzar o superar este valor"
              >
                <Input
                  id="rutina-umbral"
                  type="number"
                  min={1}
                  step={1}
                  error={Boolean(formState.errors.umbral)}
                  value={watch("umbral") as number | undefined}
                  onChange={(e) =>
                    setValue("umbral", Number(e.target.value), {
                      shouldValidate: true,
                    })
                  }
                />
              </FormField>
            </div>

            <div className="flex items-end">
              <Switch
                label="Activa"
                defaultChecked={activo}
                onChange={(checked) => setValue("activo", checked)}
              />
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
                {submitting ? "Guardando…" : rutina ? "Guardar cambios" : "Crear rutina"}
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}