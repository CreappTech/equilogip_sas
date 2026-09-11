"use client";

import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import Button from "@/components/ui/button/Button";
import { nombreActivo } from "@/features/activos/types/activo.types";
import type { ActaResumen } from "@/features/operaciones/types/operaciones.types";

interface ActasClientProps {
  initialActas: ActaResumen[];
  puedeGenerar: boolean;
}

const darFormatoFecha = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function ActasClient({
  initialActas,
  puedeGenerar,
}: ActasClientProps) {
  const columns: DataTableColumn<ActaResumen>[] = [
    {
      key: "numero",
      header: "No. Acta",
      render: (r) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {r.numero}
        </span>
      ),
    },
    {
      key: "cliente",
      header: "Cliente",
      render: (r) => r.cliente_nombre ?? "—",
    },
    {
      key: "equipo",
      header: "Equipo",
      render: (r) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {nombreActivo({
              nombre: r.equipo_nombre,
              marca: null,
              modelo: null,
            })}
          </div>
          <div className="text-xs text-gray-500">{r.equipo_codigo}</div>
        </div>
      ),
    },
    {
      key: "periodo",
      header: "Periodo",
      render: (r) =>
        `${darFormatoFecha(r.periodo_inicio)} — ${darFormatoFecha(r.periodo_fin)}`,
    },
    {
      key: "generado",
      header: "Generada por",
      render: (r) => r.generado_por_nombre ?? "—",
    },
    {
      key: "fecha",
      header: "Fecha de generación",
      render: (r) => darFormatoFecha(r.fecha_generacion),
    },
    {
      key: "ver",
      header: "",
      align: "right",
      render: (r) => (
        <Link href={`/operaciones/actas/preview?id=${r.id}`}>
          <Button variant="outline" size="sm">
            Ver
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Actas de servicio"
        description="Histórico de actas de prestación de servicios generadas."
        actions={
          puedeGenerar ? (
            <>
              <Link href="/operaciones/actas/config">
                <Button variant="outline">Datos de la empresa</Button>
              </Link>
              <Link href="/operaciones/actas/nueva">
                <Button>Nueva acta</Button>
              </Link>
            </>
          ) : undefined
        }
      />

      <ComponentCard title="Histórico de actas">
        <DataTable<ActaResumen>
          columns={columns}
          data={initialActas}
          rowKey={(r) => r.id}
          emptyTitle="Sin actas generadas"
          emptyDescription="Genera la primera acta con el botón Nueva acta."
        />
      </ComponentCard>
    </div>
  );
}