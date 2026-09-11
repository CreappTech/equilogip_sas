"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller } from "react-hook-form";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useAppForm } from "@/lib/forms/useAppForm";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useToast } from "@/components/ui/toast/ToastProvider";
import {
  empresaConfigSchema,
  type EmpresaConfigValues,
} from "@/features/operaciones/schemas/empresaConfigSchema";
import { guardarEmpresaConfig } from "@/features/operaciones/actions/actas";
import type { EmpresaConfigDatos } from "@/features/operaciones/types/operaciones.types";

interface EmpresaConfigFormProps {
  initialValues: EmpresaConfigDatos;
}

export default function EmpresaConfigForm({
  initialValues,
}: EmpresaConfigFormProps) {
  const router = useRouter();
  const toast = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useAppForm(empresaConfigSchema, {
    defaultValues: {
      razon_social: initialValues.razon_social,
      nit: initialValues.nit,
      direccion: initialValues.direccion,
      ciudad: initialValues.ciudad,
      telefono: initialValues.telefono,
      representante: initialValues.representante,
    },
  });

  const mutation = useResourceMutation<EmpresaConfigValues>(
    guardarEmpresaConfig
  );

  async function onSubmit(values: EmpresaConfigValues) {
    const result = await mutation.mutate(values);
    if (result.ok) {
      toast.success(
        "Configuración guardada",
        "Los datos de la empresa se guardaron correctamente."
      );
      router.replace("/operaciones/actas");
      router.refresh();
    } else {
      toast.error("No se pudo guardar la configuración", result.error);
    }
  }

  const campos: Array<{
    name: "razon_social" | "nit" | "direccion" | "ciudad" | "telefono" | "representante";
    label: string;
    placeholder: string;
  }> = [
    { name: "razon_social", label: "Razón social", placeholder: "Ej. EQUILOGIP S.A.S." },
    { name: "nit", label: "NIT", placeholder: "Ej. 901.123.456-7" },
    { name: "direccion", label: "Dirección", placeholder: "Ej. Calle 12 # 34 - 56" },
    { name: "ciudad", label: "Ciudad", placeholder: "Ej. Bogotá, D.C." },
    { name: "telefono", label: "Teléfono", placeholder: "Ej. 601 123 4567" },
    { name: "representante", label: "Representante legal", placeholder: "Nombre del representante" },
  ];

  return (
    <div>
      <PageHeader
        title="Datos de la empresa"
        description="Información que aparece en el encabezado del acta de prestación de servicios."
      />

      <ComponentCard title="Configuración de la empresa">
        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {campos.map((campo) => (
              <Controller
                key={campo.name}
                control={control}
                name={campo.name}
                render={({ field }) => (
                  <FormField
                    label={campo.label}
                    htmlFor={campo.name}
                    required
                    error={errors[campo.name]?.message}
                  >
                    <Input
                      id={campo.name}
                      placeholder={campo.placeholder}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormField>
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={mutation.status === "submitting"}
            >
              {mutation.status === "submitting" ? "Guardando..." : "Guardar"}
            </Button>
            <Link href="/operaciones/actas">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </Form>
      </ComponentCard>
    </div>
  );
}