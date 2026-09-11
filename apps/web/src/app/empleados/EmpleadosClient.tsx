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
import { retirarEmpleado } from "@/features/empleados/actions/retirarEmpleado";
import {
  ESTADO_EMPLEADO_LABELS,
  nombreEmpleado,
  permisoEmpleado,
} from "@/features/empleados/types/empleado.types";
import type { ListadoEmpleado } from "@/features/empleados/types/empleado.types";

const PAGE_SIZE = 10;

interface EmpleadosClientProps {
  initialEmpleados: ListadoEmpleado[];
  permisos?: string[];
}

export default function EmpleadosClient({
  initialEmpleados,
  permisos: permisosServidor = [],
}: EmpleadosClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [retiroTarget, setRetiroTarget] = useState<ListadoEmpleado | null>(null);

  const mutation = useResourceMutation(retirarEmpleado);

  const puede = (accion: "crear" | "editar" | "eliminar") => {
    const codigo = permisoEmpleado(accion);
    if (permisosServidor.includes("*") || permisosServidor.includes(codigo)) {
      return true;
    }
    return can(codigo);
  };

  const puedeCrear = puede("crear");

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return initialEmpleados;
    return initialEmpleados.filter((empleado) =>
      [
        empleado.nombres,
        empleado.apellidos,
        empleado.documento_identidad,
        empleado.cargo_nombre ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(b)
    );
  }, [initialEmpleados, busqueda]);

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
        "Empleado retirado",
        `${nombreEmpleado(retiroTarget)} pasó a estado retirado.`
      );
      setRetiroTarget(null);
      router.refresh();
    } else {
      toast.error("No se pudo retirar", result.error);
    }
  }

  const columns: DataTableColumn<ListadoEmpleado>[] = [
    {
      key: "nombre",
      header: "Nombre",
      render: (row) => nombreEmpleado(row),
    },
    {
      key: "documento_identidad",
      header: "Documento",
      field: "documento_identidad",
    },
    {
      key: "cargo_nombre",
      header: "Cargo",
      render: (row) => row.cargo_nombre ?? "—",
    },
    {
      key: "fecha_ingreso",
      header: "Ingreso",
      field: "fecha_ingreso",
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (
        <StatusBadge value={row.estado} labels={ESTADO_EMPLEADO_LABELS} />
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/empleados/${row.id}`}
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Ver
          </Link>
          {puede("editar") && row.estado !== "retirado" && (
            <Link
              href={`/empleados/${row.id}/editar`}
              className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white"
            >
              Editar
            </Link>
          )}
          {puede("eliminar") && row.estado !== "retirado" && (
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
        title="Empleados"
        description="Personal de la compañía vinculado al sistema."
        actions={
          puedeCrear ? (
            <Link href="/empleados/nuevo">
              <Button>Nuevo empleado</Button>
            </Link>
          ) : undefined
        }
      />

      <ComponentCard title="Listado de empleados">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            placeholder="Buscar por nombre, documento o cargo..."
            onChange={(value) => {
              setBusqueda(value);
              setPage(1);
            }}
            className="sm:max-w-xs"
          />
        </div>

        <DataTable<ListadoEmpleado>
          columns={columns}
          data={visibles}
          rowKey={(row) => row.id}
          emptyTitle="Sin empleados registrados"
          emptyDescription="Crea el primer empleado con el botón Nuevo empleado."
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </ComponentCard>

      <ConfirmDialog
        isOpen={retiroTarget !== null}
        onClose={() => setRetiroTarget(null)}
        onConfirm={onConfirmarRetiro}
        title="¿Retirar empleado?"
        message={
          retiroTarget
            ? `"${nombreEmpleado(retiroTarget)}" pasará a estado retirado. Esta acción no se puede revertir.`
            : ""
        }
        confirmLabel="Retirar"
        variant="danger"
        loading={mutation.status === "submitting"}
      />
    </div>
  );
}