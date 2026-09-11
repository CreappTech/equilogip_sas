"use client";

import { Controller } from "react-hook-form";
import { z } from "zod";
import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Combobox, {
  type ComboboxOption,
} from "@/components/form/Combobox";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import { useAppForm } from "@/lib/forms/useAppForm";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useToast } from "@/components/ui/toast/ToastProvider";

const esquemaEjemplo = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Ingresa un email válido"),
  tipo: z.string().min(1, "Selecciona un tipo"),
  localidad: z.string().min(1, "Selecciona una localidad"),
  fecha: z.string().min(1, "Selecciona una fecha"),
  activo: z.boolean().default(true),
});

type EsquemaValores = z.infer<typeof esquemaEjemplo>;

const LOCALIDADES: ComboboxOption[] = [
  { value: "barranquilla", label: "Barranquilla" },
  { value: "bogota", label: "Bogotá" },
  { value: "cali", label: "Cali" },
  { value: "medellin", label: "Medellín" },
];

const VALORES_INICIALES: EsquemaValores = {
  nombre: "",
  email: "",
  tipo: "",
  localidad: "",
  fecha: "",
  activo: true,
};

export default function EjemploFormularioPage() {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useAppForm(esquemaEjemplo, { defaultValues: VALORES_INICIALES });
  const toast = useToast();

  const mutation = useResourceMutation<EsquemaValores>(async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { ok: true, values };
  });

  async function onSubmit(values: EsquemaValores) {
    const result = await mutation.mutate(values);
    if (result.ok) {
      toast.success("Formulario enviado", "Los datos del ejemplo se guardaron correctamente.");
      reset();
    } else {
      toast.error("No se pudo enviar", result.error);
    }
  }

  return (
    <div>
      <PageHeader
        title="Ejemplo: Formulario"
        description="Patrón de formulario de negocio: react-hook-form + zod + componentes canónicos."
      />
      <ComponentCard title="Formulario de ejemplo">
        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            label="Nombre"
            htmlFor="nombre"
            required
            error={errors.nombre?.message}
          >
            <Input
              id="nombre"
              placeholder="Nombre completo"
              error={Boolean(errors.nombre)}
              {...register("nombre")}
            />
          </FormField>

          <FormField
            label="Email"
            htmlFor="email"
            required
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              placeholder="correo@empresa.com"
              error={Boolean(errors.email)}
              {...register("email")}
            />
          </FormField>

          <FormField
            label="Tipo"
            htmlFor="tipo"
            required
            error={errors.tipo?.message}
          >
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <Select
                  placeholder="Selecciona un tipo"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={[
                    { value: "vehiculo", label: "Vehículo" },
                    { value: "maquina", label: "Maquinaria" },
                    { value: "equipo", label: "Equipo" },
                  ]}
                />
              )}
            />
          </FormField>

          <FormField
            label="Localidad"
            required
            error={errors.localidad?.message}
            hint="Combobox con búsqueda por texto."
          >
            <Controller
              control={control}
              name="localidad"
              render={({ field }) => (
                <Combobox
                  name={field.name}
                  options={LOCALIDADES}
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(errors.localidad)}
                />
              )}
            />
          </FormField>

          <FormField
            label="Fecha"
            htmlFor="fecha"
            required
            error={errors.fecha?.message}
            hint="Input nativo type=date."
          >
            <Input
              id="fecha"
              type="date"
              error={Boolean(errors.fecha)}
              {...register("fecha")}
            />
          </FormField>

          <div>
            <Controller
              control={control}
              name="activo"
              render={({ field }) => (
                <Checkbox
                  id="activo"
                  label="Activo"
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={mutation.status === "submitting"}>
              {mutation.status === "submitting" ? "Enviando..." : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => reset()}>
              Limpiar
            </Button>
          </div>
        </Form>
      </ComponentCard>
    </div>
  );
}