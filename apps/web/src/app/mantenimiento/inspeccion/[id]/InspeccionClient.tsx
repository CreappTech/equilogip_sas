"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import FormField from "@/components/form/FormField";
import TextArea from "@/components/form/input/TextArea";
import FileInput from "@/components/form/input/FileInput";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import {
  guardarRespuesta,
  finalizarInspeccion,
} from "@/features/mantenimiento/actions/inspecciones";
import { subirEvidencia, urlEvidencia } from "@/features/mantenimiento/lib/evidencia";
import {
  guardarBorrador,
  leerBorrador,
  limpiarBorrador,
} from "@/features/mantenimiento/lib/borrador";
import { RESPUESTA_LABELS } from "@/features/mantenimiento/types/mantenimiento.types";
import type {
  DetalleInspeccion,
  OpcionRespuesta,
  PreguntaMantenimiento,
} from "@/features/mantenimiento/types/mantenimiento.types";

interface InspeccionClientProps {
  inspeccion: DetalleInspeccion;
  preguntas: PreguntaMantenimiento[];
  userId: string;
}

interface EstadoRespuesta {
  respuesta: OpcionRespuesta | "";
  justificacion: string;
  foto_path: string;
  guardando: boolean;
}

interface ResumenFinal {
  es_express: boolean;
  tiempo_segundos: number;
}

function estadoDesdeRespuesta(
  r?: { respuesta?: OpcionRespuesta | null; justificacion?: string | null; foto_path?: string | null }
): EstadoRespuesta {
  return {
    respuesta: r?.respuesta ?? "",
    justificacion: r?.justificacion ?? "",
    foto_path: r?.foto_path ?? "",
    guardando: false,
  };
}

function aRespuestasLocales(
  resp: Record<string, EstadoRespuesta>
): Record<string, { respuesta: OpcionRespuesta; justificacion: string; foto_path: string }> {
  return Object.fromEntries(
    Object.entries(resp)
      .filter(([, e]) => e.respuesta !== "")
      .map(([id, e]) => [
        id,
        {
          respuesta: e.respuesta as OpcionRespuesta,
          justificacion: e.justificacion,
          foto_path: e.foto_path,
        },
      ])
  );
}

