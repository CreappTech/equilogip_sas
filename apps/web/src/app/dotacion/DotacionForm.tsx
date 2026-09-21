"use client";

import { Controller, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";

import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import Combobox from "@/components/form/Combobox";
import SignaturePad from "@/components/form/SignaturePad";
import EvidenceUploader from "@/components/form/EvidenceUploader";
import Button from "@/components/ui/button/Button";
import { useAppForm } from "@/lib/forms/useAppForm";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useToast } from "@/components/ui/toast/ToastProvider";
import {
  dotacionEditarSchema,
  type DotacionEditarInput,
  type LineaDotacionInput,
} from "@/features/dotacion/schemas/dotacionSchema";
import { TIPO_ENTREGA_LABELS } from "@/features/dotacion/types/dotacion.types";
import type { EmpleadoDotacionOpcion } from "@/features/dotacion/types/dotacion.types";
import { createEntrega } from "@/features/dotacion/actions/createEntrega";
import { updateEntrega } from "@/features/dotacion/actions/updateEntrega";
import { subirFirma } from "@/features/dotacion/lib/evidencia";

const dotacionFormSchema = dotacionEditarSchema.extend({
  firma_path: z.string().optional(),
  evidencia_paths: z.array(z.string()).optional().default([]),
});

type DotacionFormValues = z.infer<typeof dotacionFormSchema>;

