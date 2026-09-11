"use client";

import { useMemo, useState } from "react";
import ExcelJS from "exceljs";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import EmptyState from "@/components/ui/states/EmptyState";
import Select from "@/components/form/Select";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { formatDate } from "@/features/jornada/types/jornada.types";
import type { ResumenNominaFila } from "@/features/jornada/types/jornada.types";

const COLUMNAS = [
  { key: "horas_ordinarias", label: "Ordinarias" },
  { key: "recargo_nocturno_ordinaria", label: "Recargo Noct. 35%" },
  { key: "hora_extra_diurna", label: "Extra Diurna 25%" },
  { key: "hora_extra_nocturna", label: "Extra Nocturna 75%" },
  { key: "hora_dominical_festiva_ordinaria", label: "Dom/Fest 90%" },
  { key: "hora_nocturna_dominical_festiva", label: "Noct. Dom/Fest 125%" },
  { key: "hora_extra_diurna_dominical_festiva", label: "Extra Diurna Dom/Fest 115%" },
  { key: "hora_extra_nocturna_dominical_festiva", label: "Extra Noct. Dom/Fest 165%" },
] as const;

interface NominaClientProps {
  initialResumen: ResumenNominaFila[];
  permisos?: string[];
}

export default function NominaClient({
  initialResumen,
  permisos: permisosServidor = [],
}: NominaClientProps) {
  const toast = useToast();

  const [semanaFiltro, setSemanaFiltro] = useState("");
  const [exportando, setExportando] = useState(false);

  const puedeExportar =
    permisosServidor.includes("*") ||
    permisosServidor.includes("jornada.nomina.exportar");

  const filtrados = useMemo(() => {
    if (!semanaFiltro) return initialResumen;
    return initialResumen.filter((r) => r.semana_inicio === semanaFiltro);
  }, [initialResumen, semanaFiltro]);

  // Semanas únicas disponibles
  const semanasDisponibles = useMemo(() => {
    const set = new Set(initialResumen.map((r) => r.semana_inicio));
    return Array.from(set).sort().reverse();
  }, [initialResumen]);

  async function onExportarExcel() {
    setExportando(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Equilogipsas";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Resumen Nómina");

      // Encabezados
      const headers = [
        "Operador",
        "Semana Inicio",
        "Semana Fin",
        ...COLUMNAS.map((c) => c.label),
      ];
      sheet.addRow(headers);

      // Estilo encabezados
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      headerRow.alignment = { horizontal: "center" };

      // Datos
      for (const fila of filtrados) {
        sheet.addRow([
          fila.operador_nombre,
          formatDate(fila.semana_inicio),
          formatDate(fila.semana_fin),
          ...COLUMNAS.map(
            (c) => (fila as unknown as Record<string, number>)[c.key]
          ),
        ]);
      }

      // Ajustar anchos de columna
      sheet.columns.forEach((col) => {
        col.width = 18;
      });
      sheet.getColumn(1).width = 25;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumen_nomina_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Exportado", "El archivo Excel se descargó correctamente.");
    } catch {
      toast.error("Error", "No se pudo generar el archivo Excel.");
    } finally {
      setExportando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Resumen de Nómina"
        description="Distribución de horas por operador en las 8 categorías legales."
        actions={
          puedeExportar ? (
            <Button onClick={onExportarExcel} disabled={exportando}>
              {exportando ? "Exportando..." : "Descargar Excel"}
            </Button>
          ) : undefined
        }
      />

      <ComponentCard title="Resumen semanal de horas">
        {/* Filtro de semana */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Semana</label>
          <Select
            value={semanaFiltro}
            onChange={setSemanaFiltro}
            placeholder="Todas las semanas"
            options={semanasDisponibles.map((s) => ({
              value: s,
              label: formatDate(s),
            }))}
          />
        </div>

        {filtrados.length === 0 ? (
          <EmptyState
            title="Sin datos de nómina"
            description="No hay datos de nómina para mostrar. Registra asistencia para generar el resumen."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Operador
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Semana
                  </th>
                  {COLUMNAS.map((col) => (
                    <th
                      key={col.key}
                      className="px-3 py-2 text-right font-medium text-gray-500"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((fila, i) => (
                  <tr
                    key={`${fila.operador_id}-${fila.semana_inicio}-${i}`}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-3 py-2 font-medium">
                      {fila.operador_nombre}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {formatDate(fila.semana_inicio)}
                    </td>
                    {COLUMNAS.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2 text-right tabular-nums"
                      >
                        {(fila as unknown as Record<string, number>)[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ComponentCard>
    </div>
  );
}
