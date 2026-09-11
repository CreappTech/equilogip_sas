"use client";

import { Controller, useWatch } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Combobox from "@/components/form/Combobox";
import MultiSelect from "@/components/form/MultiSelect";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import { useAppForm } from "@/lib/forms/useAppForm";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useToast } from "@/components/ui/toast/ToastProvider";
import {
  activoFormSchema,
  type ActivoFormValues,
} from "@/features/activos/schemas/activoFormSchema";
import { createVehiculo } from "@/features/activos/actions/createVehiculo";
import { createMaquina } from "@/features/activos/actions/createMaquina";
import { createEquipo } from "@/features/activos/actions/createEquipo";
import { updateVehiculo } from "@/features/activos/actions/updateVehiculo";
import { updateMaquina } from "@/features/activos/actions/updateMaquina";
import { updateEquipo } from "@/features/activos/actions/updateEquipo";
import {
  ORIGEN_ACTIVO_LABELS,
  TIPO_ACTIVO_LABELS,
} from "@/features/activos/types/activo.types";
import type {
  CentroServicio,
  OrigenActivo,
  ProveedorSubarriendo,
  SubtipoActivoOpcion,
  SubtipoActivo,
  TipoActivo,
} from "@/features/activos/types/activo.types";
import {
  CAMPOS_FABRICANTE,
  CAMPOS_TECNICOS,
} from "@/features/activos/types/fichaTecnica";
import type { CampoFicha } from "@/features/activos/types/fichaTecnica";

export interface ActivoFormProps {
  mode: "create" | "edit";
  activoId?: string;
  initialValues?: Partial<ActivoFormValues>;
  datosTecnicos?: Record<string, string | string[]>;
  datosFabricante?: Record<string, string>;
  centros?: CentroServicio[];
  proveedores?: ProveedorSubarriendo[];
  subtipos?: SubtipoActivoOpcion[];
}

type PayloadActivo = ActivoFormValues & {
  anio: number | null;
  datos_tecnicos: Record<string, string | string[]>;
  datos_fabricante: Record<string, string>;
};

const TIPO_OPTIONS = Object.entries(TIPO_ACTIVO_LABELS).map(
  ([value, label]) => ({ value, label })
);

const ESTADO_OPERATIVO_OPTIONS = [
  { value: "OPERATIVA", label: "Operativa" },
  { value: "EN_MANTENIMIENTO", label: "En mantenimiento" },
  { value: "FUERA_DE_SERVICIO", label: "Fuera de servicio" },
];

const ORIGEN_OPTIONS = Object.entries(ORIGEN_ACTIVO_LABELS).map(
  ([value, label]) => ({ value, label })
);

const ETIQUETAS_CAMPO: Record<string, string> = {
  tipo: "Categoría",
  subtipo: "Tipo de equipo",
  codigo_interno: "Código interno",
  marca: "Marca",
  modelo: "Modelo",
  anio: "Año",
  estado: "Estado",
  estado_operativo: "Estado operativo",
  placa: "Placa",
  centro_servicio_id: "Sede / Ubicación",
  origen: "Origen",
  proveedor_id: "Proveedor de subarriendo",
};

function serializarAnio(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  const texto = String(value).trim();
  if (texto === "") return null;
  const numero = Number(texto);
  return Number.isNaN(numero) ? null : numero;
}

function compactarTecnicos(
  tecnicos: Record<string, string | string[]>
): Record<string, string | string[]> {
  return Object.fromEntries(
    Object.entries(tecnicos).filter(
      ([, value]) =>
        value !== "" && (!Array.isArray(value) || value.length > 0)
    )
  );
}

function CampoFichaControl({
  campo,
  value,
  onChange,
}: {
  campo: CampoFicha;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
}) {
  if (campo.multiple && campo.options) {
    const seleccion = Array.isArray(value) ? value : [];
    return (
      <MultiSelect
        label={campo.label}
        options={campo.options.map((opcion) => ({
          value: opcion,
          text: opcion,
          selected: seleccion.includes(opcion),
        }))}
        defaultSelected={seleccion}
        onChange={(seleccionadas) => onChange(seleccionadas)}
      />
    );
  }

  if (campo.options) {
    return (
      <FormField label={campo.label}>
        <Select
          options={campo.options.map((opcion) => ({
            value: opcion,
            label: opcion,
          }))}
          value={typeof value === "string" ? value : ""}
          onChange={(nuevo) => onChange(nuevo)}
          placeholder="Selecciona una opción"
        />
      </FormField>
    );
  }

  return (
    <FormField label={campo.label}>
      <Input
        type={campo.type === "number" ? "number" : "text"}
        value={typeof value === "string" ? value : ""}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={campo.placeholder ?? campo.label}
      />
    </FormField>
  );
}