const TIPO_OPTIONS = Object.entries(TIPO_ENTREGA_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function empleadoOpciones(empleados: EmpleadoDotacionOpcion[]) {
  return empleados.map((empleado) => ({
    value: empleado.id,
    label: `${empleado.nombres} ${empleado.apellidos} · ${empleado.documento_identidad}`,
  }));
}

function nuevaLinea(): LineaDotacionInput {
  return { descripcion: "", cantidad: 1, talla: "" };
}

export interface DotacionFormProps {
  mode: "create" | "edit";
  entregaId?: string;
  initialValues?: Partial<DotacionFormValues>;
  empleados?: EmpleadoDotacionOpcion[];
}

/**
 * Formulario compartido de entregas de dotación.
 *  - CREATE: empleado, fecha, tipo, quién entrega, elementos (líneas),
 *    evidencias (fotos/PDF) y firma digital del receptor (canvas nativo).
 *    La firma y las evidencias se suben al bucket privado antes de registrar:
 *    el RPC `registrar_entrega_dotacion` escribe cabecera + líneas en una sola
 *    transacción y limpia los archivos si falla.
 *  - EDIT:  solo datos + líneas. La evidencia y la firma son inmutables
 *    (auditoría) y `estado` nunca incluye `anulada` (anular es operación aparte).
 */
export default function DotacionForm({
  mode = "create",
  entregaId,
  initialValues,
  empleados = [],
}: DotacionFormProps) {
  const router = useRouter();
  const toast = useToast();
  const esEdicion = mode === "edit";

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useAppForm(dotacionFormSchema, {
    defaultValues: {
      empleado_id: initialValues?.empleado_id ?? "",
      fecha_entrega: initialValues?.fecha_entrega ?? new Date().toISOString().slice(0, 10),
      tipo_entrega: initialValues?.tipo_entrega ?? "inicial",
      entregado_por: initialValues?.entregado_por ?? "",
      observaciones: initialValues?.observaciones ?? "",
      firma_path: initialValues?.firma_path ?? "",
      evidencia_paths: initialValues?.evidencia_paths ?? [],
      lineas:
        initialValues?.lineas && initialValues.lineas.length > 0
          ? initialValues.lineas
          : [nuevaLinea()],
    },
  });

  const campos = useFieldArray({ control, name: "lineas" });

  const mutation = useResourceMutation<DotacionFormValues & { id?: string }>(
    async (payload) => {
      if (esEdicion && entregaId) {
        // Las claves sobrantes (firma/evidencia) las descarta el schema de
        // edición en updateEntrega; nunca se mandan a la base.
        return updateEntrega({ id: entregaId, ...payload } as DotacionEditarInput & {
          id: string;
        });
      }

      const firma = payload.firma_path;
      if (!firma) {
        return { ok: false, error: "La firma del receptor es obligatoria." };
      }
      const subida = await subirFirma(firma);
      if (!subida.ok) return subida;
      return createEntrega({
        ...payload,
        firma_path: subida.path,
        evidencia_paths: payload.evidencia_paths ?? [],
      });
    }
  );

  async function onSubmit(values: DotacionFormValues) {
    const result = await mutation.mutate(values);
    if (result.ok) {
      toast.success(
        esEdicion ? "Entrega actualizada" : "Entrega registrada",
        esEdicion
          ? "Los cambios se guardaron correctamente."
          : "La entrega de dotación quedó registrada con su recibo."
      );
      if (esEdicion && entregaId) {
        router.replace(`/dotacion/${entregaId}`);
      } else {
        router.replace("/dotacion");
      }
      router.refresh();
    } else {
      toast.error(
        esEdicion ? "No se pudo actualizar" : "No se pudo registrar",
        result.error
      );
    }
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Datos de la entrega ───────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Datos de la entrega
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="empleado_id"
            render={({ field }) => (
              <FormField
                label="Empleado"
                htmlFor="empleado_id"
                required
                error={errors.empleado_id?.message}
              >
                <Combobox
                  id="empleado_id"
                  options={empleadoOpciones(empleados)}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={
                    empleados.length
                      ? "Busca al empleado que recibe la dotación..."
                      : "No hay empleados activos"
                  }
                  disabled={empleados.length === 0}
                  error={Boolean(errors.empleado_id)}
                />
              </FormField>
            )}
          />

          <FormField
            label="Fecha de entrega"
            htmlFor="fecha_entrega"
            required
            error={errors.fecha_entrega?.message}
          >
            <Input
              id="fecha_entrega"
              type="date"
              error={Boolean(errors.fecha_entrega)}
              {...register("fecha_entrega")}
            />
          </FormField>

          <Controller
            control={control}
            name="tipo_entrega"
            render={({ field }) => (
              <FormField
                label="Tipo de entrega"
                htmlFor="tipo_entrega"
                required
                error={errors.tipo_entrega?.message}
              >
                <Select
                  options={TIPO_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormField>
            )}
          />

          <FormField
            label="Entregado por"
            htmlFor="entregado_por"
            required
            error={errors.entregado_por?.message}
          >
            <Input
              id="entregado_por"
              placeholder="Nombre de quien entrega la dotación"
              error={Boolean(errors.entregado_por)}
              {...register("entregado_por")}
            />
          </FormField>

          <Controller
            control={control}
            name="observaciones"
            render={({ field }) => (
              <div className="sm:col-span-2">
                <FormField
                  label="Observaciones"
                  error={errors.observaciones?.message}
                >
                  <TextArea
                    rows={3}
                    placeholder="Observaciones de la entrega (opcional)"
                    error={Boolean(errors.observaciones)}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormField>
              </div>
            )}
          />
        </div>
      </div>

      {/* ── Elementos entregados ──────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Elementos entregados
        </h3>
        <div className="space-y-3">
          {campos.fields.map((campo, index) => (
            <div
              key={campo.id}
              className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-[1fr_110px_130px_auto] sm:items-end"
            >
              <FormField
                label="Descripción"
                htmlFor={`lineas.${index}.descripcion`}
                required
                error={errors.lineas?.[index]?.descripcion?.message}
              >
                <Input
                  id={`lineas.${index}.descripcion`}
                  placeholder="Ej.: Camisa manga larga"
                  error={Boolean(errors.lineas?.[index]?.descripcion)}
                  {...register(`lineas.${index}.descripcion`)}
                />
              </FormField>

              <FormField
                label="Cantidad"
                htmlFor={`lineas.${index}.cantidad`}
                required
                error={errors.lineas?.[index]?.cantidad?.message}
              >
                <Input
                  id={`lineas.${index}.cantidad`}
                  type="number"
                  min={1}
                  max={999}
                  error={Boolean(errors.lineas?.[index]?.cantidad)}
                  {...register(`lineas.${index}.cantidad`)}
                />
              </FormField>

              <FormField
                label="Talla"
                htmlFor={`lineas.${index}.talla`}
                error={errors.lineas?.[index]?.talla?.message}
              >
                <Input
                  id={`lineas.${index}.talla`}
                  placeholder="Opcional"
                  error={Boolean(errors.lineas?.[index]?.talla)}
                  {...register(`lineas.${index}.talla`)}
                />
              </FormField>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => campos.remove(index)}
                  disabled={campos.fields.length === 1 || mutation.status === "submitting"}
                  className="text-sm font-medium text-error-500 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => campos.append(nuevaLinea())}
          disabled={mutation.status === "submitting"}
          className="mt-3 text-sm font-medium text-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Agregar elemento
        </button>

        {typeof errors.lineas?.message === "string" && (
          <p className="mt-2 text-xs text-error-500">{errors.lineas.message}</p>
        )}
      </div>

      {!esEdicion && (
        <>
          {/* ── Evidencia de la entrega ────────────────────────────── */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
              Evidencia de la entrega
            </h3>
            <Controller
              control={control}
              name="evidencia_paths"
              render={({ field }) => (
                <EvidenceUploader
                  value={field.value ?? []}
                  onChange={field.onChange}
                  disabled={mutation.status === "submitting"}
                  hint="Opcional: fotos de la entrega o el documento firmado."
                />
              )}
            />
          </div>

          {/* ── Firma del receptor ─────────────────────────────────── */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Firma del receptor <span className="text-error-500">*</span>
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                El empleado firma aquí: la firma queda adjunta al recibo de la
                entrega.
              </p>
            </div>
            <Controller
              control={control}
              name="firma_path"
              render={({ field }) => (
                <SignaturePad
                  value={field.value}
                  onChange={field.onChange}
                  disabled={mutation.status === "submitting"}
                />
              )}
            />
            {errors.firma_path?.message && (
              <p className="mt-1.5 text-xs text-error-500">
                {errors.firma_path.message}
              </p>
            )}
          </div>
        </>
      )}

      {esEdicion && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
          La firma del receptor y las evidencias adjuntas no se modifican en la
          edición: quedan congeladas para auditoría. Para eliminar la entrega
          definitivamente, anúlala desde su detalle.
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={mutation.status === "submitting"}>
          {mutation.status === "submitting"
            ? "Guardando..."
            : esEdicion
              ? "Guardar cambios"
              : "Registrar entrega"}
        </Button>
        <Link href="/dotacion">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </Form>
  );
}