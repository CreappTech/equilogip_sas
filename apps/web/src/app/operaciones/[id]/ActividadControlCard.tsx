"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import ComponentCard from "@/components/common/ComponentCard";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { nombreActivo } from "@/features/activos/types/activo.types";
import { nombreEmpleado } from "@/features/empleados/types/empleado.types";
import {
  ESTADO_ACTIVIDAD_LABELS,
  type CausalPausaOpcion,
  type DetalleActividad,
  type TipoEvento,
} from "@/features/operaciones/types/operaciones.types";
import {
  registrarFin,
  registrarInicio,
  registrarReanudacion,
} from "@/features/operaciones/actions/registrarEventos";
import { formatHoras } from "@/features/operaciones/utils/format";
import type { BadgeColor } from "@/components/ui/badge/Badge";
import PausaModal from "./PausaModal";

const ESTADO_COLORS: Record<string, BadgeColor> = {
  creada: "warning",
  en_curso: "success",
  pausada: "error",
  finalizada: "light",
};

const EVENTO_LABELS: Record<TipoEvento, string> = {
  inicio: "Inicio",
  pausa: "Pausa",
  reanudacion: "Reanudación",
  fin: "Fin",
};

const IconoPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconoPausa = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </svg>
);

const IconoStop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h12v12H6z" />
  </svg>
);

function CampoInfo({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
        {value}
      </p>
      {secondary ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">{secondary}</p>
      ) : null}
    </div>
  );
}

function ResumenItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

function formatFechaHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
  })} · ${d.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

interface ActividadControlCardProps {
  detalle: DetalleActividad;
  causales: CausalPausaOpcion[];
}

export default function ActividadControlCard({
  detalle,
  causales,
}: ActividadControlCardProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const puedeIniciar = can("operaciones.actividades.iniciar");
  const puedePausar = can("operaciones.actividades.pausar");
  const puedeReanudar = can("operaciones.actividades.reanudar");
  const puedeFinalizar = can("operaciones.actividades.finalizar");

  const [pausaOpen, setPausaOpen] = useState(false);
  const [confirmandoFin, setConfirmandoFin] = useState(false);

  const iniciarMut = useResourceMutation(registrarInicio);
  const reanudarMut = useResourceMutation(registrarReanudacion);
  const finalizarMut = useResourceMutation(registrarFin);

  const estado = detalle.estado;
  const finalizada = estado === "finalizada";

  async function iniciar() {
    const result = await iniciarMut.mutate(detalle.id);
    if (result.ok) {
      toast.success("Actividad iniciada", "La actividad está en curso.");
      router.refresh();
    } else {
      toast.error("No se pudo iniciar la actividad", result.error);
    }
  }

  async function reanudar() {
    const result = await reanudarMut.mutate(detalle.id);
    if (result.ok) {
      toast.success("Actividad reanudada", "La actividad está en curso.");
      router.refresh();
    } else {
      toast.error("No se pudo reanudar la actividad", result.error);
    }
  }

  async function finalizar() {
    setConfirmandoFin(false);
    const result = await finalizarMut.mutate(detalle.id);
    if (result.ok) {
      toast.success("Actividad finalizada", "La actividad se cerró correctamente.");
      router.refresh();
    } else {
      toast.error("No se pudo finalizar la actividad", result.error);
    }
  }

  return (
    <div className="space-y-6">
      <ComponentCard title="Información de la actividad">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CampoInfo
            label="Equipo"
            value={nombreActivo({
              nombre: detalle.activo_nombre,
              marca: detalle.activo_marca,
              modelo: detalle.activo_modelo,
            })}
            secondary={detalle.activo_codigo}
          />
          <CampoInfo
            label="Operador"
            value={nombreEmpleado({
              nombres: detalle.operador_nombres ?? "",
              apellidos: detalle.operador_apellidos ?? "",
            })}
          />
          <CampoInfo
            label="Centro de servicio"
            value={detalle.centro_servicio_nombre ?? "—"}
          />
          <CampoInfo
            label="Tipo de actividad"
            value={detalle.tipo_actividad_nombre ?? "—"}
          />
          <CampoInfo label="Cliente" value={detalle.cliente_nombre ?? "—"} />
          <CampoInfo
            label="Fecha de creación"
            value={formatFechaHora(detalle.fecha_creacion)}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <StatusBadge
            value={estado}
            colors={ESTADO_COLORS}
            labels={ESTADO_ACTIVIDAD_LABELS}
          />

          {finalizada ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Actividad cerrada — no se puede modificar.
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {estado === "creada" && puedeIniciar && (
                <Button
                  startIcon={<IconoPlay />}
                  disabled={iniciarMut.status === "submitting"}
                  onClick={iniciar}
                >
                  {iniciarMut.status === "submitting"
                    ? "Iniciando..."
                    : "Iniciar actividad"}
                </Button>
              )}

              {estado === "en_curso" && puedePausar && (
                <Button
                  variant="outline"
                  startIcon={<IconoPausa />}
                  onClick={() => setPausaOpen(true)}
                >
                  Pausar
                </Button>
              )}

              {estado === "pausada" && puedeReanudar && (
                <Button
                  startIcon={<IconoPlay />}
                  disabled={reanudarMut.status === "submitting"}
                  onClick={reanudar}
                >
                  {reanudarMut.status === "submitting"
                    ? "Reanudando..."
                    : "Reanudar actividad"}
                </Button>
              )}

              {(estado === "en_curso" || estado === "pausada") &&
                puedeFinalizar && (
                  <Button
                    variant="outline"
                    startIcon={<IconoStop />}
                    onClick={() => setConfirmandoFin(true)}
                  >
                    Finalizar
                  </Button>
                )}
            </div>
          )}
        </div>
      </ComponentCard>

      <ComponentCard title="Resumen">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ResumenItem
            label="Trabajado"
            value={formatHoras(detalle.horas_trabajadas)}
          />
          <ResumenItem
            label="Limitado"
            value={formatHoras(detalle.horas_limitadas)}
          />
          <ResumenItem
            label="Novedades"
            value={detalle.total_novedades === 0 ? "—" : `${detalle.total_novedades}`}
          />
          <ResumenItem label="Inicio" value={formatFechaHora(detalle.inicio_hora)} />
          <ResumenItem label="Fin" value={formatFechaHora(detalle.fin_hora)} />
        </div>
      </ComponentCard>

      <ComponentCard title="Bitácora" desc="Eventos registrados del ciclo de vida de la actividad.">
        {detalle.eventos.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sin eventos registrados. Inicia la actividad para comenzar la bitácora.
          </p>
        ) : (
          <div>
            {detalle.eventos.map((evento) => (
              <div
                key={evento.id}
                className="flex flex-col gap-1 border-b border-gray-100 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4 dark:border-gray-800"
              >
                <span className="text-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                  {new Date(evento.fecha_hora).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={`text-sm font-medium ${
                    evento.tipo_evento === "pausa"
                      ? "text-error-500"
                      : evento.tipo_evento === "fin"
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-success-500"
                  }`}
                >
                  {EVENTO_LABELS[evento.tipo_evento]}
                </span>
                <span
                  className="text-sm text-gray-500 sm:flex-1 dark:text-gray-400"
                >
                  {evento.causal_nombre
                    ? `${evento.causal_nombre}${
                        evento.observaciones ? ` — ${evento.observaciones}` : ""
                      }`
                    : evento.observaciones ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </ComponentCard>

      <PausaModal
        actividadId={detalle.id}
        causales={causales}
        isOpen={pausaOpen}
        onClose={() => setPausaOpen(false)}
        onSuccess={() => router.refresh()}
      />

      <ConfirmDialog
        isOpen={confirmandoFin}
        onClose={() => setConfirmandoFin(false)}
        onConfirm={finalizar}
        title="Finalizar actividad"
        message="La actividad se cerrará y no podrá modificarse. ¿Deseas continuar?"
        confirmLabel="Finalizar"
        variant="danger"
        loading={finalizarMut.status === "submitting"}
      />
    </div>
  );
}