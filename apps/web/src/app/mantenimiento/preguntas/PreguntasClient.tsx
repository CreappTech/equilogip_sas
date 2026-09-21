"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import SearchInput from "@/components/form/SearchInput";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import {
  crearPregunta,
  editarPregunta,
  cambiarEstadoPregunta,
} from "@/features/mantenimiento/actions/preguntas";
import { TIPO_ACTIVO_APLICA_LABELS } from "@/features/mantenimiento/types/mantenimiento.types";
import type {
  CategoriaMantenimiento,
  PreguntaMantenimiento,
} from "@/features/mantenimiento/types/mantenimiento.types";
import type { PreguntaFormValues } from "@/features/mantenimiento/schemas/preguntaSchema";
import { PreguntaFormModal } from "./PreguntaFormModal";

interface PreguntasClientProps {
  preguntas: PreguntaMantenimiento[];
  categorias: CategoriaMantenimiento[];
}

export default function PreguntasClient({
  preguntas,
  categorias,
}: PreguntasClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const puedeCrear = can("mantenimiento.preguntas.crear");
  const puedeEditar = can("mantenimiento.preguntas.editar");

  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [formModal, setFormModal] = useState<{
    open: boolean;
    pregunta: PreguntaMantenimiento | null;
  }>({ open: false, pregunta: null });
  const [estadoTarget, setEstadoTarget] = useState<PreguntaMantenimiento | null>(
    null
  );

  const mutationCrear = useResourceMutation((v: PreguntaFormValues) =>
    crearPregunta(v)
  );
  const mutationEditar = useResourceMutation(
    (args: { id: string; input: PreguntaFormValues }) =>
      editarPregunta(args.id, args.input)
  );
  const mutationEstado = useResourceMutation(
    (args: { id: string; activo: boolean }) =>
      cambiarEstadoPregunta(args.id, args.activo)
  );

  const categoriaNombre = (id: string) =>
    categorias.find((c) => c.id === id)?.nombre ?? "—";

  const filtradas = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    return preguntas.filter((p) => {
      if (tipoFiltro !== "todos" && p.tipo_activo !== tipoFiltro) return false;
      if (b && !`${p.texto} ${p.categoria_nombre ?? ""}`.toLowerCase().includes(b))
        return false;
      return true;
    });
  }, [preguntas, busqueda, tipoFiltro]);

  async function onGuardar(input: PreguntaFormValues) {
    if (formModal.pregunta) {
      const result = await mutationEditar.mutate({
        id: formModal.pregunta.id,
        input,
      });
      if (!result.ok) {
        toast.error("No se pudo editar", result.error);
        return;
      }
      toast.success("Pregunta actualizada");
    } else {
      const result = await mutationCrear.mutate(input);
      if (!result.ok) {
        toast.error("No se pudo crear", result.error);
        return;
      }
      toast.success("Pregunta creada");
    }
    mutationCrear.reset();
    mutationEditar.reset();
    setFormModal({ open: false, pregunta: null });
    router.refresh();
  }

  async function onCambiarEstado() {
    if (!estadoTarget) return;
    const nuevoEstado = !estadoTarget.activo;
    const result = await mutationEstado.mutate({
      id: estadoTarget.id,
      activo: nuevoEstado,
    });
    setEstadoTarget(null);
    if (!result.ok) {
      toast.error("No se pudo actualizar", result.error);
      return;
    }
    toast.success(
      nuevoEstado ? "Pregunta activada" : "Pregunta desactivada"
    );
    router.refresh();
  }

  const columns: DataTableColumn<PreguntaMantenimiento>[] = [
    {
      key: "categoria",
      header: "Categoría",
      render: (row) => (
        <span className="text-gray-800 dark:text-white/90">
          {categoriaNombre(row.categoria_id)}
        </span>
      ),
    },
    {
      key: "texto",
      header: "Pregunta",
      render: (row) => (
        <span className="max-w-md">{row.texto}</span>
      ),
    },
    {
      key: "tipo_activo",
      header: "Aplica a",
      render: (row) => TIPO_ACTIVO_APLICA_LABELS[row.tipo_activo],
    },
    {
      key: "orden",
      header: "Orden",
      render: (row) => row.orden,
    },
    {
      key: "activo",
      header: "Estado",
      render: (row) => (
        <StatusBadge value={row.activo ? "activo" : "inactivo"} />
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      render: (row) =>
        puedeEditar ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFormModal({ open: true, pregunta: row })
              }
            >
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEstadoTarget(row)}
            >
              {row.activo ? "Desactivar" : "Activar"}
            </Button>
          </div>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Preguntas del checklist"
        description="Catálogo de controles preoperacionales por categoría"
        actions={
          puedeCrear ? (
            <Button
              size="sm"
              onClick={() => setFormModal({ open: true, pregunta: null })}
            >
              Nueva pregunta
            </Button>
          ) : undefined
        }
      />

      <ComponentCard title="Preguntas">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            defaultValue={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar pregunta…"
            className="sm:max-w-xs"
          />
          <Select
            value={tipoFiltro}
            onChange={setTipoFiltro}
            options={[
              { value: "todos", label: "Todos los tipos" },
              { value: "vehiculo", label: "Vehículo" },
              { value: "maquina", label: "Maquinaria" },
              { value: "ambos", label: "Ambos" },
            ]}
            className="sm:w-48"
          />
        </div>
        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filtradas}
            rowKey={(row) => row.id}
            emptyTitle="Sin preguntas"
            emptyDescription="Crea la primera pregunta del checklist."
          />
        </div>
      </ComponentCard>

      <PreguntaFormModal
        open={formModal.open}
        pregunta={formModal.pregunta}
        categorias={categorias}
        submitting={mutationCrear.status === "submitting" || mutationEditar.status === "submitting"}
        error={mutationCrear.error ?? mutationEditar.error}
        onClose={() => {
          setFormModal({ open: false, pregunta: null });
          mutationCrear.reset();
          mutationEditar.reset();
        }}
        onSave={onGuardar}
      />

      <ConfirmDialog
        isOpen={estadoTarget !== null}
        title={estadoTarget?.activo ? "Desactivar pregunta" : "Activar pregunta"}
        message={
          estadoTarget?.activo
            ? `La pregunta "${estadoTarget?.texto}" dejará de mostrarse en nuevas inspecciones. Las inspecciones ya completadas no cambian.`
            : `La pregunta "${estadoTarget?.texto}" volverá a estar disponible.`
        }
        confirmLabel={estadoTarget?.activo ? "Desactivar" : "Activar"}
        variant="warning"
        loading={mutationEstado.status === "submitting"}
        onConfirm={onCambiarEstado}
        onClose={() => setEstadoTarget(null)}
      />
    </div>
  );
}