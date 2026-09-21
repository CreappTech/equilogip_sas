"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { urlEvidencia } from "@/features/dotacion/lib/evidencia";
import { anularEntrega } from "@/features/dotacion/actions/anularEntrega";
import {
  ESTADO_ENTREGA_LABELS,
  TIPO_ENTREGA_LABELS,
  permisoDotacion,
} from "@/features/dotacion/types/dotacion.types";
import type { EntregaDetalle } from "@/features/dotacion/types/dotacion.types";
import type { EmpresaConfigDatos } from "@/features/operaciones/types/operaciones.types";
import { useState } from "react";

const IMPRIMIR_STYLES = `
@media print {
  @page { margin: 1.4cm; }
  aside, header { display: none !important; }
  main, div[class*="ml-"] { margin-left: 0 !important; }
  .bg-gray-50 { background: #fff !important; }
  .print-oculto { display: none !important; }
}
`;

const fmtFecha = (fecha: string): string =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

function esImagen(path: string): boolean {
  return /\.(jpg|jpeg|webp)$/i.test(path);
}

interface DotacionDetalleClientProps {
  detalle: EntregaDetalle;
  empresa: EmpresaConfigDatos;
  permisos?: string[];
}

export default function DotacionDetalleClient({
  detalle,
  empresa,
  permisos: permisosServidor = [],
}: DotacionDetalleClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const [confirmarAnular, setConfirmarAnular] = useState(false);
  const mutation = useResourceMutation(anularEntrega);

  const { entrega, lineas } = detalle;
  const esAnulada = entrega.estado === "anulada";

  const puede = (accion: "ver" | "crear" | "editar" | "eliminar") => {
    const codigo = permisoDotacion(accion);
    if (
      permisosServidor.includes("*") ||
      permisosServidor.includes(codigo)
    ) {
      return true;
    }
    return can(codigo);
  };

  async function anular() {
    const result = await mutation.mutate({ id: entrega.id });
    if (result.ok) {
      toast.success("Entrega anulada", "La entrega quedó en estado anulada.");
      setConfirmarAnular(false);
      router.refresh();
    } else {
      toast.error("No se pudo anular", result.error);
    }
  }

  return (
    <div>
      <style>{IMPRIMIR_STYLES}</style>

      <div className="print-oculto">
        <PageHeader
          title="Detalle de entrega"
          description={`Entrega de dotación · ${TIPO_ENTREGA_LABELS[entrega.tipo_entrega]} · ${fmtFecha(entrega.fecha_entrega)}`}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dotacion">
                <Button type="button" variant="outline">
                  Volver
                </Button>
              </Link>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Imprimir recibo
              </Button>
              {puede("editar") && !esAnulada && (
                <Link href={`/dotacion/${entrega.id}/editar`}>
                  <Button type="button" variant="outline">
                    Editar
                  </Button>
                </Link>
              )}
              {puede("eliminar") && !esAnulada && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-error-500 ring-error-500/40 hover:bg-error-500/10"
                  onClick={() => setConfirmarAnular(true)}
                >
                  Anular
                </Button>
              )}
            </div>
          }
        />

        {esAnulada && (
          <div className="mb-4 rounded-xl border border-warning-500/40 bg-warning-50 p-4 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
            Esta entrega fue anulada. La evidencia y la firma se conservan para
            auditoría, pero la entrega no se puede editar.
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ComponentCard title="Evidencia adjunta">
            {entrega.evidencia_paths.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No se adjuntaron evidencias para esta entrega.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {entrega.evidencia_paths.map((path) =>
                  esImagen(path) ? (
                    <li
                      key={path}
                      className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urlEvidencia(path)}
                        alt="Evidencia de la entrega"
                        className="aspect-square w-full object-cover"
                      />
                    </li>
                  ) : (
                    <li
                      key={path}
                      className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <a
                        href={urlEvidencia(path)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-gray-50 text-gray-500 hover:text-brand-500 dark:bg-gray-800 dark:text-gray-400"
                      >
                        <svg
                          className="h-8 w-8"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                          <path d="M14 3v5h5" />
                        </svg>
                        <span className="px-2 text-xs">Ver PDF</span>
                      </a>
                    </li>
                  )
                )}
              </ul>
            )}
          </ComponentCard>

          <ComponentCard title="Datos de la entrega">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Empleado
                </dt>
                <dd className="font-medium text-gray-800 dark:text-white/90">
                  {detalle.empleado_nombre}
                </dd>
                <dd className="text-gray-500 dark:text-gray-400">
                  {detalle.empleado_documento}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Estado
                </dt>
                <dd>
                  <StatusBadge value={entrega.estado} labels={ESTADO_ENTREGA_LABELS} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Tipo de entrega
                </dt>
                <dd className="font-medium text-gray-800 dark:text-white/90">
                  {TIPO_ENTREGA_LABELS[entrega.tipo_entrega]}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Entregado por
                </dt>
                <dd className="font-medium text-gray-800 dark:text-white/90">
                  {entrega.entregado_por}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Observaciones
                </dt>
                <dd className="text-gray-700 dark:text-gray-300">
                  {entrega.observaciones || "—"}
                </dd>
              </div>
            </dl>
          </ComponentCard>
        </div>
      </div>

      {/* ── Recibo imprimible ─────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Encabezado */}
        <div className="mb-8 flex flex-col items-start justify-between gap-3 border-b border-gray-300 pb-4 print:mb-6 sm:flex-row print:gap-0">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {empresa.razon_social || "Razón social de la empresa"}
            </h1>
            <div className="mt-1 space-y-0.5 text-sm text-gray-600">
              {empresa.nit && <p>NIT: {empresa.nit}</p>}
              {empresa.direccion && <p>{empresa.direccion}</p>}
              {(empresa.ciudad || empresa.telefono) && (
                <p>
                  {[empresa.ciudad, empresa.telefono].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800">
              RECIBO DE ENTREGA DE DOTACIÓN
            </p>
            <p className="mt-1 text-center text-xs uppercase tracking-wide text-gray-400">
              {TIPO_ENTREGA_LABELS[entrega.tipo_entrega]}
            </p>
          </div>
        </div>

        {/* Datos del receptor */}
        <div className="mb-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 print:mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Empleado
            </p>
            <p className="font-medium text-gray-800">{detalle.empleado_nombre}</p>
            <p className="text-gray-500">Documento: {detalle.empleado_documento}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Fecha de entrega
            </p>
            <p className="font-medium text-gray-800">{fmtFecha(entrega.fecha_entrega)}</p>
            <p className="text-gray-500">Recibió de: {entrega.entregado_por}</p>
          </div>
        </div>

        {/* Tabla de elementos */}
        <div className="mb-8 print:mb-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">
            Elementos entregados
          </h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-400 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-2 font-medium">Descripción</th>
                <th className="py-2 pr-2 text-center font-medium">Cantidad</th>
                <th className="py-2 text-right font-medium">Talla</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => (
                <tr key={linea.id} className="border-b border-gray-200">
                  <td className="py-2 pr-2 text-gray-700">{linea.descripcion}</td>
                  <td className="py-2 pr-2 text-center text-gray-700">
                    {linea.cantidad}
                  </td>
                  <td className="py-2 text-right text-gray-700">
                    {linea.talla || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entrega.observaciones && (
          <div className="mb-8 text-sm print:mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Observaciones
            </p>
            <p className="text-gray-700">{entrega.observaciones}</p>
          </div>
        )}

        {/* Firmas */}
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 print:mt-8">
          <div>
            {entrega.firma_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlEvidencia(entrega.firma_path)}
                alt="Firma del receptor"
                className="mx-auto mb-2 h-24 rounded-md border border-gray-200 object-contain"
              />
            ) : (
              <div className="mb-2 h-24" />
            )}
            <div className="border-t border-gray-400 pt-2 text-center text-sm text-gray-600">
              <p className="font-medium">{detalle.empleado_nombre}</p>
              <p className="text-xs text-gray-400">Firma del receptor</p>
            </div>
          </div>
          <div>
            <div className="mb-8 h-24" />
            <div className="border-t border-gray-400 pt-2 text-center text-sm text-gray-600">
              <p className="font-medium">{entrega.entregado_por}</p>
              <p className="text-xs text-gray-400">Entrega</p>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmarAnular}
        onClose={() => setConfirmarAnular(false)}
        onConfirm={anular}
        title="¿Anular entrega?"
        message="La entrega quedará en estado anulada y no se podrá editar ni reutilizar. La evidencia y la firma se conservan para auditoría."
        confirmLabel="Anular entrega"
        variant="danger"
        loading={mutation.status === "submitting"}
      />
    </div>
  );
}