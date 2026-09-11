"use client";

import { useEffect } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { useAppForm } from "@/lib/forms/useAppForm";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { empleadoSchema, type EmpleadoInput } from "@/features/empleados/schemas/empleadoSchema";
import { createEmpleado } from "@/features/empleados/actions/createEmpleado";
import { updateEmpleado } from "@/features/empleados/actions/updateEmpleado";
import type {
  CargoOpcion,
  RrhhOpcion,
  TurnoOpcion,
} from "@/features/empleados/types/empleado.types";

export type EmpleadoFormValues = EmpleadoInput;

export interface EmpleadoFormProps {
  mode: "create" | "edit";
  empleadoId?: string;
  initialValues?: Partial<EmpleadoFormValues>;
  cargos?: CargoOpcion[];
  eps?: RrhhOpcion[];
  arl?: RrhhOpcion[];
  fondosPension?: RrhhOpcion[];
  bancos?: RrhhOpcion[];
  turnos?: TurnoOpcion[];
}

const ESTADO_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

const TALLA_CAMISA_OPTIONS = [
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "XXL", label: "XXL" },
  { value: "XXXL", label: "XXXL" },
];

const TALLA_PANTALON_OPTIONS = [
  { value: "28", label: "28" },
  { value: "30", label: "30" },
  { value: "32", label: "32" },
  { value: "34", label: "34" },
  { value: "36", label: "36" },
  { value: "38", label: "38" },
  { value: "40", label: "40" },
  { value: "42", label: "42" },
];

const TALLA_ZAPATO_OPTIONS = [
  { value: "38", label: "38" },
  { value: "39", label: "39" },
  { value: "40", label: "40" },
  { value: "41", label: "41" },
  { value: "42", label: "42" },
  { value: "43", label: "43" },
  { value: "44", label: "44" },
  { value: "45", label: "45" },
];

function rrhhOptions(opts: RrhhOpcion[]) {
  return opts.filter((o) => o.activo !== false).map((o) => ({ value: o.id, label: o.nombre }));
}

function horaCorta(hora?: string) {
  return hora && hora.length > 5 ? hora.slice(0, 5) : hora ?? "";
}

function turnoOptions(opts: TurnoOpcion[]) {
  return opts
    .filter((o) => o.activo !== false)
    .map((o) => {
      const rango =
        o.hora_inicio && o.hora_fin
          ? ` (${horaCorta(o.hora_inicio)}–${horaCorta(o.hora_fin)})`
          : "";
      return { value: o.id, label: `${o.nombre}${rango}` };
    });
}

