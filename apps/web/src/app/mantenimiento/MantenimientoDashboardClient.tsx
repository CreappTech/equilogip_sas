"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import Badge from "@/components/ui/badge/Badge";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import Select from "@/components/form/Select";
import RadarChart from "@/components/charts/RadarChart";
import { usePermissions } from "@/lib/auth/permissions-provider";
import {
  ESTADO_INSPECCION_LABELS,
  NIVEL_COMBUSTIBLE_OPTIONS,
} from "@/features/mantenimiento/types/mantenimiento.types";
import type {
  CategoriaMantenimiento,
  InspeccionFila,
  SaludCategoria,
} from "@/features/mantenimiento/types/mantenimiento.types";

interface MantenimientoDashboardClientProps {
  inspecciones: InspeccionFila[];
  categorias: CategoriaMantenimiento[];
  tiempoMinimoSegundos: number;
  puedeCrear: boolean;
}

function formatoFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatoDuracion(segundos: number | null): string {
  if (segundos === null || segundos === undefined) return "—";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function agregarSalud(rows: InspeccionFila[]): SaludCategoria[] {
  const mapa = new Map<string, SaludCategoria>();
  for (const ins of rows) {
    for (const [codigo, p] of Object.entries(ins.puntajes ?? {})) {
      const previo =
        mapa.get(codigo) ??
        ({
          categoria_codigo: codigo,
          categoria_nombre: codigo,
          bueno: 0,
          malo: 0,
          no_aplica: 0,
          aplica: 0,
          puntaje: 0,
          porcentaje: null,
        } satisfies SaludCategoria);
      previo.bueno += p.bueno ?? 0;
      previo.malo += p.malo ?? 0;
      previo.no_aplica += p.no_aplica ?? 0;
      mapa.set(codigo, previo);
    }
  }
  const lista = [...mapa.values()];
  for (const c of lista) {
    c.aplica = c.bueno + c.malo;
    c.puntaje = c.bueno - c.malo;
    c.porcentaje =
      c.aplica > 0
        ? Math.max(0, Math.round((c.puntaje / c.aplica) * 100))
        : null;
  }
  return lista.sort((a, b) =>
    a.categoria_nombre.localeCompare(b.categoria_nombre)
  );
}

export default function MantenimientoDashboardClient({
  inspecciones,
  categorias,
  tiempoMinimoSegundos,
  puedeCrear,
}: MantenimientoDashboardClientProps) {
  const { can } = usePermissions();
  const [equipoFiltro, setEquipoFiltro] = useState<string>("todos");

  const completadas = useMemo(
    () => inspecciones.filter((i) => i.estado === "completada"),
    [inspecciones]
  );

  const unidadesEquipos = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const ins of completadas) {
      if (ins.activo_id && !mapa.has(ins.activo_id)) {
        mapa.set(ins.activo_id, `${ins.activo_codigo} · ${ins.activo_nombre}`);
      }
    }
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [completadas]);

  const filasRadar = useMemo(
    () =>
      equipoFiltro === "todos"
        ? completadas
        : completadas.filter((i) => i.activo_id === equipoFiltro),
    [completadas, equipoFiltro]
  );

  const salud = useMemo(
    () => agregarSalud(filasRadar),
    [filasRadar]
  );

  const categoriasActivas = useMemo(
    () =>
      categorias
        .filter((c) => c.activo)
        .sort((a, b) => a.orden - b.orden),
    [categorias]
  );

  const series = useMemo(() => {
    const porCategoria = new Map(salud.map((s) => [s.categoria_codigo, s]));
    return [
      {
        name: "Salud",
        data: categoriasActivas.map((c) => {
          const s = porCategoria.get(c.codigo);
          return s?.porcentaje ?? 0;
        }),
      },
    ];
  }, [salud, categoriasActivas]);

  const expressas = useMemo(
    () => completadas.filter((i) => i.es_express),
    [completadas]
  );

  const tiempoPromedio = useMemo(() => {
    const conTiempo = completadas.filter(
      (i) => i.tiempo_segundos !== null
    );
    if (conTiempo.length === 0) return null;
    const total = conTiempo.reduce(
      (acc, i) => acc + (i.tiempo_segundos ?? 0),
      0
    );
    return Math.round(total / conTiempo.length);
  }, [completadas]);

  const puedeConfigurar = can("mantenimiento.configuracion.ver");

  const columns: DataTableColumn<InspeccionFila>[] = [
    {
      key: "iniciada_en",
      header: "Fecha",
      render: (row) => formatoFecha(row.iniciada_en),
    },
    {
      key: "activo",
      header: "Equipo",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 dark:text-white/90">
            {row.activo_nombre ?? row.activo_codigo ?? "—"}
          </span>
          {row.activo_codigo && (
            <span className="text-xs text-gray-400">
              {row.activo_codigo}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "operador",
      header: "Operador",
      render: (row) => row.operador_nombre ?? "—",
    },
    {
      key: "lectura",
      header: "Lectura",
      render: (row) =>
        `${row.lectura} ${row.lectura_unidad === "kilometraje" ? "km" : "h"}`,
    },
    {
      key: "combustible",
      header: "Combustible",
      render: (row) =>
        NIVEL_COMBUSTIBLE_OPTIONS.includes(row.nivel_combustible)
          ? row.nivel_combustible
          : "—",
    },
    {
      key: "duracion",
      header: "Duración",
      render: (row) => formatoDuracion(row.tiempo_segundos),
    },
    {
      key: "express",
      header: "Alerta",
      render: (row) =>
        row.es_express ? (
          <Badge color="warning" size="sm">
            Exprés
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <StatusBadge value={row.estado} labels={ESTADO_INSPECCION_LABELS} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Panel de mantenimiento"
        description="Salud de equipos e inspecciones preoperacionales"
        actions={
          <>
            {puedeConfigurar && (
              <Link href="/mantenimiento/configuracion">
                <Button variant="outline" size="sm">
                  Configuración
                </Button>
              </Link>
            )}
            {puedeCrear && (
              <Link href="/mantenimiento/inspeccion">
                <Button size="sm">Nueva inspección</Button>
              </Link>
            )}
          </>
        }
      />

      {expressas.length > 0 && (
        <div className="mb-4">
          <Alert
            variant="warning"
            title={`${expressas.length} inspección${
              expressas.length > 1 ? "es" : ""
            } completada${
              expressas.length > 1 ? "s" : ""
            } en menos del tiempo mínimo (${Math.round(
              tiempoMinimoSegundos / 60
            )} min)`}
            message={expressas
              .slice(0, 5)
              .map(
                (e) =>
                  `${e.activo_nombre ?? e.activo_codigo ?? "Equipo"} · ${
                    e.operador_nombre ?? "Operador"
                  } · ${formatoDuracion(e.tiempo_segundos)}`
              )
              .join("  /  ")}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ComponentCard title="Inspecciones completadas">
          <p className="text-3xl font-semibold text-gray-800 dark:text-white/90">
            {completadas.length}
          </p>
        </ComponentCard>
        <ComponentCard title="Tiempo promedio">
          <p className="text-3xl font-semibold text-gray-800 dark:text-white/90">
            {tiempoPromedio !== null ? formatoDuracion(tiempoPromedio) : "—"}
          </p>
        </ComponentCard>
        <ComponentCard title="Inspecciones exprés">
          <p className="text-3xl font-semibold text-warning-600 dark:text-warning-400">
            {expressas.length}
          </p>
        </ComponentCard>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ComponentCard
          title="Salud por categoría"
          desc="Bueno suma, malo resta; solo respuestas que aplican"
          className="xl:col-span-2"
          headerRight={
            <Select
              value={equipoFiltro}
              onChange={(value) => setEquipoFiltro(value)}
              options={[
                { value: "todos", label: "Todos los equipos" },
                ...unidadesEquipos.map(([id, label]) => ({
                  value: id,
                  label,
                })),
              ]}
              className="w-56"
            />
          }
        >
          {categoriasActivas.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <RadarChart
                categories={categoriasActivas.map((c) => c.nombre)}
                series={series}
                height={320}
              />
              <div className="flex flex-col justify-center gap-2">
                {categoriasActivas.map((c) => {
                  const s = salud.find((x) => x.categoria_codigo === c.codigo);
                  const pct = s?.porcentaje ?? null;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {c.nombre}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          pct === null
                            ? "text-gray-400"
                            : pct >= 60
                              ? "text-success-600 dark:text-success-500"
                              : pct >= 30
                                ? "text-warning-600 dark:text-warning-400"
                                : "text-error-600 dark:text-error-500"
                        }`}
                      >
                        {pct === null
                          ? "Sin datos"
                          : `${pct}%`}{" "}
                        <span className="font-normal text-gray-400">
                          · {s?.aplica ?? 0} apl.
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No hay categorías activas.
            </p>
          )}
        </ComponentCard>

        <ComponentCard
          title="Categorías activas"
          desc="Preguntas vigentes del checklist"
        >
          <ul className="space-y-2">
            {categoriasActivas.map((c, i) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-lg px-1"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                    {c.nombre}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {c.descripcion}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </ComponentCard>
      </div>

      <div className="mt-5">
        <ComponentCard title="Últimas inspecciones" desc="Hasta 200 registros">
          <DataTable
            columns={columns}
            data={inspecciones}
            rowKey={(row) => row.id}
            emptyTitle="Sin inspecciones"
            emptyDescription="Cuando el operador registre su primera inspección aparecerá aquí."
          />
        </ComponentCard>
      </div>
    </div>
  );
}