export default function InspeccionClient({
  inspeccion,
  preguntas,
  userId,
}: InspeccionClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const preguntasMemo = useMemo(() => preguntas, [preguntas]);
  const total = preguntasMemo.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, EstadoRespuesta>>(
    () => {
      const record: Record<string, EstadoRespuesta> = {};
      for (const p of preguntasMemo) {
        record[p.id] = estadoDesdeRespuesta(
          inspeccion.respuesta_por_pregunta[p.id]
        );
      }
      return record;
    }
  );
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [resumen, setResumen] = useState<ResumenFinal | null>(null);

  const mutationFinalizar = useResourceMutation(finalizarInspeccion);

  const refCurrent = useRef(0);
  const refRespuestas = useRef(respuestas);

  const pregunta = preguntasMemo[currentIndex] ?? null;

  function persistirBorrador() {
    guardarBorrador(userId, {
      inspeccion_id: inspeccion.id,
      activo_id: inspeccion.activo_id,
      activo_nombre: inspeccion.activo_nombre ?? "",
      pregunta_actual: Math.min(
        refCurrent.current,
        Math.max(0, preguntasMemo.length - 1)
      ),
      total_preguntas: preguntasMemo.length,
      respuestas: aRespuestasLocales(refRespuestas.current),
      actualizado_en: new Date().toISOString(),
    });
  }

  // Restaura el avance local (posición y respuestas) tras el primer render
  // para evitar un desajuste de hidratación con el renderizado del servidor.
  useEffect(() => {
    if (total === 0) return;
    const local = leerBorrador(userId);
    if (!local || local.inspeccion_id !== inspeccion.id) return;

    const pos = Math.min(
      Math.max(0, local.pregunta_actual),
      Math.max(0, total - 1)
    );
    const timer = window.setTimeout(() => {
      setCurrentIndex(pos);
      refCurrent.current = pos;
      setRespuestas((prev) => {
        const next = { ...prev };
        for (const p of preguntasMemo) {
          const r = local.respuestas[p.id];
          if (r) {
            next[p.id] = {
              ...next[p.id],
              respuesta: r.respuesta,
              justificacion: r.justificacion,
              foto_path: r.foto_path,
            };
          }
        }
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [userId, inspeccion.id, total, preguntasMemo]);

  // Mantiene el espejo en refs (para callbacks asíncronos) y el borrador local al día.
  useEffect(() => {
    refCurrent.current = currentIndex;
    refRespuestas.current = respuestas;
    if (total > 0) persistirBorrador();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, respuestas, total, userId, preguntasMemo]);

  function actualizarRespuesta(
    preguntaId: string,
    cambios: Partial<EstadoRespuesta>
  ) {
    const previo = refRespuestas.current[preguntaId] ?? estadoDesdeRespuesta();
    const siguiente = { ...previo, ...cambios };
    refRespuestas.current = {
      ...refRespuestas.current,
      [preguntaId]: siguiente,
    };
    setRespuestas((prev) => ({ ...prev, [preguntaId]: siguiente }));
  }

  async function autoguardar(preguntaId: string) {
    const estado = refRespuestas.current[preguntaId];
    if (!estado || estado.respuesta === "") return;

    actualizarRespuesta(preguntaId, { guardando: true });
    const estadoConFlag = refRespuestas.current[preguntaId];
    const respuesta = estadoConFlag.respuesta;
    if (!respuesta) {
      actualizarRespuesta(preguntaId, { guardando: false });
      return;
    }

    const result = await guardarRespuesta({
      inspeccion_id: inspeccion.id,
      pregunta_id: preguntaId,
      respuesta,
      justificacion: estadoConFlag.justificacion || undefined,
      foto_path: estadoConFlag.foto_path || undefined,
    });
    actualizarRespuesta(preguntaId, { guardando: false });

    if (!result.ok) {
      toast.error("No se pudo guardar", result.error);
      return;
    }
    persistirBorrador();
  }

  function responder(opcion: OpcionRespuesta) {
    if (!pregunta || resumen) return;
    const actual = refRespuestas.current[pregunta.id];

    if (opcion === "malo") {
      actualizarRespuesta(pregunta.id, { respuesta: opcion });
      // La justificación se captura en el bloque habilitado; el guardado
      // ocurre al escribirla o al avanzar, para no guardar "malo" sin razón.
    } else if (opcion !== actual.respuesta) {
      actualizarRespuesta(pregunta.id, {
        respuesta: opcion,
        justificacion: "",
        foto_path: "",
      });
      void autoguardar(pregunta.id);
    }
  }

  function cambiarJustificacion(fotoChanged: boolean) {
    if (!pregunta || resumen) return;
    const estado = refRespuestas.current[pregunta.id];
    if (estado.respuesta !== "malo") return;
    if (!fotoChanged) programarGuardadoJustificacion();
  }

  const timerJustificacion = useRef<number | null>(null);

  function programarGuardadoJustificacion() {
    if (timerJustificacion.current) {
      window.clearTimeout(timerJustificacion.current);
    }
    timerJustificacion.current = window.setTimeout(() => {
      if (pregunta) void autoguardar(pregunta.id);
    }, 600);
  }

  function flushJustificacion(): Promise<void> {
    if (timerJustificacion.current) {
      window.clearTimeout(timerJustificacion.current);
      timerJustificacion.current = null;
    }
    const id = pregunta?.id;
    if (!id) return Promise.resolve();
    const estado = refRespuestas.current[id];
    if (!estado || estado.respuesta !== "malo") return Promise.resolve();
    return autoguardar(id);
  }

  async function onFoto(file: File | undefined) {
    if (!pregunta || resumen) return;
    if (!file) return;
    setSubiendoFoto(true);
    const result = await subirEvidencia(file);
    if (!result.ok) {
      setSubiendoFoto(false);
      toast.error("No se pudo subir la foto", result.error);
      return;
    }
    actualizarRespuesta(pregunta.id, { foto_path: result.path });
    setSubiendoFoto(false);
    void autoguardar(pregunta.id);
  }

  function irA(indice: number) {
    setCurrentIndex(indice);
    persistirBorrador();
  }

  function validarActual(): boolean {
    const estado = refRespuestas.current[pregunta?.id ?? ""];
    if (!pregunta) return false;
    if (!estado || estado.respuesta === "") {
      toast.error("Responde esta pregunta", "Selecciona Bueno, Malo o No aplica.");
      return false;
    }
    if (
      estado.respuesta === "malo" &&
      !estado.justificacion.trim()
    ) {
      toast.error(
        "Justificación obligatoria",
        "Al marcar Malo debes explicar la falla antes de continuar."
      );
      return false;
    }
    return true;
  }

  function siguiente() {
    if (!validarActual()) return;
    void flushJustificacion();
    if (currentIndex < total - 1) {
      irA(currentIndex + 1);
    }
  }

  function anterior() {
    void flushJustificacion();
    if (currentIndex > 0) irA(currentIndex - 1);
  }

  async function finalizar() {
    if (!validarActual()) return;
    await flushJustificacion();
    if (pregunta && refRespuestas.current[pregunta.id]?.respuesta) {
      await autoguardar(pregunta.id);
    }
    const result = await mutationFinalizar.mutate(inspeccion.id);
    if (!result.ok) {
      toast.error("No se pudo finalizar", result.error);
      return;
    }
    limpiarBorrador(userId);
    setResumen({
      es_express: result.extra.es_express,
      tiempo_segundos: result.extra.tiempo_segundos,
    });
  }

  if (resumen) {
    return (
      <div>
        <PageHeader
          title="Inspección finalizada"
          description="El checklist preoperacional quedó registrado"
        />
        <ComponentCard title="Resumen">
          <div className="space-y-3">
            <Alert
              variant={resumen.es_express ? "warning" : "success"}
              title={resumen.es_express ? "Inspección exprés" : "Inspección completada"}
              message={`Duración: ${Math.floor(resumen.tiempo_segundos / 60)}m ${
                resumen.tiempo_segundos % 60
              }s. ${
                resumen.es_express
                  ? "Se marcó como exprés por estar por debajo del tiempo mínimo configurado."
                  : "El tiempo registrado está dentro del rango esperado."
              }`}
            />
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={() => router.push("/mantenimiento/inspeccion")}>
                Nueva inspección
              </Button>
              {can("mantenimiento.inspecciones.ver") && (
                <Button
                  variant="outline"
                  onClick={() => router.push("/mantenimiento")}
                >
                  Ver panel
                </Button>
              )}
            </div>
          </div>
        </ComponentCard>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div>
        <PageHeader
          title="Inspección preoperacional"
          description="Equipo: "
        />
        <ComponentCard title="Sin controles">
          <Alert
            variant="info"
            title="No hay preguntas para este equipo"
            message="El administrador debe configurar preguntas del checklist antes de iniciar. Vuelve al inicio."
          />
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push("/mantenimiento/inspeccion")}>
              Volver
            </Button>
          </div>
        </ComponentCard>
      </div>
    );
  }

  const estadoActual = respuestas[pregunta.id] ?? estadoDesdeRespuesta();

  const opciones: { valor: OpcionRespuesta; classes: string; active: string }[] = [
    {
      valor: "bueno",
      classes:
        "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-500",
      active:
        "ring-2 ring-success-500 border-success-500",
    },
    {
      valor: "malo",
      classes:
        "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-500",
      active:
        "ring-2 ring-error-500 border-error-500",
    },
    {
      valor: "no_aplica",
      classes:
        "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300",
      active:
        "ring-2 ring-gray-400 border-gray-400 dark:ring-gray-500",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inspección preoperacional"
        description={`${inspeccion.activo_nombre ?? inspeccion.activo_codigo ?? "Equipo"} · ${
          inspeccion.activo_codigo ?? ""
        } · Lectura ${inspeccion.lectura} ${
          inspeccion.lectura_unidad === "kilometraje" ? "km" : "h"
        }`}
      />

      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Pregunta {currentIndex + 1} de {total}
          </span>
          <span className="text-gray-400">
            {Math.round(((currentIndex + 1) / total) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <ComponentCard
        title="Control"
        headerRight={
          <Badge color="primary" size="sm">
            {pregunta.categoria_nombre ?? "Categoría"}
          </Badge>
        }
      >
        <div className="space-y-5">
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {pregunta.texto}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {opciones.map((opc) => {
              const seleccionada = estadoActual.respuesta === opc.valor;
              return (
                <button
                  key={opc.valor}
                  type="button"
                  onClick={() => responder(opc.valor)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${opc.classes} ${
                    seleccionada ? opc.active : "hover:opacity-90"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        seleccionada ? "border-current" : "border-current opacity-30"
                      }`}
                    >
                      {seleccionada && (
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.2l-3.5-3.5-1.4 1.4L9 19l12-12-1.4-1.4z" />
                        </svg>
                      )}
                    </span>
                    {RESPUESTA_LABELS[opc.valor]}
                  </div>
                </button>
              );
            })}
          </div>

          {estadoActual.respuesta === "malo" && (
            <div className="rounded-xl border border-error-200 bg-error-50/50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
              <FormField
                label="Justificación de la falla"
                required
                error={
                  !estadoActual.justificacion.trim()
                    ? "Obligatoria para continuar"
                    : undefined
                }
                hint="Explica qué falla encontraste"
              >
                <TextArea
                  rows={3}
                  value={estadoActual.justificacion}
                  onChange={(value) => {
                    actualizarRespuesta(pregunta.id, { justificacion: value });
                    cambiarJustificacion(false);
                  }}
                  onBlur={flushJustificacion}
                  error={!estadoActual.justificacion.trim()}
                  placeholder="Describe la falla detectada"
                  disabled={subiendoFoto}
                />
              </FormField>

              <div className="mt-4">
                <FormField
                  label="Foto de evidencia (opcional)"
                  hint="JPG, PNG o WEBP · máx. 5 MB"
                >
                  <FileInput
                    onChange={(e) => void onFoto(e.target.files?.[0])}
                  />
                  {subiendoFoto && (
                    <p className="mt-2 text-xs text-gray-500">
                      Subiendo foto…
                    </p>
                  )}
                </FormField>
                {estadoActual.foto_path && (
                  <div className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlEvidencia(estadoActual.foto_path)}
                      alt="Evidencia"
                      className="h-24 w-24 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                    />
                    <button
                      type="button"
                      className="mt-2 text-xs font-medium text-error-600 dark:text-error-500"
                      onClick={() => {
                        actualizarRespuesta(pregunta.id, { foto_path: "" });
                        void autoguardar(pregunta.id);
                      }}
                    >
                      Quitar foto
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span
                className={`inline-flex items-center gap-1 ${
                  estadoActual.guardando ? "text-warning-500" : "text-success-600 dark:text-success-500"
                }`}
              >
                {estadoActual.guardando ? "Guardando…" : estadoActual.respuesta ? "Guardado" : "Sin responder"}
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={anterior}
                disabled={currentIndex === 0 || subiendoFoto}
              >
                Anterior
              </Button>
              {currentIndex === total - 1 ? (
                <Button
                  onClick={() => void finalizar()}
                  disabled={subiendoFoto || mutationFinalizar.status === "submitting"}
                >
                  {mutationFinalizar.status === "submitting"
                    ? "Finalizando…"
                    : "Finalizar inspección"}
                </Button>
              ) : (
                <Button
                  onClick={siguiente}
                  disabled={subiendoFoto}
                >
                  Siguiente
                </Button>
              )}
            </div>
          </div>
        </div>
      </ComponentCard>
    </div>
  );
}