export default function EmpleadoForm({
  mode = "create",
  empleadoId,
  initialValues,
  cargos = [],
  eps = [],
  arl = [],
  fondosPension = [],
  bancos = [],
  turnos = [],
}: EmpleadoFormProps) {
  const router = useRouter();
  const toast = useToast();
  const esEdicion = mode === "edit";

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useAppForm(empleadoSchema, {
    defaultValues: {
      nombres: initialValues?.nombres ?? "",
      apellidos: initialValues?.apellidos ?? "",
      documento_identidad: initialValues?.documento_identidad ?? "",
      fecha_nacimiento: initialValues?.fecha_nacimiento ?? "",
      fecha_ingreso: initialValues?.fecha_ingreso ?? "",
      cargo_id: initialValues?.cargo_id ?? "",
      turno_id: initialValues?.turno_id ?? null,
      estado: initialValues?.estado ?? "activo",
      telefono: initialValues?.telefono ?? "",
      email_contacto: initialValues?.email_contacto ?? "",
      eps_id: initialValues?.eps_id ?? null,
      arl_id: initialValues?.arl_id ?? null,
      fondo_pension_id: initialValues?.fondo_pension_id ?? null,
      talla_camisa: initialValues?.talla_camisa ?? null,
      talla_pantalon: initialValues?.talla_pantalon ?? null,
      talla_zapato: initialValues?.talla_zapato ?? null,
      banco_id: initialValues?.banco_id ?? null,
      numero_cuenta: initialValues?.numero_cuenta ?? "",
      contacto_emergencia_nombres: initialValues?.contacto_emergencia_nombres ?? "",
      contacto_emergencia_apellidos: initialValues?.contacto_emergencia_apellidos ?? "",
      contacto_emergencia_telefono: initialValues?.contacto_emergencia_telefono ?? "",
      cantidad_hijos: initialValues?.cantidad_hijos ?? null,
      edades_hijos: initialValues?.edades_hijos ?? [],
    },
  });

  const cantidadHijos = useWatch({ control, name: "cantidad_hijos" });
  const cantidadHijosNum = Math.max(0, Math.min(20, Number(cantidadHijos) || 0));

  useEffect(() => {
    const prev = getValues("edades_hijos") ?? [];
    const next = Array.from({ length: cantidadHijosNum }, (_, i) => prev[i] ?? "");
    setValue("edades_hijos", next, { shouldDirty: true });
  }, [cantidadHijosNum, getValues, setValue]);

  const mutation = useResourceMutation<EmpleadoInput & { id?: string }>(
    async (payload) => {
      if (esEdicion && empleadoId) {
        return updateEmpleado({ ...payload, id: empleadoId });
      }
      return createEmpleado(payload);
    }
  );

  async function onSubmit(values: EmpleadoFormValues) {
    const result = await mutation.mutate(values);
    if (result.ok) {
      toast.success(
        esEdicion ? "Empleado actualizado" : "Empleado creado",
        esEdicion
          ? "Los cambios se guardaron correctamente."
          : "El empleado se registró correctamente."
      );
      if (esEdicion && empleadoId) {
        router.replace(`/empleados/${empleadoId}`);
      } else {
        router.replace("/empleados");
      }
      router.refresh();
    } else {
      toast.error(
        esEdicion ? "No se pudo actualizar" : "No se pudo crear",
        result.error
      );
    }
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Datos personales ──────────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Datos personales
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            label="Nombres"
            htmlFor="nombres"
            required
            error={errors.nombres?.message}
          >
            <Input
              id="nombres"
              placeholder="Nombres del empleado"
              error={Boolean(errors.nombres)}
              {...register("nombres")}
            />
          </FormField>

          <FormField
            label="Apellidos"
            htmlFor="apellidos"
            required
            error={errors.apellidos?.message}
          >
            <Input
              id="apellidos"
              placeholder="Apellidos del empleado"
              error={Boolean(errors.apellidos)}
              {...register("apellidos")}
            />
          </FormField>

          <FormField
            label="Documento de identidad"
            htmlFor="documento_identidad"
            required
            error={errors.documento_identidad?.message}
          >
            <Input
              id="documento_identidad"
              placeholder="Número de cédula o documento"
              error={Boolean(errors.documento_identidad)}
              {...register("documento_identidad")}
            />
          </FormField>

          <FormField
            label="Fecha de nacimiento"
            htmlFor="fecha_nacimiento"
            error={errors.fecha_nacimiento?.message}
          >
            <Input
              id="fecha_nacimiento"
              type="date"
              error={Boolean(errors.fecha_nacimiento)}
              {...register("fecha_nacimiento")}
            />
          </FormField>

          <FormField
            label="Teléfono"
            htmlFor="telefono"
            error={errors.telefono?.message}
          >
            <Input
              id="telefono"
              placeholder="Teléfono de contacto"
              error={Boolean(errors.telefono)}
              {...register("telefono")}
            />
          </FormField>

          <FormField
            label="Correo de contacto"
            htmlFor="email_contacto"
            error={errors.email_contacto?.message}
          >
            <Input
              id="email_contacto"
              type="email"
              placeholder="correo@empresa.com"
              error={Boolean(errors.email_contacto)}
              {...register("email_contacto")}
            />
          </FormField>
        </div>
      </div>

      {/* ── Información laboral ───────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Información laboral
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="cargo_id"
            render={({ field }) => (
              <FormField
                label="Cargo"
                htmlFor="cargo_id"
                required
                error={errors.cargo_id?.message}
              >
                <Select
                  placeholder={
                    cargos.length
                      ? "Selecciona el cargo"
                      : "No hay cargos disponibles"
                  }
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  disabled={cargos.length === 0}
                  options={cargos.map((cargo) => ({
                    value: cargo.id,
                    label: cargo.nombre,
                  }))}
                />
              </FormField>
            )}
          />

          <FormField
            label="Fecha de ingreso"
            htmlFor="fecha_ingreso"
            required
            error={errors.fecha_ingreso?.message}
          >
            <Input
              id="fecha_ingreso"
              type="date"
              error={Boolean(errors.fecha_ingreso)}
              {...register("fecha_ingreso")}
            />
          </FormField>

          <Controller
            control={control}
            name="estado"
            render={({ field }) => (
              <FormField
                label="Estado"
                htmlFor="estado"
                required
                error={errors.estado?.message}
              >
                <Select
                  placeholder="Selecciona un estado"
                  value={field.value}
                  onChange={(value) => field.onChange(value as "activo" | "inactivo")}
                  onBlur={field.onBlur}
                  options={ESTADO_OPTIONS}
                />
              </FormField>
            )}
          />
          <Controller
            control={control}
            name="turno_id"
            render={({ field }) => (
              <FormField
                label="Turno habitual"
                htmlFor="turno_id"
                error={errors.turno_id?.message}
                hint="Horario regular del operador. Se reasigna en edición cuando cambie."
              >
                <Select
                  placeholder={
                    turnos.length
                      ? "Sin asignar"
                      : "No hay turnos disponibles"
                  }
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value || null)}
                  onBlur={field.onBlur}
                  disabled={turnos.length === 0}
                  options={turnoOptions(turnos)}
                />
              </FormField>
            )}
          />
        </div>
      </div>

      {/* ── Seguridad social ──────────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Seguridad social
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Controller
            control={control}
            name="eps_id"
            render={({ field }) => (
              <FormField label="EPS" htmlFor="eps_id" error={errors.eps_id?.message}>
                <Select
                  placeholder="Sin especificar"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value || null)}
                  onBlur={field.onBlur}
                  options={rrhhOptions(eps)}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="arl_id"
            render={({ field }) => (
              <FormField label="ARL" htmlFor="arl_id" error={errors.arl_id?.message}>
                <Select
                  placeholder="Sin especificar"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value || null)}
                  onBlur={field.onBlur}
                  options={rrhhOptions(arl)}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="fondo_pension_id"
            render={({ field }) => (
              <FormField
                label="Fondo de pensión"
                htmlFor="fondo_pension_id"
                error={errors.fondo_pension_id?.message}
              >
                <Select
                  placeholder="Sin especificar"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value || null)}
                  onBlur={field.onBlur}
                  options={rrhhOptions(fondosPension)}
                />
              </FormField>
            )}
          />
        </div>
      </div>

      {/* ── Dotación ──────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Dotación
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Controller
            control={control}
            name="talla_camisa"
            render={({ field }) => (
              <FormField
                label="Talla camisa"
                htmlFor="talla_camisa"
                error={errors.talla_camisa?.message}
              >
                <Select
                  placeholder="Sin especificar"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value || null)}
                  onBlur={field.onBlur}
                  options={TALLA_CAMISA_OPTIONS}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="talla_pantalon"
            render={({ field }) => (
              <FormField
                label="Talla pantalón"
                htmlFor="talla_pantalon"
                error={errors.talla_pantalon?.message}
              >
                <Select
                  placeholder="Sin especificar"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value || null)}
                  onBlur={field.onBlur}
                  options={TALLA_PANTALON_OPTIONS}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="talla_zapato"
            render={({ field }) => (
              <FormField
                label="Talla zapato"
                htmlFor="talla_zapato"
                error={errors.talla_zapato?.message}
              >
                <Select
                  placeholder="Sin especificar"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value || null)}
                  onBlur={field.onBlur}
                  options={TALLA_ZAPATO_OPTIONS}
                />
              </FormField>
            )}
          />
        </div>
      </div>

      {/* ── Información financiera ────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Información financiera
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="banco_id"
            render={({ field }) => (
              <FormField label="Banco" htmlFor="banco_id" error={errors.banco_id?.message}>
                <Select
                  placeholder="Sin especificar"
                  value={field.value ?? ""}
                  onChange={(value) => field.onChange(value || null)}
                  onBlur={field.onBlur}
                  options={rrhhOptions(bancos)}
                />
              </FormField>
            )}
          />

          <FormField
            label="Número de cuenta"
            htmlFor="numero_cuenta"
            error={errors.numero_cuenta?.message}
          >
            <Input
              id="numero_cuenta"
              placeholder="Número de cuenta bancaria"
              error={Boolean(errors.numero_cuenta)}
              {...register("numero_cuenta")}
            />
          </FormField>
        </div>
      </div>

      {/* ── Contacto de emergencia ────────────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Contacto de emergencia
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Nombres"
            htmlFor="contacto_emergencia_nombres"
            error={errors.contacto_emergencia_nombres?.message}
          >
            <Input
              id="contacto_emergencia_nombres"
              placeholder="Nombres del contacto"
              error={Boolean(errors.contacto_emergencia_nombres)}
              {...register("contacto_emergencia_nombres")}
            />
          </FormField>

          <FormField
            label="Apellidos"
            htmlFor="contacto_emergencia_apellidos"
            error={errors.contacto_emergencia_apellidos?.message}
          >
            <Input
              id="contacto_emergencia_apellidos"
              placeholder="Apellidos del contacto"
              error={Boolean(errors.contacto_emergencia_apellidos)}
              {...register("contacto_emergencia_apellidos")}
            />
          </FormField>

          <FormField
            label="Teléfono"
            htmlFor="contacto_emergencia_telefono"
            error={errors.contacto_emergencia_telefono?.message}
          >
            <Input
              id="contacto_emergencia_telefono"
              placeholder="Teléfono del contacto"
              error={Boolean(errors.contacto_emergencia_telefono)}
              {...register("contacto_emergencia_telefono")}
            />
          </FormField>
        </div>
      </div>

      {/* ── Hijos (bienestar del empleado) ────────────────────────── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Hijos
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FormField
            label="Cantidad de hijos"
            htmlFor="cantidad_hijos"
            error={errors.cantidad_hijos?.message}
          >
            <Input
              id="cantidad_hijos"
              type="number"
              min={0}
              max={20}
              placeholder="0"
              error={Boolean(errors.cantidad_hijos)}
              {...register("cantidad_hijos")}
            />
          </FormField>
        </div>
        {cantidadHijosNum === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Define la cantidad de hijos para registrar la edad de cada uno.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {Array.from({ length: cantidadHijosNum }, (_, i) => (
              <FormField
                key={i}
                label={`Edad hijo ${i + 1}`}
                htmlFor={`edades_hijos.${i}`}
                error={errors.edades_hijos?.[i]?.message}
              >
                <Input
                  id={`edades_hijos.${i}`}
                  type="number"
                  min={1}
                  max={100}
                  placeholder={`Edad hijo ${i + 1}`}
                  error={Boolean(errors.edades_hijos?.[i])}
                  {...register(`edades_hijos.${i}`)}
                />
              </FormField>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={mutation.status === "submitting"}>
          {mutation.status === "submitting"
            ? "Guardando..."
            : esEdicion
              ? "Guardar cambios"
              : "Crear empleado"}
        </Button>
        <Link href="/empleados">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </Form>
  );
}