export default function ActivoForm({
  mode = "create",
  activoId,
  initialValues,
  datosTecnicos,
  datosFabricante,
  centros = [],
  proveedores = [],
  subtipos = [],
}: ActivoFormProps) {
  const router = useRouter();
  const toast = useToast();

  const esEdicion = mode === "edit";

  const [mostrarResumenError, setMostrarResumenError] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useAppForm(activoFormSchema, {
    defaultValues: {
      tipo: initialValues?.tipo ?? "vehiculo",
      estado: initialValues?.estado ?? "activo",
      estado_operativo: initialValues?.estado_operativo ?? "OPERATIVA",
      codigo_interno: initialValues?.codigo_interno ?? "",
      subtipo: initialValues?.subtipo ?? "",
      fecha_adquisicion: initialValues?.fecha_adquisicion ?? "",
      placa: initialValues?.placa ?? "",
      marca: initialValues?.marca ?? "",
      modelo: initialValues?.modelo ?? "",
      serie: initialValues?.serie ?? "",
      numero_motor: initialValues?.numero_motor ?? "",
      color: initialValues?.color ?? "",
      lectura_inicial: initialValues?.lectura_inicial ?? "",
      origen: initialValues?.origen ?? "PROPIA",
      centro_servicio_id: initialValues?.centro_servicio_id ?? "",
      proveedor_id: initialValues?.proveedor_id ?? "",
      anio: initialValues?.anio ?? null,
    },
  });

  const tipoSeleccionado = (useWatch({ control, name: "tipo" }) ??
    initialValues?.tipo ??
    "vehiculo") as TipoActivo;

  const subtipoSeleccionado = useWatch({
    control,
    name: "subtipo",
  }) as SubtipoActivo | undefined;

  const subtiposPorCategoria = useMemo(
    () => subtipos.filter((s) => s.categoria === tipoSeleccionado),
    [subtipos, tipoSeleccionado]
  );

  const origenSeleccionado = (useWatch({ control, name: "origen" }) ??
    initialValues?.origen ??
    "PROPIA") as OrigenActivo;

  const [tecnicos, setTecnicos] = useState<
    Record<string, string | string[]>
  >(datosTecnicos ?? {});
  const [fabricante, setFabricante] = useState<Record<string, string>>(
    datosFabricante ?? {}
  );

  useEffect(() => {
    if (
      subtipoSeleccionado &&
      !subtiposPorCategoria.some((s) => s.codigo === subtipoSeleccionado)
    ) {
      setValue("subtipo", "");
    }
  }, [subtipoSeleccionado, subtiposPorCategoria, setValue]);

  useEffect(() => {
    if (mostrarResumenError) {
      alertRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [mostrarResumenError]);

  const camposConError = useMemo(
    () =>
      Object.keys(errors).map(
        (clave) => ETIQUETAS_CAMPO[clave] ?? clave
      ),
    [errors]
  );

  const mutation = useResourceMutation<PayloadActivo>(
    async (payload) => {
      const tipo = payload.tipo;

      if (esEdicion) {
        const conId = { ...payload, id: activoId! };
        if (tipo === "vehiculo") return updateVehiculo(conId as never);
        if (tipo === "maquina") return updateMaquina(conId as never);
        return updateEquipo(conId as never);
      }

      if (tipo === "vehiculo") return createVehiculo(payload as never);
      if (tipo === "maquina") return createMaquina(payload as never);
      return createEquipo(payload as never);
    }
  );

  async function onSubmit(values: ActivoFormValues) {
    const camposActuales = (CAMPOS_TECNICOS[subtipoSeleccionado ?? "YALE_MANUAL"] ?? []).map(
      (campo) => campo.name
    );
    const tecnicosValidos = Object.fromEntries(
      Object.entries(tecnicos).filter(([clave]) => camposActuales.includes(clave))
    );

    const payload: PayloadActivo = {
      ...values,
      anio: serializarAnio(values.anio),
      proveedor_id: values.proveedor_id || null,
      datos_tecnicos: compactarTecnicos(tecnicosValidos),
      datos_fabricante: Object.fromEntries(
        Object.entries(fabricante).filter(([, valor]) => valor !== "")
      ),
    };

    const result = await mutation.mutate(payload);
    if (result.ok) {
      toast.success(
        esEdicion ? "Activo actualizado" : "Activo creado",
        esEdicion
          ? "Los cambios se guardaron correctamente."
          : "El activo se registró correctamente."
      );
      if (esEdicion && activoId) {
        router.replace(`/activos/${activoId}`);
      } else {
        router.replace("/activos");
      }
      router.refresh();
    } else {
      toast.error(
        esEdicion ? "No se pudo actualizar" : "No se pudo crear",
        result.error
      );
    }
  }

  const esVehiculo = tipoSeleccionado === "vehiculo";
  const esSubarrendado = origenSeleccionado === "SUBARRENDADA";

  const subtiposDisponibles = subtiposPorCategoria;
  const camposTecnicos = subtipoSeleccionado
    ? CAMPOS_TECNICOS[subtipoSeleccionado] ?? []
    : [];

  return (
    <Form
      onSubmit={handleSubmit(onSubmit, () => setMostrarResumenError(true))}
      className="space-y-8"
    >
      {mostrarResumenError && Object.keys(errors).length > 0 && (
        <div ref={alertRef}>
          <Alert
            variant="warning"
            title="Revisa el formulario"
            message={`Faltan campos por completar: ${camposConError.join(", ")}. Los campos marcados en rojo impiden guardar.`}
          />
        </div>
      )}

      {/* ============================ 1) Datos generales ===================== */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Datos generales
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            label="Categoría"
            htmlFor="tipo"
            required
            error={errors.tipo?.message}
            hint={esEdicion ? "La categoría no puede cambiarse." : undefined}
          >
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <Combobox
                  id="tipo"
                  name={field.name}
                  options={TIPO_OPTIONS}
                  value={field.value}
                  onChange={(value) => field.onChange(value as TipoActivo)}
                  disabled={esEdicion}
                  placeholder="Selecciona la categoría"
                />
              )}
            />
          </FormField>

          <FormField
            label="Tipo de equipo"
            htmlFor="subtipo"
            required
            error={errors.subtipo?.message}
          >
            <Controller
              control={control}
              name="subtipo"
              render={({ field }) => (
                <Select
                  placeholder="Selecciona el tipo de equipo"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  options={subtiposDisponibles.map((st) => ({
                    value: st.codigo,
                    label: st.nombre,
                  }))}
                />
              )}
            />
          </FormField>

          <FormField
            label="Código interno"
            htmlFor="codigo_interno"
            required
            error={errors.codigo_interno?.message}
          >
            <Input
              id="codigo_interno"
              placeholder="Código único del activo"
              error={Boolean(errors.codigo_interno)}
              {...register("codigo_interno")}
            />
          </FormField>

          <FormField label="Marca" htmlFor="marca" required error={errors.marca?.message}>
            <Input
              id="marca"
              placeholder="Marca del equipo"
              error={Boolean(errors.marca)}
              {...register("marca")}
            />
          </FormField>

          <FormField label="Modelo" htmlFor="modelo" required error={errors.modelo?.message}>
            <Input
              id="modelo"
              placeholder="Modelo del equipo"
              error={Boolean(errors.modelo)}
              {...register("modelo")}
            />
          </FormField>

          <FormField label="Año" htmlFor="anio" error={errors.anio?.message}>
            <Input
              id="anio"
              type="number"
              min={1900}
              max={2100}
              placeholder="Año de fabricación"
              error={Boolean(errors.anio)}
              {...register("anio")}
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
                  options={[
                    { value: "activo", label: "Activo" },
                    { value: "inactivo", label: "Inactivo" },
                  ]}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="estado_operativo"
            render={({ field }) => (
              <FormField
                label="Estado operativo"
                htmlFor="estado_operativo"
                required
                error={errors.estado_operativo?.message}
                hint="'Alquilada' se asigna desde el flujo de alquiler."
              >
                <Select
                  placeholder="Selecciona el estado operativo"
                  value={field.value}
                  onChange={(value) =>
                    field.onChange(
                      value as "OPERATIVA" | "EN_MANTENIMIENTO" | "FUERA_DE_SERVICIO"
                    )
                  }
                  onBlur={field.onBlur}
                  options={ESTADO_OPERATIVO_OPTIONS}
                />
              </FormField>
            )}
          />

          {esVehiculo && (
            <FormField
              label="Placa"
              htmlFor="placa"
              required
              error={errors.placa?.message}
            >
              <Input
                id="placa"
                placeholder="Ej. ABC-123"
                error={Boolean(errors.placa)}
                {...register("placa")}
              />
            </FormField>
          )}

          <FormField
            label="Serie / VIN / Chasis"
            htmlFor="serie"
            error={errors.serie?.message}
          >
            <Input
              id="serie"
              placeholder="Número de serie"
              error={Boolean(errors.serie)}
              {...register("serie")}
            />
          </FormField>

          <FormField
            label="Número de motor"
            htmlFor="numero_motor"
            error={errors.numero_motor?.message}
          >
            <Input
              id="numero_motor"
              placeholder="Número de motor"
              error={Boolean(errors.numero_motor)}
              {...register("numero_motor")}
            />
          </FormField>

          <FormField label="Color" htmlFor="color" error={errors.color?.message}>
            <Input
              id="color"
              placeholder="Color del equipo"
              error={Boolean(errors.color)}
              {...register("color")}
            />
          </FormField>

          <FormField
            label="Horómetro / Kilometraje inicial"
            htmlFor="lectura_inicial"
            error={errors.lectura_inicial?.message}
          >
            <Input
              id="lectura_inicial"
              type="number"
              min={0}
              step={0.01}
              placeholder="Lectura inicial"
              error={Boolean(errors.lectura_inicial)}
              {...register("lectura_inicial")}
            />
          </FormField>

          <FormField
            label="Fecha de adquisición"
            htmlFor="fecha_adquisicion"
            error={errors.fecha_adquisicion?.message}
          >
            <Input
              id="fecha_adquisicion"
              type="date"
              error={Boolean(errors.fecha_adquisicion)}
              {...register("fecha_adquisicion")}
            />
          </FormField>

          <Controller
            control={control}
            name="centro_servicio_id"
            render={({ field }) => (
              <FormField
                label="Sede / Ubicación"
                htmlFor="centro_servicio_id"
                required
                error={errors.centro_servicio_id?.message}
              >
                <Select
                  placeholder={centros.length ? "Selecciona la sede" : "No hay sedes disponibles"}
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  disabled={centros.length === 0}
                  options={centros.map((centro) => ({
                    value: centro.id,
                    label: centro.nombre,
                  }))}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="origen"
            render={({ field }) => (
              <FormField
                label="Origen"
                htmlFor="origen"
                required
                error={errors.origen?.message}
              >
                <Select
                  placeholder="Selecciona el origen"
                  value={field.value}
                  onChange={(value) => field.onChange(value as OrigenActivo)}
                  onBlur={field.onBlur}
                  options={ORIGEN_OPTIONS}
                />
              </FormField>
            )}
          />

          {esSubarrendado && (
            <Controller
              control={control}
              name="proveedor_id"
              render={({ field }) => (
                <FormField
                  label="Proveedor de subarriendo"
                  htmlFor="proveedor_id"
                  required
                  error={errors.proveedor_id?.message}
                >
                  <Select
                    placeholder={
                      proveedores.length
                        ? "Selecciona el proveedor"
                        : "No hay proveedores registrados"
                    }
                    value={field.value ?? ""}
                    onChange={(value) => field.onChange(value)}
                    onBlur={field.onBlur}
                    disabled={proveedores.length === 0}
                    options={proveedores.map((proveedor) => ({
                      value: proveedor.id,
                      label: proveedor.nombre,
                    }))}
                  />
                </FormField>
              )}
            />
          )}
        </div>
      </div>

      {/* ===================== 2) Ficha técnica (por subtipo) =============== */}
      {camposTecnicos.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Ficha técnica
          </h3>
          <div
            key={subtipoSeleccionado}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2"
          >
            {camposTecnicos.map((campo) => (
              <CampoFichaControl
                key={campo.name}
                campo={campo}
                value={tecnicos[campo.name]}
                onChange={(valor) =>
                  setTecnicos((actual) => ({ ...actual, [campo.name]: valor }))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ==================== 3) Información del fabricante ================= */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
          Información del fabricante
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {CAMPOS_FABRICANTE.map((campo) => (
            <FormField key={campo.name} label={campo.label}>
              <Input
                value={fabricante[campo.name] ?? ""}
                onChange={(evento) =>
                  setFabricante((actual) => ({
                    ...actual,
                    [campo.name]: evento.target.value,
                  }))
                }
                placeholder={campo.label}
              />
            </FormField>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={mutation.status === "submitting"}>
          {mutation.status === "submitting"
            ? "Guardando..."
            : esEdicion
              ? "Guardar cambios"
              : "Crear activo"}
        </Button>
        <Link href="/activos">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </Form>
  );
}