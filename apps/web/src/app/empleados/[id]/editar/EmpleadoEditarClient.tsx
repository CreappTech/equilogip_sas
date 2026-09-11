"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Combobox from "@/components/form/Combobox";
import EmptyState from "@/components/ui/states/EmptyState";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import EmpleadoForm from "../../EmpleadoForm";
import type { EmpleadoFormValues } from "../../EmpleadoForm";
import { vincularUsuario } from "@/features/empleados/actions/vincularUsuario";
import {
  nombreUsuario,
  permisoEmpleado,
} from "@/features/empleados/types/empleado.types";
import type {
  CargoOpcion,
  RrhhOpcion,
  TurnoOpcion,
  UsuarioVinculado,
  UsuarioVinculable,
} from "@/features/empleados/types/empleado.types";

interface EmpleadoEditarClientProps {
  id: string;
  initialValues: Partial<EmpleadoFormValues>;
  cargos?: CargoOpcion[];
  eps?: RrhhOpcion[];
  arl?: RrhhOpcion[];
  fondosPension?: RrhhOpcion[];
  bancos?: RrhhOpcion[];
  turnos?: TurnoOpcion[];
  usuario?: UsuarioVinculado | null;
  usuarios?: UsuarioVinculable[];
}

export default function EmpleadoEditarClient({
  id,
  initialValues,
  cargos = [],
  eps = [],
  arl = [],
  fondosPension = [],
  bancos = [],
  turnos = [],
  usuario = null,
  usuarios = [],
}: EmpleadoEditarClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const puedeVincular = can(permisoEmpleado("vincular_usuario"));

  const [perfilSeleccionado, setPerfilSeleccionado] = useState<string>(
    usuario?.id ?? ""
  );

  const mutationVincular = useResourceMutation(vincularUsuario);

  const opciones = useMemo(() => {
    const base = usuarios.map((user) => ({
      value: user.id,
      label: `${user.nombres} ${user.apellidos ?? ""} (${user.email_login ?? "sin correo"})`.trim(),
    }));
    if (usuario && !base.some((opcion) => opcion.value === usuario.id)) {
      base.unshift({
        value: usuario.id,
        label: `${usuario.nombres} ${usuario.apellidos ?? ""} (${usuario.email_login ?? ""})`.trim(),
      });
    }
    return base;
  }, [usuarios, usuario]);

  async function onVincular() {
    if (!perfilSeleccionado) return;
    const result = await mutationVincular.mutate({
      empleado_id: id,
      profile_id: perfilSeleccionado,
    });
    if (result.ok) {
      toast.success("Usuario vinculado", "El usuario se asoció al empleado.");
      router.refresh();
    } else {
      toast.error("No se pudo vincular", result.error);
    }
  }

  async function onDesvincular() {
    const result = await mutationVincular.mutate({
      empleado_id: id,
      profile_id: null,
    });
    if (result.ok) {
      toast.success("Vínculo eliminado", "El usuario quedó desasociado del empleado.");
      setPerfilSeleccionado("");
      router.refresh();
    } else {
      toast.error("No se pudo desvincular", result.error);
    }
  }

  return (
    <div>
      <PageHeader
        title="Editar empleado"
        description="Actualiza los datos del empleado."
      />

      <div className="space-y-6">
        <ComponentCard title="Información del empleado">
          <EmpleadoForm
            mode="edit"
            empleadoId={id}
            initialValues={initialValues}
            cargos={cargos}
            eps={eps}
            arl={arl}
            fondosPension={fondosPension}
            bancos={bancos}
            turnos={turnos}
          />
        </ComponentCard>

        {puedeVincular && (
          <ComponentCard title="Usuario del sistema">
            {usuario ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-gray-800 dark:text-white/90">
                    {nombreUsuario(usuario)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {usuario.email_login ?? "Sin correo de acceso"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={onDesvincular}
                  disabled={mutationVincular.status === "submitting"}
                >
                  {mutationVincular.status === "submitting"
                    ? "Guardando..."
                    : "Desvincular"}
                </Button>
              </div>
            ) : (
              <EmptyState
                title="Sin usuario vinculado"
                description="Selecciona un usuario de sistema para asociarlo a este empleado."
              />
            )}

            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Cambiar vinculación
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Combobox
                  id="profile_id"
                  name="profile_id"
                  options={opciones}
                  value={perfilSeleccionado}
                  onChange={(value) => setPerfilSeleccionado(value)}
                  placeholder={
                    usuarios.length || usuario
                      ? "Selecciona un usuario"
                      : "No hay usuarios disponibles"
                  }
                  className="w-full sm:max-w-sm"
                />
                <Button
                  onClick={onVincular}
                  disabled={
                    mutationVincular.status === "submitting" ||
                    !perfilSeleccionado ||
                    perfilSeleccionado === usuario?.id
                  }
                >
                  Vincular
                </Button>
              </div>
            </div>
          </ComponentCard>
        )}
      </div>
    </div>
  );
}