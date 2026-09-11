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
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { retirarActivo } from "@/features/activos/actions/retirarActivo";
import {
  ESTADO_ACTIVO_LABELS,
  ESTADO_OPERATIVO_ACTIVO_LABELS,
  SUBTIPO_ACTIVO_LABELS,
  TIPO_ACTIVO_LABELS,
  nombreActivo,
  permisoActivo,
} from "@/features/activos/types/activo.types";
import type {
  ListadoActivo,
  SubtipoActivo,
  TipoActivo,
} from "@/features/activos/types/activo.types";

const PAGE_SIZE = 10;
const TIPOS: TipoActivo[] = ["vehiculo", "maquina", "equipo"];

interface ActivosClientProps {
  initialActivos: ListadoActivo[];
}

export default function ActivosClient({
  initialActivos,
}: ActivosClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoActivo | "todos">("todos");
  const [page, setPage] = useState(1);
  const [retiroTarget, setRetiroTarget] = useState<ListadoActivo | null>(null);

  const mutation = useResourceMutation(retirarActivo);

  const canCrearAlguno = TIPOS.some((t) => can(permisoActivo(t, "crear")));

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    return initialActivos.filter((activo) => {
      if (tipoFiltro !== "todos" && activo.tipo !== tipoFiltro) return false;
      if (b) {
        const hay = [
          activo.codigo_interno,
          activo.nombre ?? "",
          activo.marca ?? "",
          activo.modelo ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(b)) return false;
      }
      return true;
    });
  }, [initialActivos, busqueda, tipoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibles = filtrados.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  async function onConfirmarRetiro() {
    if (!retiroTarget) return;
    const result = await mutation.mutate({ id: retiroTarget.id });
    if (result.ok) {
      toast.success(
        "Activo retirado",
        `${nombreActivo(retiroTarget)} pasó a estado retirado.`
      );
      setRetiroTarget(null);
      router.refresh();
    } else {
      toast.error("No se pudo retirar", result.error);
    }
  }

  const columns: DataTableColumn<ListadoActivo>[] = [
    {
      key: "codigo_interno",
      header: "Código",
      field: "codigo_interno",
    },
    {
      key: "nombre",
      header: "Referencia",
      render: (row) => nombreActivo(row),
    },
    {
      key: "tipo",
      header: "Categoría",
      render: (row) => TIPO_ACTIVO_LABELS[row.tipo as TipoActivo],
    },
    {
      key: "subtipo",
      header: "Tipo de equipo",
      render: (row) =>
        row.subtipo ? SUBTIPO_ACTIVO_LABELS[row.subtipo as SubtipoActivo] : "—",
    },
    {
      key: "estado_operativo",
      header: "Estado operativo",
      render: (row) => (
        <StatusBadge
          value={row.estado_operativo}
          labels={ESTADO_OPERATIVO_ACTIVO_LABELS}
        />
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <StatusBadge value={row.estado} labels={ESTADO_ACTIVO_LABELS} />
      ),
    },
    {
      key: "fecha_adquisicion",
      header: "Fecha de adquisición",
      render: (row) => row.fecha_adquisicion ?? "—",
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/activos/${row.id}`}
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Ver
          </Link>
          {can(permisoActivo(row.tipo, "editar")) &&
            row.estado !== "retirado" && (
              <Link
                href={`/activos/${row.id}/editar`}
                className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white"
              >
                Editar
              </Link>
            )}
          {can(permisoActivo(row.tipo, "eliminar")) &&
            row.estado !== "retirado" && (
              <button
                type="button"
                onClick={() => setRetiroTarget(row)}
                className="text-sm font-medium text-error-500 hover:text-error-600"
              >
                Retirar
              </button>
            )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Activos"
        description="Vehículos, maquinaria y equipos de la compañía."
        actions={
          canCrearAlguno ? (
            <Link href="/activos/nuevo">
              <Button>Nuevo activo</Button>
            </Link>
          ) : undefined
        }
      />

      <ComponentCard title="Listado de activos">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            placeholder="Buscar por código o nombre..."
            onChange={(value) => {
              setBusqueda(value);
              setPage(1);
            }}
            className="sm:max-w-xs"
          />
          <Select
            placeholder="Filtrar por tipo"
            value={tipoFiltro}
            onChange={(value) => {
              setTipoFiltro(value as TipoActivo | "todos");
              setPage(1);
            }}
            options={[
              { value: "todos", label: "Todos los tipos" },
              { value: "vehiculo", label: "Vehículos" },
              { value: "maquina", label: "Maquinaria" },
              { value: "equipo", label: "Equipos" },
            ]}
            className="sm:max-w-[220px]"
          />
        </div>

        <DataTable<ListadoActivo>
          columns={columns}
          data={visibles}
          rowKey={(row) => row.id}
          emptyTitle="Sin activos registrados"
          emptyDescription="Crea el primer activo con el botón Nuevo activo."
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </ComponentCard>

      <ConfirmDialog
        isOpen={retiroTarget !== null}
        onClose={() => setRetiroTarget(null)}
        onConfirm={onConfirmarRetiro}
        title="¿Retirar activo?"
        message={
          retiroTarget
            ? `"${nombreActivo(retiroTarget)}" (${retiroTarget.codigo_interno}) pasará a estado retirado. Esta acción no se puede revertir.`
            : ""
        }
        confirmLabel="Retirar"
        variant="danger"
        loading={mutation.status === "submitting"}
      />
    </div>
  );
}