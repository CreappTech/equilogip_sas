"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import StatusBadge from "@/components/common/StatusBadge";
import Tabs from "@/components/ui/tabs/Tabs";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { retirarActivo } from "@/features/activos/actions/retirarActivo";
import {
  ESTADO_ACTIVO_LABELS,
  ESTADO_OPERATIVO_ACTIVO_LABELS,
  ORIGEN_ACTIVO_LABELS,
  SUBTIPO_ACTIVO_LABELS,
  TIPO_ACTIVO_LABELS,
  nombreActivo,
  permisoActivo,
} from "@/features/activos/types/activo.types";
import type { ActivoDetalle } from "@/features/activos/types/activo.types";
import { labelCampoTecnico } from "@/features/activos/types/fichaTecnica";

interface ActivoDetalleClientProps {
  detalle: ActivoDetalle;
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

export default function ActivoDetalleClient({
  detalle,
}: ActivoDetalleClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const [confirmarRetiro, setConfirmarRetiro] = useState(false);

  const mutation = useResourceMutation(retirarActivo);

  const { activo } = detalle;
  const tipo = activo.tipo;
  const retirado = activo.estado === "retirado";

  const esVehiculo = tipo === "vehiculo";
  const especifico = esVehiculo
    ? detalle.vehiculo
    : tipo === "maquina"
      ? detalle.maquina
      : detalle.equipo;

  const referencia = nombreActivo({
    nombre: activo.nombre,
    marca: especifico?.marca,
    modelo: especifico?.modelo,
  });

  const puedeEditar = !retirado && can(permisoActivo(tipo, "editar"));
  const puedeRetirar = !retirado && can(permisoActivo(tipo, "eliminar"));

  async function onConfirmarRetiro() {
    const result = await mutation.mutate({ id: activo.id });
    if (result.ok) {
      toast.success("Activo retirado", `${referencia} pasó a estado retirado.`);
      setConfirmarRetiro(false);
      router.refresh();
    } else {
      toast.error("No se pudo retirar", result.error);
    }
  }

  const camposTecnicos = Object.entries(activo.datos_tecnicos ?? {}).filter(
    ([, valor]) => valor !== "" && (!Array.isArray(valor) || valor.length > 0)
  );
  const camposFabricante = Object.entries(activo.datos_fabricante ?? {}).filter(
    ([, valor]) => valor !== ""
  );
  const hayFicha =
    camposTecnicos.length > 0 || camposFabricante.length > 0;

  const tabs = [
    {
      key: "generales",
      label: "Datos generales",
      content: (
        <ComponentCard title="Datos generales">
          <dl className="divide-y divide-gray-100 dark:divide-gray-800">
            <FilaDetalle label="Código interno" value={activo.codigo_interno} />
            <FilaDetalle label="Referencia" value={referencia} />
            <FilaDetalle label="Categoría" value={TIPO_ACTIVO_LABELS[tipo]} />
            <FilaDetalle
              label="Tipo de equipo"
              value={activo.subtipo ? SUBTIPO_ACTIVO_LABELS[activo.subtipo] : "—"}
            />
            <FilaDetalle
              label="Estado"
              value={
                <StatusBadge value={activo.estado} labels={ESTADO_ACTIVO_LABELS} />
              }
            />
            <FilaDetalle
              label="Estado operativo"
              value={
                <StatusBadge
                  value={activo.estado_operativo}
                  labels={ESTADO_OPERATIVO_ACTIVO_LABELS}
                />
              }
            />
            <FilaDetalle
              label="Marca"
              value={especifico?.marca ?? "—"}
            />
            <FilaDetalle
              label="Modelo"
              value={especifico?.modelo ?? "—"}
            />
            <FilaDetalle
              label="Año"
              value={especifico?.anio?.toString() ?? "—"}
            />
            {esVehiculo && (
              <FilaDetalle label="Placa" value={detalle.vehiculo?.placa ?? "—"} />
            )}
            <FilaDetalle label="Serie / VIN / Chasis" value={activo.serie ?? "—"} />
            <FilaDetalle label="Número de motor" value={activo.numero_motor ?? "—"} />
            <FilaDetalle label="Color" value={activo.color ?? "—"} />
            <FilaDetalle
              label="Horómetro / Kilometraje inicial"
              value={
                activo.lectura_inicial === null || activo.lectura_inicial === undefined
                  ? "—"
                  : activo.lectura_inicial.toString()
              }
            />
            <FilaDetalle
              label="Sede / Ubicación"
              value={detalle.centro_servicio_nombre ?? "—"}
            />
            <FilaDetalle
              label="Origen"
              value={ORIGEN_ACTIVO_LABELS[activo.origen]}
            />
            <FilaDetalle
              label="Proveedor de subarriendo"
              value={detalle.proveedor_nombre ?? "—"}
            />
            <FilaDetalle
              label="Fecha de adquisición"
              value={activo.fecha_adquisicion ?? "—"}
            />
            <FilaDetalle
              label="Creado"
              value={new Date(activo.created_at).toLocaleString("es-CO")}
            />
          </dl>
        </ComponentCard>
      ),
    },
    ...(hayFicha
      ? [
          {
            key: "ficha",
            label: "Ficha técnica y fabricante",
            content: (
              <div className="space-y-6">
                {camposTecnicos.length > 0 && (
                  <ComponentCard title="Ficha técnica">
                    <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                      {camposTecnicos.map(([clave, valor]) => (
                        <FilaDetalle
                          key={clave}
                          label={labelCampoTecnico(clave)}
                          value={
                            Array.isArray(valor) ? valor.join(", ") : valor
                          }
                        />
                      ))}
                    </dl>
                  </ComponentCard>
                )}
                {camposFabricante.length > 0 && (
                  <ComponentCard title="Información del fabricante">
                    <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                      {camposFabricante.map(([clave, valor]) => (
                        <FilaDetalle
                          key={clave}
                          label={labelCampoTecnico(clave)}
                          value={valor ?? "—"}
                        />
                      ))}
                    </dl>
                  </ComponentCard>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={referencia}
        description={`${TIPO_ACTIVO_LABELS[tipo]} · ${activo.codigo_interno}`}
        actions={
          <>
            <Link href="/activos">
              <Button variant="outline">Volver al listado</Button>
            </Link>
            {puedeEditar && (
              <Link href={`/activos/${activo.id}/editar`}>
                <Button variant="outline">Editar</Button>
              </Link>
            )}
            {puedeRetirar && (
              <Button onClick={() => setConfirmarRetiro(true)}>Retirar</Button>
            )}
          </>
        }
      />

      <Tabs items={tabs} defaultActiveKey="generales" />

      <ConfirmDialog
        isOpen={confirmarRetiro}
        onClose={() => setConfirmarRetiro(false)}
        onConfirm={onConfirmarRetiro}
        title="¿Retirar activo?"
        message={`"${referencia}" pasará a estado retirado. Esta acción no se puede revertir.`}
        confirmLabel="Retirar"
        variant="danger"
        loading={mutation.status === "submitting"}
      />
    </div>
  );
}