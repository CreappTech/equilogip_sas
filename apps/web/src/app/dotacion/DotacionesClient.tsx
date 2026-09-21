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
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { anularEntrega } from "@/features/dotacion/actions/anularEntrega";
import {
  ESTADO_ENTREGA_LABELS,
  TIPO_ENTREGA_LABELS,
  permisoDotacion,
} from "@/features/dotacion/types/dotacion.types";
import type { ListadoEntrega } from "@/features/dotacion/types/dotacion.types";

const PAGE_SIZE = 10;

const fmtFecha = (fecha: string): string =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

interface DotacionesClientProps {
  initialEntregas: ListadoEntrega[];
  permisos?: string[];
}

export default function DotacionesClient({
  initialEntregas,
  permisos: permisosServidor = [],
}: DotacionesClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [anularTarget, setAnularTarget] = useState<ListadoEntrega | null>(null);

  const mutation = useResourceMutation(anularEntrega);

  const puede = (accion: "crear" | "editar" | "eliminar") => {
    const codigo = permisoDotacion(accion);
    if (permisosServidor.includes("*") || permisosServidor.includes(codigo)) {
      return true;
    }
    return can(codigo);
  };

  const puedeCrear = puede("crear");

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return initialEntregas;
    return initialEntregas.filter((entrega) =>
      [
        entrega.empleado_nombre ?? "",
        entrega.empleado_documento ?? "",
        entrega.entregado_por,
        entrega.observaciones ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(b)
    );
  }, [initialEntregas, busqueda]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibles = filtrados.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  async function onConfirmarAnular() {
    if (!anularTarget) return;
    const result = await mutation.mutate({ id: anularTarget.id });
    if (result.ok) {
      toast.success(
        "Entrega anulada",
        "La entrega de dotación quedó anulada. La evidencia y la firma se conservan."
      );
      setAnularTarget(null);
      router.refresh();
    } else {
      toast.error("No se pudo anular", result.error);
    }
  }

  const columns: DataTableColumn<ListadoEntrega>[] = [
    {
      key: "fecha_entrega",
      header: "Fecha",
      render: (row) => fmtFecha(row.fecha_entrega),
    },
    {
      key: "empleado_nombre",
      header: "Empleado",
      render: (row) => row.empleado_nombre ?? "—",
    },
    {
      key: "empleado_documento",
      header: "Documento",
      render: (row) => row.empleado_documento ?? "—",
    },
    {
      key: "tipo_entrega",
      header: "Tipo",
      render: (row) => TIPO_ENTREGA_LABELS[row.tipo_entrega],
    },
    {
      key: "entregado_por",
      header: "Entregado por",
      field: "entregado_por",
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <StatusBadge value={row.estado} labels={ESTADO_ENTREGA_LABELS} />
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/dotacion/${row.id}`}
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Ver
          </Link>
          {puede("editar") && row.estado !== "anulada" && (
            <Link
              href={`/dotacion/${row.id}/editar`}
              className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white"
            >
              Editar
            </Link>
          )}
          {puede("eliminar") && row.estado !== "anulada" && (
            <button
              type="button"
              onClick={() => setAnularTarget(row)}
              className="text-sm font-medium text-error-500 hover:text-error-600"
            >
              Anular
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dotación"
        description="Entregas de dotación a empleados, con evidencia y firma del receptor."
        actions={
          puedeCrear ? (
            <Link href="/dotacion/nuevo">
              <Button>Nueva entrega</Button>
            </Link>
          ) : undefined
        }
      />

      <ComponentCard title="Historial de entregas">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            placeholder="Buscar por empleado, documento o responsable..."
            onChange={(value) => {
              setBusqueda(value);
              setPage(1);
            }}
            className="sm:max-w-xs"
          />
        </div>

        <DataTable<ListadoEntrega>
          columns={columns}
          data={visibles}
          rowKey={(row) => row.id}
          emptyTitle="Sin entregas registradas"
          emptyDescription="Registra la primera entrega de dotación con el botón Nueva entrega."
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </ComponentCard>

      <ConfirmDialog
        isOpen={anularTarget !== null}
        onClose={() => setAnularTarget(null)}
        onConfirm={onConfirmarAnular}
        title="¿Anular entrega?"
        message={
          anularTarget
            ? `La entrega del ${fmtFecha(anularTarget.fecha_entrega)} para "${
                anularTarget.empleado_nombre ?? "el empleado"
              }" quedará anulada. Esta acción no se puede revertir.`
            : ""
        }
        confirmLabel="Anular entrega"
        variant="danger"
        loading={mutation.status === "submitting"}
      />
    </div>
  );
}