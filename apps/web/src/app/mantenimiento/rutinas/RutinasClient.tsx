"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import SearchInput from "@/components/form/SearchInput";
import Button from "@/components/ui/button/Button";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { usePermissions } from "@/lib/auth/permissions-provider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import {
  crearRutina,
  editarRutina,
  cambiarEstadoRutina,
} from "@/features/mantenimiento/actions/rutinas";
import {
  TIPO_ACTIVO_APLICA_LABELS,
  UNIDAD_LECTURA_LABELS,
} from "@/features/mantenimiento/types/mantenimiento.types";
import { SUBTIPO_ACTIVO_LABELS } from "@/features/activos/types/activo.types";
import type { RutinaMantenimiento } from "@/features/mantenimiento/types/mantenimiento.types";
import type { RutinaFormValues } from "@/features/mantenimiento/schemas/rutinaSchema";
import { RutinaFormModal } from "./RutinaFormModal";

interface RutinasClientProps {
  rutinas: RutinaMantenimiento[];
}

export default function RutinasClient({ rutinas }: RutinasClientProps) {
  const router = useRouter();
  const toast = useToast();
  const { can } = usePermissions();

  const puedeCrear = can("mantenimiento.rutinas.crear");
  const puedeEditar = can("mantenimiento.rutinas.editar");

  const [busqueda, setBusqueda] = useState("");
  const [formModal, setFormModal] = useState<{
    open: boolean;
    rutina: RutinaMantenimiento | null;
  }>({ open: false, rutina: null });
  const [estadoTarget, setEstadoTarget] = useState<RutinaMantenimiento | null>(
    null
  );

  const mutationCrear = useResourceMutation((v: RutinaFormValues) =>
    crearRutina(v)
  );
  const mutationEditar = useResourceMutation(
    (args: { id: string; input: RutinaFormValues }) =>
      editarRutina(args.id, args.input)
  );
  const mutationEstado = useResourceMutation(
    (args: { id: string; activo: boolean }) =>
      cambiarEstadoRutina(args.id, args.activo)
  );

  const filtradas = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    return rutinas.filter((r) =>
      b
        ? `${r.nombre} ${r.descripcion ?? ""} ${TIPO_ACTIVO_APLICA_LABELS[r.tipo_activo]}`
            .toLowerCase()
            .includes(b)
        : true
    );
  }, [rutinas, busqueda]);

  async function onGuardar(input: RutinaFormValues) {
    if (formModal.rutina) {
      const result = await mutationEditar.mutate({
        id: formModal.rutina.id,
        input,
      });
      if (!result.ok) {
        toast.error("No se pudo editar", result.error);
        return;
      }
      toast.success("Rutina actualizada");
    } else {
      const result = await mutationCrear.mutate(input);
      if (!result.ok) {
        toast.error("No se pudo crear", result.error);
        return;
      }
      toast.success("Rutina creada");
    }
    mutationCrear.reset();
    mutationEditar.reset();
    setFormModal({ open: false, rutina: null });
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
    toast.success(nuevoEstado ? "Rutina activada" : "Rutina desactivada");
    router.refresh();
  }

  const columns: DataTableColumn<RutinaMantenimiento>[] = [
    {
      key: "nombre",
      header: "Rutina",
      render: (row) => (
        <div>
          <p className="font-medium text-gray-800 dark:text-white/90">
            {row.nombre}
          </p>
          {row.descripcion && (
            <p className="max-w-sm text-xs text-gray-400">{row.descripcion}</p>
          )}
        </div>
      ),
    },
    {
      key: "tipo_activo",
      header: "Aplica a",
      render: (row) => TIPO_ACTIVO_APLICA_LABELS[row.tipo_activo],
    },
    {
      key: "subtipo",
      header: "Tipo de equipo",
      render: (row) =>
        row.subtipo
          ? SUBTIPO_ACTIVO_LABELS[row.subtipo] ?? row.subtipo
          : "Todos",
    },
    {
      key: "unidad",
      header: "Unidad",
      render: (row) => UNIDAD_LECTURA_LABELS[row.unidad],
    },
    {
      key: "umbral",
      header: "Umbral",
      render: (row) => (
        <span className="font-semibold text-gray-800 dark:text-white/90">
          {row.umbral}
        </span>
      ),
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
              onClick={() => setFormModal({ open: true, rutina: row })}
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
        title="Rutinas de mantenimiento"
        description="Acciones preventivas según umbral de kilometraje u horómetro"
        actions={
          puedeCrear ? (
            <Button
              size="sm"
              onClick={() => setFormModal({ open: true, rutina: null })}
            >
              Nueva rutina
            </Button>
          ) : undefined
        }
      />

      <ComponentCard title="Rutinas">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput
            defaultValue={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar rutina…"
            className="sm:max-w-xs"
          />
        </div>
        <div className="mt-4">
          <DataTable
            columns={columns}
            data={filtradas}
            rowKey={(row) => row.id}
            emptyTitle="Sin rutinas"
            emptyDescription="Crea la primera rutina de mantenimiento preventivo."
          />
        </div>
      </ComponentCard>

      <RutinaFormModal
        open={formModal.open}
        rutina={formModal.rutina}
        submitting={mutationCrear.status === "submitting" || mutationEditar.status === "submitting"}
        error={mutationCrear.error ?? mutationEditar.error}
        onClose={() => {
          setFormModal({ open: false, rutina: null });
          mutationCrear.reset();
          mutationEditar.reset();
        }}
        onSave={onGuardar}
      />

      <ConfirmDialog
        isOpen={estadoTarget !== null}
        title={estadoTarget?.activo ? "Desactivar rutina" : "Activar rutina"}
        message={
          estadoTarget?.activo
            ? `La rutina "${estadoTarget?.nombre}" dejará de activarse en las inspecciones.`
            : `La rutina "${estadoTarget?.nombre}" volverá a activarse en las inspecciones.`
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