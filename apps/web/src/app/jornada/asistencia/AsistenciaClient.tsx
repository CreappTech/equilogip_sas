"use client";

import { useCallback, useState } from "react";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import LoadingState from "@/components/ui/states/LoadingState";
import EmptyState from "@/components/ui/states/EmptyState";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import {
  marcarLlegada,
  marcarSalida,
} from "@/features/jornada/actions/marcarAsistencia";
import {
  registrarNovedad,
  corregirMarcacion,
  autorizarHoraExtra,
} from "@/features/jornada/actions/registrarNovedad";
import type { CorreccionInput, AutorizacionExtraInput } from "@/features/jornada/schemas/jornadaSchema";
import { fetchAsistenciaDelDia } from "@/features/jornada/actions/fetchAsistencia";
import {
  ESTADO_MARCACION_LABELS,
  TIPO_NOVEDAD_LABELS,
  formatTime,
} from "@/features/jornada/types/jornada.types";
import type {
  ListadoAsistencia,
  TipoNovedad,
} from "@/features/jornada/types/jornada.types";

interface AsistenciaClientProps {
  initialAsistencia: ListadoAsistencia[];
  permisos?: string[];
  fechaInicial: string;
}

export default function AsistenciaClient({
  initialAsistencia,
  permisos: permisosServidor = [],
  fechaInicial,
}: AsistenciaClientProps) {
  const toast = useToast();

  const [fecha, setFecha] = useState(fechaInicial);
  const [asistencia, setAsistencia] = useState(initialAsistencia);
  const [cargando, setCargando] = useState(false);

  const mutationLlegada = useResourceMutation(marcarLlegada);
  const mutationSalida = useResourceMutation(marcarSalida);
  const mutationNovedad = useResourceMutation(registrarNovedad);
  const mutationCorreccion = useResourceMutation(
    ({ id, input }: { id: string; input: CorreccionInput }) =>
      corregirMarcacion(id, input)
  );
  const mutationAutorizar = useResourceMutation(
    ({ id, input }: { id: string; input: AutorizacionExtraInput }) =>
      autorizarHoraExtra(id, input)
  );

  const [novedadTarget, setNovedadTarget] = useState<ListadoAsistencia | null>(null);
  const [tipoNovedad, setTipoNovedad] = useState<TipoNovedad>("permiso");
  const [observacionesNovedad, setObservacionesNovedad] = useState("");

  const [correccionTarget, setCorreccionTarget] = useState<ListadoAsistencia | null>(null);
  const [campoCorreccion, setCampoCorreccion] = useState<"hora_inicio_real" | "hora_fin_real">("hora_inicio_real");
  const [valorCorreccion, setValorCorreccion] = useState("");
  const [motivoCorreccion, setMotivoCorreccion] = useState("");

  const [autorizarTarget, setAutorizarTarget] = useState<ListadoAsistencia | null>(null);
  const [motivoAutorizacion, setMotivoAutorizacion] = useState("");

  const puedeMarcar =
    permisosServidor.includes("*") ||
    permisosServidor.includes("jornada.asistencia.marcar");

  const puedeCorregir =
    permisosServidor.includes("*") ||
    permisosServidor.includes("jornada.asistencia.corregir");

  const cargarDia = useCallback(
    async (nuevaFecha: string) => {
      setCargando(true);
      try {
        const data = await fetchAsistenciaDelDia({ fecha: nuevaFecha });
        setAsistencia(data);
      } catch {
        toast.error("Error", "No se pudo cargar la asistencia.");
      } finally {
        setCargando(false);
      }
    },
    [toast]
  );

  async function onMarcarLlegada(programacionId: string) {
    const result = await mutationLlegada.mutate(programacionId);
    if (result.ok) {
      toast.success("Llegada registrada", "Se capturó la hora de llegada.");
      await cargarDia(fecha);
    } else {
      toast.error("Error", result.error);
    }
  }

  async function onMarcarSalida(marcacionId: string) {
    const result = await mutationSalida.mutate(marcacionId);
    if (result.ok) {
      toast.success("Salida registrada", "Se capturó la hora de salida.");
      await cargarDia(fecha);
    } else {
      toast.error("Error", result.error);
    }
  }

  async function onRegistrarNovedad() {
    if (!novedadTarget) return;
    const result = await mutationNovedad.mutate({
      operador_id: novedadTarget.operador_id,
      fecha,
      tipo_novedad: tipoNovedad,
      observaciones: observacionesNovedad || null,
    });
    if (result.ok) {
      toast.success("Novedad registrada", "Se registró la novedad del operador.");
      cerrarNovedad();
      await cargarDia(fecha);
    } else {
      toast.error("Error", result.error);
    }
  }

  async function onCorregirMarcacion() {
    if (!correccionTarget) return;
    const result = await mutationCorreccion.mutate({
      id: correccionTarget.id,
      input: {
        campo_corregido: campoCorreccion,
        valor_nuevo: valorCorreccion,
        motivo: motivoCorreccion,
      },
    });
    if (result.ok) {
      toast.success("Corrección registrada", "Se corrigió la marcación correctamente.");
      cerrarCorreccion();
      await cargarDia(fecha);
    } else {
      toast.error("Error", result.error);
    }
  }

  async function onAutorizarHoraExtra() {
    if (!autorizarTarget) return;
    const result = await mutationAutorizar.mutate({
      id: autorizarTarget.id,
      input: { motivo: motivoAutorizacion },
    });
    if (result.ok) {
      toast.success("Autorización registrada", "Se autorizó la hora extra.");
      cerrarAutorizacion();
    } else {
      toast.error("Error", result.error);
    }
  }

  function fechaAnterior() {
    const d = new Date(fecha);
    d.setDate(d.getDate() - 1);
    const nueva = d.toISOString().split("T")[0];
    setFecha(nueva);
    cargarDia(nueva);
  }

  function fechaSiguiente() {
    const d = new Date(fecha);
    d.setDate(d.getDate() + 1);
    const nueva = d.toISOString().split("T")[0];
    setFecha(nueva);
    cargarDia(nueva);
  }

  function cerrarNovedad() {
    setNovedadTarget(null);
    setObservacionesNovedad("");
  }

  function cerrarCorreccion() {
    setCorreccionTarget(null);
    setValorCorreccion("");
    setMotivoCorreccion("");
  }

  function cerrarAutorizacion() {
    setAutorizarTarget(null);
    setMotivoAutorizacion("");
  }

  const pendientes = asistencia.filter((a) => a.estado === "pendiente");
  const enCurso = asistencia.filter((a) => a.estado === "en_curso");
  const completadas = asistencia.filter((a) => a.estado === "completa");

  return (
    <div>
      <PageHeader
        title="Asistencia"
        description="Control diario de llegada y salida de operadores."
      />

      <ComponentCard title="Registro de asistencia del día">
        {/* Navegación de fecha */}
        <div className="mb-4 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fechaAnterior}>
            &larr;
          </Button>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <Button variant="outline" size="sm" onClick={fechaSiguiente}>
            &rarr;
          </Button>
        </div>

        {cargando ? (
          <LoadingState />
        ) : asistencia.length === 0 ? (
          <EmptyState
            title="Sin programación"
            description="No hay operadores programados para esta fecha."
          />
        ) : (
          <div className="space-y-6">
            {/* Pendientes */}
            {pendientes.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-amber-600">
                  Pendientes ({pendientes.length})
                </h3>
                <div className="space-y-2">
                  {pendientes.map((item) => (
                    <div
                      key={item.programacion_id}
                      className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-900/20"
                    >
                      <div>
                        <p className="font-medium">{item.operador_nombre}</p>
                        <p className="text-xs text-gray-500">
                          Programado: {formatTime(item.hora_inicio_programada)} &ndash;{" "}
                          {formatTime(item.hora_fin_programada)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {puedeMarcar && (
                          <Button
                            size="sm"
                            onClick={() => onMarcarLlegada(item.programacion_id)}
                            disabled={mutationLlegada.status === "submitting"}
                          >
                            Lleg&oacute;
                          </Button>
                        )}
                        {puedeCorregir && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNovedadTarget(item)}
                          >
                            Novedad
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* En curso */}
            {enCurso.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-blue-600">
                  En curso ({enCurso.length})
                </h3>
                <div className="space-y-2">
                  {enCurso.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-blue-800 dark:bg-blue-900/20"
                    >
                      <div>
                        <p className="font-medium">{item.operador_nombre}</p>
                        <p className="text-xs text-gray-500">
                          Lleg&oacute;:{" "}
                          {item.hora_inicio_real
                            ? new Date(item.hora_inicio_real).toLocaleTimeString("es-CO")
                            : "&mdash;"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {puedeMarcar && (
                          <Button
                            size="sm"
                            onClick={() => onMarcarSalida(item.id)}
                            disabled={mutationSalida.status === "submitting"}
                          >
                            Sali&oacute;
                          </Button>
                        )}
                        {puedeCorregir && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCorreccionTarget(item);
                              setCampoCorreccion("hora_inicio_real");
                            }}
                          >
                            Corregir
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completadas */}
            {completadas.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-green-600">
                  Completadas ({completadas.length})
                </h3>
                <div className="space-y-2">
                  {completadas.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-green-800 dark:bg-green-900/20"
                    >
                      <div>
                        <p className="font-medium">{item.operador_nombre}</p>
                        <p className="text-xs text-gray-500">
                          {item.hora_inicio_real
                            ? new Date(item.hora_inicio_real).toLocaleTimeString("es-CO")
                            : "&mdash;"}{" "}
                          &ndash;{" "}
                          {item.hora_fin_real
                            ? new Date(item.hora_fin_real).toLocaleTimeString("es-CO")
                            : "&mdash;"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600">
                          {ESTADO_MARCACION_LABELS.completa}
                        </span>
                        {puedeCorregir && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCorreccionTarget(item);
                              setCampoCorreccion("hora_fin_real");
                            }}
                          >
                            Corregir
                          </Button>
                        )}
                        {puedeCorregir && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAutorizarTarget(item)}
                          >
                            Autorizar HE
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ComponentCard>

      {/* Modal de novedad */}
      <Modal isOpen={!!novedadTarget} onClose={cerrarNovedad} className="max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold">
          Registrar novedad &mdash; {novedadTarget?.operador_nombre}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo de novedad</label>
            <select
              value={tipoNovedad}
              onChange={(e) => setTipoNovedad(e.target.value as TipoNovedad)}
              className="h-9 w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {Object.entries(TIPO_NOVEDAD_LABELS).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Observaciones</label>
            <textarea
              value={observacionesNovedad}
              onChange={(e) => setObservacionesNovedad(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              placeholder="Detalle de la novedad..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cerrarNovedad}>
              Cancelar
            </Button>
            <Button
              onClick={onRegistrarNovedad}
              disabled={mutationNovedad.status === "submitting"}
            >
              {mutationNovedad.status === "submitting" ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de corrección */}
      <Modal isOpen={!!correccionTarget} onClose={cerrarCorreccion} className="max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold">
          Corregir marcación &mdash; {correccionTarget?.operador_nombre}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Campo a corregir</label>
            <select
              value={campoCorreccion}
              onChange={(e) => setCampoCorreccion(e.target.value as "hora_inicio_real" | "hora_fin_real")}
              className="h-9 w-full appearance-none rounded-lg border border-gray-300 px-3 py-2 pr-9 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="hora_inicio_real">Hora de llegada</option>
              <option value="hora_fin_real">Hora de salida</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nuevo valor (HH:MM)</label>
            <input
              type="time"
              value={valorCorreccion}
              onChange={(e) => setValorCorreccion(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Motivo (obligatorio)</label>
            <textarea
              value={motivoCorreccion}
              onChange={(e) => setMotivoCorreccion(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              placeholder="Motivo de la corrección..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cerrarCorreccion}>
              Cancelar
            </Button>
            <Button
              onClick={onCorregirMarcacion}
              disabled={
                mutationCorreccion.status === "submitting" ||
                !valorCorreccion ||
                motivoCorreccion.length < 3
              }
            >
              {mutationCorreccion.status === "submitting" ? "Corrigiendo..." : "Corregir"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de autorización de hora extra */}
      <Modal isOpen={!!autorizarTarget} onClose={cerrarAutorizacion} className="max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold">
          Autorizar hora extra &mdash; {autorizarTarget?.operador_nombre}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Motivo (obligatorio)</label>
            <textarea
              value={motivoAutorizacion}
              onChange={(e) => setMotivoAutorizacion(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              placeholder="Motivo de la autorización..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cerrarAutorizacion}>
              Cancelar
            </Button>
            <Button
              onClick={onAutorizarHoraExtra}
              disabled={
                mutationAutorizar.status === "submitting" ||
                motivoAutorizacion.length < 3
              }
            >
              {mutationAutorizar.status === "submitting" ? "Autorizando..." : "Autorizar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
