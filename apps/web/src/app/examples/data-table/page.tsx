"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import SearchInput from "@/components/form/SearchInput";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/button/Button";
import { useResourceList } from "@/lib/data/use-resource-list";

interface EjemploActivo {
  id: string;
  nombre: string;
  categoria: string;
  estado: string;
}

const PAGE_SIZE = 4;

async function fetchEjemplo(): Promise<EjemploActivo[]> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return [
    { id: "1", nombre: "Volqueta 10m³", categoria: "Vehículo", estado: "activo" },
    { id: "2", nombre: "Excavadora 320", categoria: "Maquinaria", estado: "mantenimiento" },
    { id: "3", nombre: "Compactadora", categoria: "Maquinaria", estado: "activo" },
    { id: "4", nombre: "Camión cisterna", categoria: "Vehículo", estado: "retirado" },
    { id: "5", nombre: "Generador 50kW", categoria: "Equipo", estado: "activo" },
    { id: "6", nombre: "Motobomba", categoria: "Equipo", estado: "mantenimiento" },
    { id: "7", nombre: "Mini cargador", categoria: "Maquinaria", estado: "activo" },
    { id: "8", nombre: "Retroexcavadora", categoria: "Maquinaria", estado: "activo" },
    { id: "9", nombre: "Camión volqueta", categoria: "Vehículo", estado: "retirado" },
  ];
}

export default function EjemploDataTablePage() {
  const { data, loading, error, refresh } = useResourceList(fetchEjemplo);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (item) =>
        item.nombre.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q)
    );
  }, [data, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: DataTableColumn<EjemploActivo>[] = [
    { key: "nombre", header: "Nombre", field: "nombre" },
    { key: "categoria", header: "Categoría", field: "categoria" },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <StatusBadge value={row.estado} />,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      render: () => (
        <Button variant="outline" size="sm">
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Ejemplo: DataTable"
        description="Patrón de listado: DataTable + useResourceList + SearchInput + StatusBadge."
      />
      <ComponentCard title="Listado de ejemplo" desc="...">
        <div className="mb-4 max-w-sm">
          <SearchInput
            placeholder="Buscar por nombre o categoría..."
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
          />
        </div>
        <DataTable<EjemploActivo>
          columns={columns}
          data={pageData}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={refresh}
          emptyTitle="Sin resultados"
          emptyDescription="No hay registros que coincidan con la búsqueda."
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </ComponentCard>
    </div>
  );
}