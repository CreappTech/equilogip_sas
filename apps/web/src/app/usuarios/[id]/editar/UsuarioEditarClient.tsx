"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";

import { actualizarUsuario as actualizarUsuarioAction } from "../../actions";

import type { ListadoUsuario } from "@/lib/queries/usuarios";
import type { Rol } from "@/lib/queries/roles";

const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  apellido: z.string().min(1, "El apellido es obligatorio."),
  numeroDocumento: z.string().min(1, "El número de documento es obligatorio."),
  telefono: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UsuarioEditarClientProps {
  id: string;
  usuario: ListadoUsuario;
  roles: Rol[];
  canAsignarRoles: boolean;
  esSuperAdmin: boolean;
}

export default function UsuarioEditarClient({
  id,
  usuario,
  roles,
  canAsignarRoles,
  esSuperAdmin,
}: UsuarioEditarClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [rolesElegidos, setRolesElegidos] = useState<string[]>(
    usuario.roles.map((r) => r.id)
  );
  const [guardando, setGuardando] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: usuario.nombres,
      apellido: usuario.apellidos,
      numeroDocumento: usuario.numero_documento,
      telefono: usuario.telefono ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setGuardando(true);
    const res = await actualizarUsuarioAction({
      id,
      nombre: data.nombre,
      apellido: data.apellido,
      numeroDocumento: data.numeroDocumento,
      telefono: data.telefono || undefined,
      rolIds: canAsignarRoles ? rolesElegidos : undefined,
    });
    setGuardando(false);
    if (res.ok) {
      toast.success("Usuario actualizado", "Los datos se guardaron correctamente.");
      router.push(`/usuarios/${id}`);
    } else {
      toast.error("No se pudo actualizar", res.error);
      reset();
    }
  }

  return (
    <div>
      <PageHeader
        title="Editar usuario"
        description={`${usuario.nombres} ${usuario.apellidos} · ${usuario.email_login}`}
        actions={
          <Link href={`/usuarios/${id}`}>
            <Button variant="outline">Cancelar</Button>
          </Link>
        }
      />

      <ComponentCard title="Datos del usuario">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre *</Label>
              <Controller
                name="nombre"
                control={control}
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="Nombre"
                    error={Boolean(errors.nombre)}
                  />
                )}
              />
            </div>
            <div>
              <Label>Apellido *</Label>
              <Controller
                name="apellido"
                control={control}
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="Apellido"
                    error={Boolean(errors.apellido)}
                  />
                )}
              />
            </div>
          </div>

          <div>
            <Label>Número de documento *</Label>
            <Controller
              name="numeroDocumento"
              control={control}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="Número de documento"
                  error={Boolean(errors.numeroDocumento)}
                />
              )}
            />
          </div>

          <div>
            <Label>Teléfono</Label>
            <Controller
              name="telefono"
              control={control}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="Opcional"
                />
              )}
            />
          </div>

          <div>
            <Label>Roles</Label>
            {canAsignarRoles ? (
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => {
                  const activo = rolesElegidos.includes(r.id);
                  const noPermitido =
                    r.codigo === "AUTH_SUPER_ADMIN" && !esSuperAdmin;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={noPermitido}
                      onClick={() =>
                        setRolesElegidos((prev) =>
                          activo ? prev.filter((x) => x !== r.id) : [...prev, r.id]
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        activo
                          ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15"
                          : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {r.nombre}
                      {noPermitido && (
                        <span className="text-xs text-gray-400">
                          (no permitido)
                        </span>
                      )}
                    </button>
                  );
                })}
                {roles.length === 0 && (
                  <span className="text-sm text-gray-400">
                    No hay roles disponibles.
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {usuario.roles.length === 0 && (
                  <span className="text-sm text-gray-400">Sin roles</span>
                )}
                {usuario.roles.map((r) => (
                  <span
                    key={r.codigo}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-500 bg-brand-50 px-3 py-1 text-sm text-brand-600 dark:bg-brand-500/15"
                  >
                    {r.nombre}
                  </span>
                ))}
              </div>
            )}
            {!canAsignarRoles && (
              <p className="mt-2 text-xs text-gray-400">
                No tienes permiso para gestionar roles.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}