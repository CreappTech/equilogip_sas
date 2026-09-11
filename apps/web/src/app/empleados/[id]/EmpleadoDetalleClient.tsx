"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import EmptyState from "@/components/ui/states/EmptyState";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { retirarEmpleado } from "@/features/empleados/actions/retirarEmpleado";
import {
  ESTADO_EMPLEADO_LABELS,
  nombreEmpleado,
  nombreUsuario,
  permisoEmpleado,
} from "@/features/empleados/types/empleado.types";
import type { EmpleadoDetalle } from "@/features/empleados/types/empleado.types";

interface EmpleadoDetalleClientProps {
  detalle: EmpleadoDetalle;
}

function FilaDetalle({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[240px_1fr]">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-sm text-gray-800 dark:text-white/90">{value}</dd>
    </div>
  );
}

export default function EmpleadoDetalleClient({
  detalle,
}: EmpleadoDetalleClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const [confirmarRetiro, setConfirmarRetiro] = useState(false);

  const mutation = useResourceMutation(retirarEmpleado);

  const { empleado, usuario } = detalle;
  const retirado = empleado.estado === "retirado";

  const referencia = nombreEmpleado(empleado);

  const puedeEditar = !retirado && can(permisoEmpleado("editar"));
  const puedeRetirar = !retirado && can(permisoEmpleado("eliminar"));

  async function onConfirmarRetiro() {
    const result = await mutation.mutate({ id: empleado.id });
    if (result.ok) {
      toast.success("Empleado retirado", `${referencia} pasó a estado retirado.`);
      setConfirmarRetiro(false);
      router.refresh();
    } else {
      toast.error("No se pudo retirar", result.error);
    }
  }

  return (
    <div>
      <PageHeader
        title={referencia}
        description={detalle.cargo_nombre ?? "Empleado"}
        actions={
          <>
            <Link href="/empleados">
              <Button variant="outline">Volver al listado</Button>
            </Link>
            {puedeEditar && (
              <Link href={`/empleados/${empleado.id}/editar`}>
                <Button variant="outline">Editar</Button>
              </Link>
            )}
            {puedeRetirar && (
              <Button onClick={() => setConfirmarRetiro(true)}>Retirar</Button>
            )}
          </>
        }
      />

      <div className="space-y-6">
        <ComponentCard title="Datos generales">
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            <FilaDetalle label="Nombre" value={referencia} />
            <FilaDetalle label="Documento de identidad" value={empleado.documento_identidad} />
            <FilaDetalle
              label="Estado"
              value={
                <StatusBadge value={empleado.estado} labels={ESTADO_EMPLEADO_LABELS} />
              }
            />
            <FilaDetalle
              label="Cargo"
              value={detalle.cargo_nombre ?? "—"}
            />
            <FilaDetalle
              label="Turno habitual"
              value={detalle.turno_nombre ?? "—"}
            />
            <FilaDetalle
              label="Fecha de nacimiento"
              value={empleado.fecha_nacimiento ?? "—"}
            />
            <FilaDetalle label="Fecha de ingreso" value={empleado.fecha_ingreso} />
            <FilaDetalle label="Teléfono" value={empleado.telefono ?? "—"} />
            <FilaDetalle
              label="Correo de contacto"
              value={empleado.email_contacto ?? "—"}
            />
            <FilaDetalle
              label="Creado"
              value={new Date(empleado.created_at).toLocaleString("es-CO")}
            />
          </dl>
        </ComponentCard>

        <ComponentCard title="Seguridad social">
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            <FilaDetalle label="EPS" value={detalle.eps_nombre ?? "—"} />
            <FilaDetalle label="ARL" value={detalle.arl_nombre ?? "—"} />
            <FilaDetalle
              label="Fondo de pensión"
              value={detalle.fondo_pension_nombre ?? "—"}
            />
            <FilaDetalle label="Talla camisa" value={empleado.talla_camisa ?? "—"} />
            <FilaDetalle
              label="Talla pantalón"
              value={empleado.talla_pantalon ?? "—"}
            />
            <FilaDetalle label="Talla zapatos" value={empleado.talla_zapato ?? "—"} />
          </dl>
        </ComponentCard>

        <ComponentCard title="Información financiera">
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            <FilaDetalle label="Banco" value={detalle.banco_nombre ?? "—"} />
            <FilaDetalle label="Número de cuenta" value={empleado.numero_cuenta ?? "—"} />
          </dl>
        </ComponentCard>

        <ComponentCard title="Contacto de emergencia">
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            <FilaDetalle
              label="Nombre"
              value={
                empleado.contacto_emergencia_nombres ||
                empleado.contacto_emergencia_apellidos
                  ? `${empleado.contacto_emergencia_nombres ?? ""} ${empleado.contacto_emergencia_apellidos ?? ""}`.trim()
                  : "—"
              }
            />
            <FilaDetalle
              label="Teléfono"
              value={empleado.contacto_emergencia_telefono ?? "—"}
            />
          </dl>
        </ComponentCard>

        <ComponentCard title="Hijos">
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            <FilaDetalle
              label="Cantidad"
              value={empleado.cantidad_hijos != null ? String(empleado.cantidad_hijos) : "—"}
            />
            <FilaDetalle
              label="Edades"
              value={
                empleado.edades_hijos && empleado.edades_hijos.length > 0
                  ? empleado.edades_hijos.map(String).join(", ")
                  : "—"
              }
            />
          </dl>
        </ComponentCard>

        <ComponentCard title="Usuario del sistema">
          {usuario ? (
            <dl className="divide-y divide-gray-100 dark:divide-gray-800">
              <FilaDetalle label="Nombre" value={nombreUsuario(usuario)} />
              <FilaDetalle label="Correo de acceso" value={usuario.email_login ?? "—"} />
              <FilaDetalle
                label="Usuario activo"
                value={usuario.activo ? "Sí" : "No"}
              />
            </dl>
          ) : (
            <EmptyState
              title="Sin usuario vinculado"
              description={
                puedeEditar
                  ? "Este empleado no tiene cuenta de acceso al sistema. Puedes vincular una desde la edición."
                  : "Este empleado no tiene cuenta de acceso al sistema."
              }
              action={
                puedeEditar ? (
                  <Link href={`/empleados/${empleado.id}/editar`}>
                    <Button variant="outline">Vincular usuario</Button>
                  </Link>
                ) : undefined
              }
            />
          )}
        </ComponentCard>
      </div>

      <ConfirmDialog
        isOpen={confirmarRetiro}
        onClose={() => setConfirmarRetiro(false)}
        onConfirm={onConfirmarRetiro}
        title="¿Retirar empleado?"
        message={`"${referencia}" pasará a estado retirado. Esta acción no se puede revertir.`}
        confirmLabel="Retirar"
        variant="danger"
        loading={mutation.status === "submitting"}
      />
    </div>
  );
}