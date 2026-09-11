"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/button/Button";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { generarActa } from "@/features/operaciones/actions/actas";
import { formatHoras } from "@/features/operaciones/utils/format";
import type {
  ActaDocumento,
  ActaTablaARow,
  ActaTablaBRow,
} from "@/features/operaciones/types/operaciones.types";
import type { ActaPreviewGeneracion } from "./page";

interface ActaPreviewProps {
  documento: ActaDocumento;
  generacion?: ActaPreviewGeneracion;
}

const IMPRIMIR_STYLES = `
@media print {
  @page { margin: 1.4cm; }
  aside, header { display: none !important; }
  main, div[class*="ml-"] { margin-left: 0 !important; }
  .bg-gray-50 { background: #fff !important; }
}
`;

const fmtFechaHora = (iso: string): string =>
  new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const fmtHora = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtDia = (fecha: string): string =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export default function ActaPreview({ documento, generacion }: ActaPreviewProps) {
  const router = useRouter();
  const toast = useToast();
  const guardado = useResourceMutation<ActaPreviewGeneracion>(generarActa);

  async function guardar() {
    if (!generacion) return;
    const result = await guardado.mutate(generacion);
    if (result.ok) {
      toast.success("Acta guardada", "El acta se guardó correctamente.");
      router.push("/operaciones/actas");
      router.refresh();
    } else {
      toast.error("No se pudo guardar el acta", result.error);
    }
  }

  return (
    <div>
      <style>{IMPRIMIR_STYLES}</style>

      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <Link href="/operaciones/actas">
          <Button type="button" variant="outline">
            Volver
          </Button>
        </Link>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Imprimir
        </Button>
        {generacion && (
          <Button
            type="button"
            onClick={guardar}
            disabled={guardado.status === "submitting"}
          >
            {guardado.status === "submitting" ? "Guardando..." : "Guardar acta"}
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Encabezado */}
        <div className="mb-8 border-b border-gray-300 pb-4 print:mb-6">
          <h1 className="text-lg font-bold text-gray-900">
            {documento.empresa.razon_social || "Razón social de la empresa"}
          </h1>
          <div className="mt-1 grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm text-gray-600 sm:grid-cols-2">
            {documento.empresa.nit && (
              <p>
                <span className="font-medium">NIT:</span> {documento.empresa.nit}
              </p>
            )}
            {documento.empresa.direccion && (
              <p>
                <span className="font-medium">Dirección:</span>{" "}
                {documento.empresa.direccion}
              </p>
            )}
            {documento.empresa.ciudad && (
              <p>
                <span className="font-medium">Ciudad:</span>{" "}
                {documento.empresa.ciudad}
              </p>
            )}
            {documento.empresa.telefono && (
              <p>
                <span className="font-medium">Teléfono:</span>{" "}
                {documento.empresa.telefono}
              </p>
            )}
          </div>
        </div>

        {/* Título y datos del acta */}
        <div className="mb-6 print:mb-5">
          <h2 className="text-center text-base font-semibold text-gray-800">
            ACTA DE PRESTACIÓN DE SERVICIOS
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
            <p>
              {documento.numero ? (
                <>
                  <span className="font-medium">No.:</span> {documento.numero}
                </>
              ) : (
                <span className="italic text-gray-400">SIN NÚMERO</span>
              )}
            </p>
            {documento.fecha_generacion && (
              <p>
                <span className="font-medium">Fecha de generación:</span>{" "}
                {fmtFechaHora(documento.fecha_generacion)}
              </p>
            )}
          </div>
        </div>

        {/* Datos del servicio */}
        <div className="mb-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 print:mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Cliente
            </p>
            <p className="font-medium text-gray-800">{documento.cliente_nombre}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Equipo
            </p>
            <p className="font-medium text-gray-800">
              {documento.equipo.codigo_interno}
              {documento.equipo.nombre ? ` — ${documento.equipo.nombre}` : ""}
            </p>
            {documento.equipo.marca || documento.equipo.modelo ? (
              <p className="text-gray-500">
                {[documento.equipo.marca, documento.equipo.modelo]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Periodo
            </p>
            <p className="font-medium text-gray-800">
              {fmtDia(documento.periodo_inicio)} —{" "}
              {fmtDia(documento.periodo_fin)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Representante legal
            </p>
            <p className="font-medium text-gray-800">
              {documento.empresa.representante || "—"}
            </p>
          </div>
        </div>

        {/* Tabla A: detalle de actividades */}
        <div className="mb-6 print:mb-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">
            Detalle de actividades
          </h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-400 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-2 font-medium">Fecha</th>
                <th className="py-2 pr-2 font-medium">Inicio</th>
                <th className="py-2 pr-2 font-medium">Fin</th>
                <th className="py-2 text-right font-medium">Horas trabajadas</th>
              </tr>
            </thead>
            <tbody>
              {documento.tabla_a.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-400">
                    Sin actividades registradas en el periodo.
                  </td>
                </tr>
              ) : (
                documento.tabla_a.map((fila: ActaTablaARow) => (
                  <tr key={fila.fecha + fila.inicio} className="border-b border-gray-200">
                    <td className="py-2 pr-2 text-gray-700">
                      {fmtFechaHora(fila.fecha)}
                    </td>
                    <td className="py-2 pr-2 text-gray-700">{fmtHora(fila.inicio)}</td>
                    <td className="py-2 pr-2 text-gray-700">{fmtHora(fila.fin)}</td>
                    <td className="py-2 text-right text-gray-700">
                      {formatHoras(fila.horas_trabajadas)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-400 font-semibold text-gray-800">
                <td colSpan={3} className="py-2 pr-2 text-right">
                  Total horas trabajadas
                </td>
                <td className="py-2 text-right">
                  {formatHoras(documento.horas_trabajadas)}
                </td>
              </tr>
              <tr className="text-gray-600">
                <td colSpan={4} className="pb-2 pt-1 text-right">
                  Número de actividades: {documento.total_actividades}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Tabla B: novedades */}
        <div className="mb-8 print:mb-6">
          <h3 className="mb-2 text-sm font-semibold text-gray-800">
            Novedades del periodo
          </h3>
          {documento.tabla_b.length === 0 ? (
            <p className="text-sm text-gray-400">
              Sin novedades registradas en el periodo.
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-400 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-2 font-medium">Fecha</th>
                  <th className="py-2 pr-2 font-medium">Causal</th>
                  <th className="py-2 pr-2 font-medium">Observaciones</th>
                  <th className="py-2 text-right font-medium">Duración</th>
                </tr>
              </thead>
              <tbody>
                {documento.tabla_b.map((fila: ActaTablaBRow) => (
                  <tr key={fila.fecha} className="border-b border-gray-200">
                    <td className="py-2 pr-2 text-gray-700">
                      {fmtFechaHora(fila.fecha)}
                    </td>
                    <td className="py-2 pr-2 text-gray-700">
                      {fila.causal_nombre ?? "—"}
                    </td>
                    <td className="py-2 pr-2 text-gray-700">
                      {fila.observaciones ?? "—"}
                    </td>
                    <td className="py-2 text-right text-gray-700">
                      {formatHoras(fila.horas_duracion)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Firmas */}
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 print:mt-8">
          <div>
            <div className="border-t border-gray-400 pt-2 text-center text-sm text-gray-600">
              <p className="font-medium">
                {documento.empresa.representante || "Representante de la empresa"}
              </p>
              <p className="text-xs text-gray-400">Representante de la empresa</p>
            </div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-2 text-center text-sm text-gray-600">
              <p className="font-medium">{documento.cliente_nombre}</p>
              <p className="text-xs text-gray-400">Cliente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}