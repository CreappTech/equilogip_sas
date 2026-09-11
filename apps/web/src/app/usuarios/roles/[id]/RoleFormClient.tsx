"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";

import type { Rol } from "@/lib/queries/roles";
import type { PermisoAgrupado } from "@/lib/queries/permisos";
import {
  crearRol as crearRolAction,
  actualizarPermisosRol as actualizarPermisosRolAction,
} from "@/app/usuarios/actions";

const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  codigo: z
    .string()
    .min(1, "El código es obligatorio.")
    .regex(/^[A-Z0-9_]+$/, "Solo mayúsculas, números y guiones bajos.")
    .toUpperCase(),
  descripcion: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  rol: Rol | null;
  permisosIdsIniciales: string[];
  permisosAgrupados: PermisoAgrupado[];
  esNuevo: boolean;
}

export default function RoleFormClient({
  rol,
  permisosIdsIniciales,
  permisosAgrupados,
  esNuevo,
}: Props) {
  const router = useRouter();
  const [selectedPermisos, setSelectedPermisos] = useState<string[]>(
    permisosIdsIniciales
  );
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<{
    tipo: "success" | "error";
    mensaje: string;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: rol?.nombre ?? "",
      codigo: rol?.codigo ?? "",
      descripcion: rol?.descripcion ?? "",
    },
  });

  function togglePermiso(permisoId: string) {
    setSelectedPermisos((prev) =>
      prev.includes(permisoId)
        ? prev.filter((id) => id !== permisoId)
        : [...prev, permisoId]
    );
  }

  function toggleAllInModule(permisos: { id: string }[]) {
    const ids = permisos.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPermisos.includes(id));
    if (allSelected) {
      setSelectedPermisos((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedPermisos((prev) => [
        ...prev,
        ...ids.filter((id) => !prev.includes(id)),
      ]);
    }
  }

  async function onSubmit(data: FormValues) {
    setGuardando(true);
    setFeedback(null);

    if (esNuevo) {
      const res = await crearRolAction({
        nombre: data.nombre,
        codigo: data.codigo,
        descripcion: data.descripcion,
        permisoIds: selectedPermisos,
      });
      setGuardando(false);
      if (res.ok) {
        setFeedback({ tipo: "success", mensaje: "Rol creado correctamente." });
        setTimeout(() => router.push("/usuarios/roles"), 1000);
      } else {
        setFeedback({ tipo: "error", mensaje: res.error });
      }
    } else if (rol) {
      const res = await actualizarPermisosRolAction(rol.id, selectedPermisos);
      setGuardando(false);
      if (res.ok) {
        setFeedback({
          tipo: "success",
          mensaje: "Permisos actualizados correctamente.",
        });
      } else {
        setFeedback({ tipo: "error", mensaje: res.error });
      }
    }
  }

  const titulo = esNuevo ? "Nuevo rol" : `Editar: ${rol?.nombre}`;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageBreadcrumb pageTitle={titulo} />

      {feedback && (
        <div
          className={`mb-4 rounded-xl border p-4 text-sm ${
            feedback.tipo === "success"
              ? "border-success-500 bg-success-50 text-success-700 dark:bg-success-500/10"
              : "border-error-500 bg-error-50 text-error-700 dark:bg-error-500/10"
          }`}
        >
          {feedback.mensaje}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ComponentCard title="Datos del rol">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre *</Label>
              <Controller
                name="nombre"
                control={form.control}
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="Ej: Editor"
                    error={Boolean(form.formState.errors.nombre)}
                  />
                )}
              />
              {form.formState.errors.nombre && (
                <p className="mt-1 text-xs text-error-500">
                  {form.formState.errors.nombre.message}
                </p>
              )}
            </div>
            <div>
              <Label>Código *</Label>
              <Controller
                name="codigo"
                control={form.control}
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    placeholder="EJ: EDITOR"
                    error={Boolean(form.formState.errors.codigo)}
                    disabled={!esNuevo}
                  />
                )}
              />
              {form.formState.errors.codigo && (
                <p className="mt-1 text-xs text-error-500">
                  {form.formState.errors.codigo.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <Controller
              name="descripcion"
              control={form.control}
              render={({ field }) => (
                <Input
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="Opcional"
                />
              )}
            />
          </div>
        </ComponentCard>

        <div className="mt-6">
          <ComponentCard title="Permisos">
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Selecciona los permisos que tendrán los usuarios con este rol.
            </p>
            <div className="space-y-6">
              {permisosAgrupados.map((modulo) => (
                <div key={modulo.modulo}>
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="text-sm font-semibold uppercase text-gray-700 dark:text-gray-300">
                      {modulo.modulo}
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        toggleAllInModule(
                          modulo.recursos.flatMap((r) => r.permisos)
                        )
                      }
                      className="text-xs text-brand-500 hover:text-brand-600"
                    >
                      {modulo.recursos
                        .flatMap((r) => r.permisos)
                        .every((p) => selectedPermisos.includes(p.id))
                        ? "Desmarcar todo"
                        : "Marcar todo"}
                    </button>
                  </div>
                  {modulo.recursos.map((recurso) => (
                    <div key={recurso.recurso} className="ml-4 mb-3">
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                        {recurso.recurso}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {recurso.permisos.map((permiso) => (
                          <label
                            key={permiso.id}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <Checkbox
                              checked={selectedPermisos.includes(permiso.id)}
                              onChange={() => togglePermiso(permiso.id)}
                              label={permiso.accion}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ComponentCard>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push("/usuarios/roles")}
          >
            Volver
          </Button>
          <Button type="submit" disabled={guardando}>
            {guardando
              ? "Guardando..."
              : esNuevo
                ? "Crear rol"
                : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
