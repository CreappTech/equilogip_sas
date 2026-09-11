"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import SearchInput from "@/components/form/SearchInput";
import Select from "@/components/form/Select";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/button/Button";
import { usePermissions } from "@/lib/auth/permissions-provider";
import type { BadgeColor } from "@/components/ui/badge/Badge";
import { nombreActivo } from "@/features/activos/types/activo.types";
import { nombreEmpleado } from "@/features/empleados/types/empleado.types";
import { ESTADO_ACTIVIDAD_LABELS } from "@/features/operaciones/types/operaciones.types";
import { formatHoras } from "@/features/operaciones/utils/format";
import type {
  EstadoActividad,
  ListadoActividad,
} from "@/features/operaciones/types/operaciones.types";

const PAGE_SIZE = 10;

const ESTADO_COLORS: Record<EstadoActividad, BadgeColor> = {
  creada: "warning",
  en_curso: "success",
  pausada: "error",
  finalizada: "light",
};

interface OperacionesClientProps {
  initialActividades: ListadoActividad[];
}

export default function OperacionesClient({
  initialActividades,
}: OperacionesClientProps) {
  const { can } = usePermissions();
  const puedeCrear = can("operaciones.actividades.crear");

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoActividad | "todos">(
    "todos"
  );
  const [page, setPage] = useState(1);

  const router = useRouter();

  function abrirControl(actividad: ListadoActividad) {
    router.push(`/operaciones/${actividad.id}`);
  }

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    return initialActividades.filter((act) => {
      if (estadoFiltro !== "todos" && act.estado !== estadoFiltro) return false;
      if (b) {
        const hay = [
          act.activo_codigo ?? "",
          nombreActivo({
            nombre: act.activo_nombre,
            marca: act.activo_marca,
            modelo: act.activo_modelo,
          }),
          nombreEmpleado({
            nombres: act.operador_nombres ?? "",
            apellidos: act.operador_apellidos ?? "",
          }),
          act.centro_servicio_nombre ?? "",
          act.cliente_nombre ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(b)) return false;
      }
      return true;
    });
  }, [initialActividades, busqueda, estadoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibles = filtrados.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const columns: DataTableColumn<ListadoActividad>[] = [
    {
      key: "fecha",
      header: "Fecha",
      render: (row) => {
        const d = new Date(row.fecha_creacion);
        return d.toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
        });
      },
    },
    {
      key: "activo",
      header: "Equipo",
      render: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {nombreActivo({
              nombre: row.activo_nombre,
              marca: row.activo_marca,
              modelo: row.activo_modelo,
            })}
          </div>
          <div className="text-xs text-gray-500">{row.activo_codigo}</div>
        </div>
      ),
    },
    {
      key: "operador",
      header: "Operador",
      render: (row) =>
        nombreEmpleado({
          nombres: row.operador_nombres ?? "",
          apellidos: row.operador_apellidos ?? "",
        }),
    },
    {
      key: "centro",
      header: "Centro",
      render: (row) => row.centro_servicio_nombre ?? "—",
    },
    {
      key: "tipo",
      header: "Tipo",
      render: (row) => row.tipo_actividad_nombre ?? "—",
    },
    {
      key: "trabajado",
      header: "Trabajado",
      render: (row) => formatHoras(row.horas_trabajadas),
    },
    {
      key: "novedades",
      header: "Novedades",
      render: (row) => (
        <span>{row.total_novedades === 0 ? "—" : row.total_novedades}</span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <StatusBadge
          value={row.estado}
          colors={ESTADO_COLORS}
          labels={ESTADO_ACTIVIDAD_LABELS}
        />
      ),
    },
    {
      key: "control",
      header: "Control",
      render: (row) => (
        <Link
          href={`/operaciones/${row.id}`}
          className="inline-block"
          onClick={(event) => event.stopPropagation()}
        >
          <Button variant="outline" size="sm">
            Abrir control
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Operaciones"
        description="Actividades operativas de equipos y operadores."
        actions={
          puedeCrear ? (
            <Link href="/operaciones/nuevo">
              <Button>Planear servicio</Button>
            </Link>
          ) : undefined
        }
      />

      <ComponentCard title="Listado de actividades">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            placeholder="Buscar por equipo, operador, cliente..."
            onChange={(value) => {
              setBusqueda(value);
              setPage(1);
            }}
            className="sm:max-w-xs"
          />
          <Select
            placeholder="Filtrar por estado"
            value={estadoFiltro}
            onChange={(value) => {
              setEstadoFiltro(value as EstadoActividad | "todos");
              setPage(1);
            }}
            options={[
              { value: "todos", label: "Todos los estados" },
              { value: "creada", label: "Creadas" },
              { value: "en_curso", label: "En curso" },
              { value: "pausada", label: "Pausadas" },
              { value: "finalizada", label: "Finalizadas" },
            ]}
            className="sm:max-w-[220px]"
          />
        </div>

        <DataTable<ListadoActividad>
          columns={columns}
          data={visibles}
          rowKey={(row) => row.id}
          onRowClick={abrirControl}
          emptyTitle="Sin actividades registradas"
          emptyDescription="Planea el primer servicio con el botón Planear servicio."
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </ComponentCard>
    </div>
  );
}