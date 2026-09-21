"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Combobox from "@/components/form/Combobox";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useAppForm } from "@/lib/forms/useAppForm";
import {
  crearInspeccion,
  descartarBorrador,
} from "@/features/mantenimiento/actions/inspecciones";
import { inspeccionSchema } from "@/features/mantenimiento/schemas/inspeccionSchema";
import {
  NIVEL_ACEITE_OPTIONS,
  NIVEL_COMBUSTIBLE_OPTIONS,
} from "@/features/mantenimiento/types/mantenimiento.types";
import type {
  ActivoOperativoOpcion,
  DetalleInspeccion,
} from "@/features/mantenimiento/types/mantenimiento.types";

interface InspeccionInicioClientProps {
  activos: ActivoOperativoOpcion[];
  borrador: DetalleInspeccion | null;
  userId: string;
}

export default function InspeccionInicioClient({
  activos,
  borrador,
}: InspeccionInicioClientProps) {
  const router = useRouter();
  const toast = useToast();

  const mutationCrear = useResourceMutation(crearInspeccion);
  const mutationDescartar = useResourceMutation(descartarBorrador);
  const [confirmarDescartar, setConfirmarDescartar] = useState(false);

  const form = useAppForm(inspeccionSchema, {
    defaultValues: {
      activo_id: "",
      lectura: 0,
      nivel_combustible: "",
      nivel_aceite: "",
    },
  });

  const { setValue, watch, handleSubmit, formState } = form;
  const activo_id = watch("activo_id");
  const activoSeleccionado = activos.find((a) => a.id === activo_id);

  async function onIniciar(values: {
    activo_id: string;
    lectura: number;
    nivel_combustible: string;
    nivel_aceite: string;
  }) {
    const result = await mutationCrear.mutate(values as never);
    if (!result.ok) {
      toast.error("No se pudo iniciar", result.error);
      return;
    }
    router.push(`/mantenimiento/inspeccion/${result.extra.inspeccionId}`);
  }

  async function onDescartar() {
    if (!borrador) return;
    const result = await mutationDescartar.mutate(borrador.id);
    setConfirmarDescartar(false);
    if (!result.ok) {
      toast.error("No se pudo descartar", result.error);
      return;
    }
    toast.info("Borrador descartado");
    router.refresh();
  }

  const opcionesActivos = activos.map((a) => ({
    value: a.id,
    label: `${a.codigo_interno} · ${a.nombre}`,
  }));

  const unidad = activoSeleccionado?.lectura_unidad ?? "kilometraje";

  return (
    <div>
      <PageHeader
        title="Inspección preoperacional"
        description="Registra el estado del equipo antes de comenzar la operación"
      />

      {borrador && (
        <div className="mb-4">
          <Alert
            variant="info"
            title="Tienes una inspección en curso"
            message={`${borrador.activo_nombre ?? borrador.activo_codigo ?? "Equipo"} · ${
              borrador.activo_codigo ?? ""
            }. Puedes reanudarla o descartarla para empezar de nuevo.`}
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/mantenimiento/inspeccion/${borrador.id}`}>
              <Button size="sm">Reanudar inspección</Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmarDescartar(true)}
            >
              Descartar borrador
            </Button>
          </div>
        </div>
      )}

      <ComponentCard
        title="Nueva inspección"
        desc={
          borrador
            ? "Descartá el borrador anterior antes de empezar otra inspección."
            : "Selecciona el equipo y registra los niveles generales."
        }
      >
        <Form onSubmit={handleSubmit((values) => void onIniciar(values))}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Equipo"
              htmlFor="inspeccion-activo"
              required
              error={formState.errors.activo_id?.message}
              hint="Solo equipos activos y operativos"
            >
              <Combobox
                id="inspeccion-activo"
                options={opcionesActivos}
                value={activo_id}
                onChange={(value) =>
                  setValue("activo_id", value, { shouldValidate: true })
                }
                placeholder="Busca el equipo por código o nombre…"
                error={Boolean(formState.errors.activo_id)}
                disabled={Boolean(borrador)}
              />
            </FormField>

            <FormField
              label="Lectura"
              htmlFor="inspeccion-lectura"
              required
              error={formState.errors.lectura?.message}
              hint={
                activoSeleccionado
                  ? unidad === "kilometraje"
                    ? "Kilometraje en km"
                    : "Horómetro en horas"
                  : "Kilometraje en km"
              }
            >
              <Input
                id="inspeccion-lectura"
                type="number"
                min={0}
                step={1}
                error={Boolean(formState.errors.lectura)}
                disabled={Boolean(borrador)}
                value={watch("lectura") as number | undefined}
                onChange={(e) =>
                  setValue("lectura", Number(e.target.value), {
                    shouldValidate: true,
                  })
                }
              />
            </FormField>

            <FormField
              label="Nivel de combustible"
              htmlFor="inspeccion-combustible"
              required
              error={formState.errors.nivel_combustible?.message}
            >
              <Select
                value={watch("nivel_combustible")}
                onChange={(value) =>
                  setValue("nivel_combustible", value as never, {
                    shouldValidate: true,
                  })
                }
                placeholder="Selecciona el nivel"
                options={NIVEL_COMBUSTIBLE_OPTIONS.map((o) => ({
                  value: o,
                  label: o,
                }))}
                disabled={Boolean(borrador)}
                className="w-full"
              />
            </FormField>

            <FormField
              label="Nivel de aceite"
              htmlFor="inspeccion-aceite"
              required
              error={formState.errors.nivel_aceite?.message}
            >
              <Select
                value={watch("nivel_aceite")}
                onChange={(value) =>
                  setValue("nivel_aceite", value as never, {
                    shouldValidate: true,
                  })
                }
                placeholder="Selecciona el nivel"
                options={NIVEL_ACEITE_OPTIONS.map((o) => ({
                  value: o,
                  label: o,
                }))}
                disabled={Boolean(borrador)}
                className="w-full"
              />
            </FormField>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              type="submit"
              disabled={
                Boolean(borrador) ||
                mutationCrear.status === "submitting"
              }
            >
              {mutationCrear.status === "submitting"
                ? "Iniciando…"
                : "Iniciar inspección"}
            </Button>
          </div>
        </Form>
      </ComponentCard>

      <ConfirmDialog
        isOpen={confirmarDescartar}
        title="Descartar borrador"
        message="Se perderá el avance de la inspección en curso. ¿Deseas continuar?"
        confirmLabel="Descartar"
        variant="danger"
        loading={mutationDescartar.status === "submitting"}
        onConfirm={onDescartar}
        onClose={() => setConfirmarDescartar(false)}
      />
    </div>
  );
}