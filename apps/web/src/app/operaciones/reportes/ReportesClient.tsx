"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import Tabs from "@/components/ui/tabs/Tabs";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { nombreActivo } from "@/features/activos/types/activo.types";
import { formatHoras } from "@/features/operaciones/utils/format";
import type {
  ActivoFiltroOpcion,
  CatalogoOpcion,
  FiltrosReporte,
  ReporteHorasFila,
  ReporteNovedadFila,
} from "@/features/operaciones/types/operaciones.types";

type TipoReporte = "horas" | "novedades";

interface ReportesClientProps {
  tipo: TipoReporte;
  filtros: FiltrosReporte;
  centros: CatalogoOpcion[];
  activos: ActivoFiltroOpcion[];
  filasHoras: ReporteHorasFila[];
  filasNovedades: ReporteNovedadFila[];
}

const formatoFecha = (iso: string): string =>
  new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ReportesClient({
  tipo,
  filtros,
  centros,
  activos,
  filasHoras,
  filasNovedades,
}: ReportesClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [fechaDesde, setFechaDesde] = useState(filtros.fecha_desde);
  const [fechaHasta, setFechaHasta] = useState(filtros.fecha_hasta);
  const [activo, setActivo] = useState(filtros.activo_id);
  const [centro, setCentro] = useState(filtros.centro_servicio_id);
  const [errorFechas, setErrorFechas] = useState("");

  function aplicar() {
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      setErrorFechas(
        "La fecha inicial no puede ser posterior a la final."
      );
      return;
    }
    setErrorFechas("");

    const params = new URLSearchParams();
    if (tipo) params.set("tipo", tipo);
    if (fechaDesde) params.set("desde", fechaDesde);
    if (fechaHasta) params.set("hasta", fechaHasta);
    if (activo) params.set("activo", activo);
    if (centro) params.set("centro", centro);

    router.push(`${pathname}?${params.toString()}`);
  }

  const opcionesActivos: { value: string; label: string }[] = [
    { value: "", label: "Todos los equipos" },
    ...activos.map((a) => ({
      value: a.id,
      label: `${a.codigo_interno} — ${
        nombreActivo({ nombre: a.nombre, marca: null, modelo: null })
      }`,
    })),
  ];

  const opcionesCentros: { value: string; label: string }[] = [
    { value: "", label: "Todos los centros" },
    ...centros.map((c) => ({ value: c.id, label: c.nombre })),
  ];

  const columnasHoras: DataTableColumn<ReporteHorasFila>[] = [
    {
      key: "activo",
      header: "Equipo",
      render: (r) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {nombreActivo({
              nombre: r.activo_nombre,
              marca: null,
              modelo: null,
            })}
          </div>
          <div className="text-xs text-gray-500">{r.activo_codigo}</div>
        </div>
      ),
    },
    {
      key: "centro",
      header: "Centro de servicio",
      render: (r) => r.centro_servicio_nombre ?? "—",
    },
    {
      key: "actividades",
      header: "Actividades",
      align: "right",
      render: (r) => r.cantidad_actividades,
    },
    {
      key: "trabajadas",
      header: "Horas trabajadas",
      align: "right",
      render: (r) => formatHoras(r.horas_trabajadas),
    },
    {
      key: "limitadas",
      header: "Horas limitadas",
      align: "right",
      render: (r) => formatHoras(r.horas_limitadas),
    },
    {
      key: "novedades",
      header: "Novedades",
      align: "right",
      render: (r) => r.total_novedades,
    },
  ];

  const columnasNovedades: DataTableColumn<ReporteNovedadFila>[] = [
    {
      key: "fecha",
      header: "Fecha",
      render: (r) => formatoFecha(r.fecha_pausa),
    },
    {
      key: "activo",
      header: "Equipo",
      render: (r) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {nombreActivo({
              nombre: r.activo_nombre,
              marca: null,
              modelo: null,
            })}
          </div>
          <div className="text-xs text-gray-500">{r.activo_codigo}</div>
        </div>
      ),
    },
    {
      key: "centro",
      header: "Centro de servicio",
      render: (r) => r.centro_servicio_nombre ?? "—",
    },
    {
      key: "causal",
      header: "Causal",
      render: (r) => r.causal_nombre ?? "—",
    },
    {
      key: "observaciones",
      header: "Observaciones",
      render: (r) => (
        <span className="max-w-[260px] truncate">
          {r.observaciones ?? "—"}
        </span>
      ),
    },
    {
      key: "duracion",
      header: "Duración",
      align: "right",
      render: (r) => formatHoras(r.horas_duracion),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Resumen de horas trabajadas y novedades por periodo."
      />

      <ComponentCard title="Filtros">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label
              htmlFor="reporte-desde"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Desde
            </label>
            <Input
              id="reporte-desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="reporte-hasta"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Hasta
            </label>
            <Input
              id="reporte-hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="reporte-activo"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Equipo
            </label>
            <Select
              placeholder="Todos los equipos"
              value={activo}
              onChange={setActivo}
              options={opcionesActivos}
            />
          </div>
          <div>
            <label
              htmlFor="reporte-centro"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
            >
              Centro de servicio
            </label>
            <Select
              placeholder="Todos los centros"
              value={centro}
              onChange={setCentro}
              options={opcionesCentros}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={aplicar} className="w-full">
              Consultar
            </Button>
          </div>
        </div>
        {errorFechas && (
          <p className="mt-2 text-sm text-error-500">{errorFechas}</p>
        )}
      </ComponentCard>

      <div className="mt-4">
        <Tabs
          defaultActiveKey={tipo}
          items={[
            {
              key: "horas",
              label: "Horas trabajadas",
              content: (
                <ComponentCard title="Horas por equipo">
                  <DataTable<ReporteHorasFila>
                    columns={columnasHoras}
                    data={filasHoras}
                    rowKey={(r) => r.activo_id}
                    emptyTitle="Sin horas en el periodo"
                    emptyDescription="Ajusta los filtros para ver actividades con horas trabajadas."
                  />
                </ComponentCard>
              ),
            },
            {
              key: "novedades",
              label: "Novedades",
              content: (
                <ComponentCard title="Novedades por causal">
                  <DataTable<ReporteNovedadFila>
                    columns={columnasNovedades}
                    data={filasNovedades}
                    rowKey={(r) => r.actividad_id}
                    emptyTitle="Sin novedades en el periodo"
                    emptyDescription="Ajusta los filtros para ver pausas con causal."
                  />
                </ComponentCard>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}