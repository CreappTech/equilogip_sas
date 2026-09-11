"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZodType } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues } from "react-hook-form";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import DataTable, {
  type DataTableColumn,
} from "@/components/ui/data-table/DataTable";
import SearchInput from "@/components/form/SearchInput";
import StatusBadge from "@/components/common/StatusBadge";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import Form from "@/components/form/Form";
import FormField from "@/components/form/FormField";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Switch from "@/components/form/switch/Switch";
import { Controller } from "react-hook-form";
import { useAppForm } from "@/lib/forms/useAppForm";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { useToast } from "@/components/ui/toast/ToastProvider";
import {
  crearCatalogo,
  actualizarCatalogo,
  eliminarCatalogo,
} from "@/features/catalogos/actions/crudCatalogo";
import {
  CATALOGOS,
  type CampoCatalogo,
  type CatalogoConfig,
} from "@/features/catalogos/catalogo.config";
import { CATALOGO_ESQUEMAS } from "@/features/catalogos/schemas/catalogos";
import { TIPO_ACTIVO_LABELS } from "@/features/activos/types/activo.types";
import type {
  CatalogoRow,
  RecursoCatalogo,
} from "@/features/catalogos/types/catalogos";

const PAGE_SIZE = 10;

const ESTADO_LABELS = { activo: "Activo", inactivo: "Inactivo" };

interface CatalogoCrudProps {
  recurso: RecursoCatalogo;
  initialRows: CatalogoRow[];
  canCrear: boolean;
  canEditar: boolean;
  canEliminar: boolean;
  /** Opciones dinámicas resueltas en servidor, por nombre de campo. */
  opcionesFuente?: Record<string, { value: string; label: string }[]>;
}

function defaultsFrom(
  campos: CampoCatalogo[],
  opcionesFuente: CatalogoCrudProps["opcionesFuente"] = {}
): Record<string, unknown> {
  return Object.fromEntries(
    campos.map((campo) => {
      if (campo.kind === "switch") return [campo.name, true];
      if (campo.kind === "number") return [campo.name, 0];
      if (campo.kind === "select") {
        const opciones = campo.optionsSource
          ? (opcionesFuente?.[campo.name] ?? [])
          : (campo.options ?? []);
        return [campo.name, opciones[0]?.value ?? ""];
      }
      return [campo.name, ""];
    })
  );
}

/**
 * Reemplaza `undefined`/`null` por el mismo default que `defaultsFrom` para
 * cada campo, de modo que el resolver de Zod nunca reciba `undefined` en un
 * campo string (que produce "Invalid input: expected string, received
 * undefined"). La validación de negocio no se debilita: un string vacío
 * sigue pasando por los mensajes de dominio del schema.
 */
function normalizarValores(
  valores: Record<string, unknown>,
  campos: CampoCatalogo[],
  opcionesFuente: CatalogoCrudProps["opcionesFuente"]
): Record<string, unknown> {
  const base = defaultsFrom(campos, opcionesFuente);
  const normalizados = { ...valores };
  for (const campo of campos) {
    const valor = normalizados[campo.name];
    if (valor === undefined || valor === null) {
      normalizados[campo.name] = base[campo.name];
    }
  }
  return normalizados;
}

export default function CatalogoCrud({
  recurso,
  initialRows,
  canCrear,
  canEditar,
  canEliminar,
  opcionesFuente,
}: CatalogoCrudProps) {
  const router = useRouter();
  const toast = useToast();
  const config: CatalogoConfig = CATALOGOS[recurso];

  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editingRow, setEditingRow] = useState<CatalogoRow | null>(null);
  const [eliminarTarget, setEliminarTarget] = useState<CatalogoRow | null>(null);

  const crearMutation = useResourceMutation<{
    valores: Record<string, unknown>;
  }>(async ({ valores }) =>
    crearCatalogo(recurso, valores as never)
  );
  const actualizarMutation = useResourceMutation<{
    id: string;
    valores: Record<string, unknown>;
  }>(async ({ id, valores }) =>
    actualizarCatalogo(recurso, id, valores as never)
  );
  const eliminarMutation = useResourceMutation<{ id: string }>(
    async ({ id }) => eliminarCatalogo(recurso, id)
  );

  const filtrados = useMemo(() => {
    const b = busqueda.trim().toLowerCase();
    if (!b) return initialRows;
    return initialRows.filter((row) => {
      const objetivo = Object.values(row)
        .filter((v) => typeof v === "string" || typeof v === "number")
        .join(" ")
        .toLowerCase();
      return objetivo.includes(b);
    });
  }, [initialRows, busqueda]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibles = filtrados.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function abrirNuevo() {
    setEditingRow(null);
    setModalAbierto(true);
  }

  function abrirEdicion(row: CatalogoRow) {
    setEditingRow(row);
    setModalAbierto(true);
  }

  function cerrarModal(pendienteActivo = false) {
    if (pendienteActivo) return;
    setModalAbierto(false);
    setEditingRow(null);
  }

  const hayOperacion = [crearMutation, actualizarMutation, eliminarMutation].some(
    (m) => m.status === "submitting"
  );

  async function onGuardar(valores: Record<string, unknown>) {
    const preparados = normalizarValores(
      valores,
      config.campos,
      opcionesFuente
    );
    const resultado = editingRow
      ? await actualizarMutation.mutate({ id: editingRow.id, valores: preparados })
      : await crearMutation.mutate({ valores: preparados });

    if (resultado.ok) {
      toast.success(
        editingRow ? "Registro actualizado" : "Registro creado",
        `El ${config.titulo.toLowerCase()} se guardó correctamente.`
      );
      setModalAbierto(false);
      setEditingRow(null);
      router.refresh();
    } else {
      toast.error(
        editingRow ? "No se pudo actualizar" : "No se pudo crear",
        resultado.error
      );
    }
  }

  async function onConfirmarEliminar() {
    if (!eliminarTarget) return;
    const resultado = await eliminarMutation.mutate({ id: eliminarTarget.id });
    if (resultado.ok) {
      toast.success(
        "Registro desactivado",
        `El ${config.titulo.toLowerCase()} dejó de estar activo.`
      );
      setEliminarTarget(null);
      router.refresh();
    } else {
      toast.error("No se pudo desactivar", resultado.error);
    }
  }

  const columns: DataTableColumn<CatalogoRow>[] = [
    ...config.columnas.map((col) => {
      if (col.badge === "estado") {
        return {
          key: col.key,
          header: col.header,
          render: (row: CatalogoRow) => (
            <StatusBadge
              value={row.activo === true ? "activo" : "inactivo"}
              labels={ESTADO_LABELS}
            />
          ),
        } satisfies DataTableColumn<CatalogoRow>;
      }
      if (col.badge === "categoria") {
        return {
          key: col.key,
          header: col.header,
          render: (row: CatalogoRow) => (
            <Badge color="primary">
              {TIPO_ACTIVO_LABELS[row.categoria as "vehiculo" | "maquina" | "equipo"]}
            </Badge>
          ),
        } satisfies DataTableColumn<CatalogoRow>;
      }
      return {
        key: col.key,
        header: col.header,
        render: (row: CatalogoRow) => {
          const valor = row[col.field ?? col.key];
          if (col.labelSource) {
            const opciones = opcionesFuente?.[col.labelSource] ?? [];
            const opcion = opciones.find((o) => o.value === String(valor));
            return opcion ? opcion.label : "—";
          }
          return valor === null ||
            valor === undefined ||
            valor === ""
            ? "—"
            : `${col.prefix ?? ""}${typeof valor === "number" ? valor.toLocaleString("es-CO") : String(valor)}${col.suffix ?? ""}`;
        },
      } satisfies DataTableColumn<CatalogoRow>;
    }),
    {
      key: "acciones",
      header: "Acciones",
      render: (row) =>
        canEditar || canEliminar ? (
          <div className="flex items-center gap-3">
            {canEditar && (
              <button
                type="button"
                onClick={() => abrirEdicion(row)}
                className="text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white"
              >
                Editar
              </button>
            )}
            {canEliminar && (
              <button
                type="button"
                onClick={() => setEliminarTarget(row)}
                className="text-sm font-medium text-error-500 hover:text-error-600"
              >
                Desactivar
              </button>
            )}
          </div>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={config.tituloPlural}
        description={config.descripcion}
        actions={
          canCrear ? (
            <Button onClick={abrirNuevo}>Nuevo {config.titulo.toLowerCase()}</Button>
          ) : undefined
        }
      />

      <ComponentCard title={`Listado de ${config.tituloPlural.toLowerCase()}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            placeholder="Buscar en el catálogo..."
            onChange={(value) => {
              setBusqueda(value);
              setPage(1);
            }}
            className="sm:max-w-xs"
          />
        </div>

        <DataTable<CatalogoRow>
          columns={columns}
          data={visibles}
          rowKey={(row) => row.id}
          emptyTitle="Sin registros"
          emptyDescription={
            canCrear
              ? `Crea el primer ${config.titulo.toLowerCase()} con el botón superior.`
              : undefined
          }
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </ComponentCard>

      {modalAbierto && (
        <CatalogoFormModal
          key={editingRow?.id ?? "nuevo"}
          config={config}
          row={editingRow}
          submitting={hayOperacion}
          onClose={() => cerrarModal()}
          onSubmit={onGuardar}
          opcionesFuente={opcionesFuente}
        />
      )}

      <ConfirmDialog
        isOpen={eliminarTarget !== null}
        onClose={() => setEliminarTarget(null)}
        onConfirm={onConfirmarEliminar}
        title={`¿Desactivar ${config.titulo.toLowerCase()}?`}
        message="El registro dejará de estar activo, pero no se eliminará de la base de datos."
        confirmLabel="Desactivar"
        variant="warning"
        loading={eliminarMutation.status === "submitting"}
      />
    </div>
  );
}

interface CatalogoFormModalProps {
  config: CatalogoConfig;
  row: CatalogoRow | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (valores: Record<string, unknown>) => void;
  opcionesFuente?: Record<string, { value: string; label: string }[]>;
}

function CatalogoFormModal({
  config,
  row,
  submitting,
  onClose,
  onSubmit,
  opcionesFuente,
}: CatalogoFormModalProps) {
  const schema = CATALOGO_ESQUEMAS[config.recurso] as unknown as ZodType<FieldValues>;

  const defaultValues = useMemo(() => {
    const base = defaultsFrom(config.campos, opcionesFuente);
    if (row) {
      for (const campo of config.campos) {
        if (
          row[campo.name] !== undefined &&
          row[campo.name] !== null
        ) {
          const valor = row[campo.name];
          base[campo.name] =
            campo.kind === "time" && String(valor).length > 5
              ? String(valor).slice(0, 5)
              : valor;
        }
      }
    }
    return base;
  }, [config.campos, row, opcionesFuente]);

  /**
   * Valida contra una copia normalizada (undefined/null → default), de modo que
   * el resolver de Zod nunca reciba `undefined` en un campo string y produzca
   * "Invalid input: expected string, received undefined". La validación de
   * negocio no se debilita: un campo `""` sigue exigido con mensaje de dominio.
   */
  const resolver = useMemo(
    () => async (values: FieldValues, ctx: unknown, opts: unknown) =>
        zodResolver(schema as never)(
          normalizarValores(
            values as Record<string, unknown>,
            config.campos,
            opcionesFuente
          ) as never,
          ctx as never,
          opts as never
        ),
    [schema, config.campos, opcionesFuente]
  );

  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useAppForm(schema, { defaultValues, resolver } as never);

  function renderCampo(campo: CampoCatalogo) {
    switch (campo.kind) {
      case "number":
        return (
          <FormField
            key={campo.name}
            label={campo.label}
            htmlFor={`campo-${campo.name}`}
            required={campo.required}
            hint={campo.hint}
            error={errors[campo.name]?.message as string | undefined}
          >
            <Input
              id={`campo-${campo.name}`}
              type="number"
              min={0}
              error={Boolean(errors[campo.name])}
              {...register(campo.name)}
            />
          </FormField>
        );
      case "time":
        return (
          <FormField
            key={campo.name}
            label={campo.label}
            htmlFor={`campo-${campo.name}`}
            required={campo.required}
            hint={campo.hint}
            error={errors[campo.name]?.message as string | undefined}
          >
            <Input
              id={`campo-${campo.name}`}
              type="time"
              error={Boolean(errors[campo.name])}
              {...register(campo.name)}
            />
          </FormField>
        );
      case "select":
        return (
          <Controller
            key={campo.name}
            control={control}
            name={campo.name}
            render={({ field }) => (
              <FormField
                label={campo.label}
                htmlFor={`campo-${campo.name}`}
                required={campo.required}
                hint={campo.hint}
                error={errors[campo.name]?.message as string | undefined}
              >
                <Select
                  placeholder="Selecciona una opción"
                  value={field.value as string}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  options={
                    campo.optionsSource
                      ? (opcionesFuente?.[campo.name] ?? [])
                      : (campo.options ?? [])
                  }
                />
              </FormField>
            )}
          />
        );
      case "switch":
        return (
          <Controller
            key={campo.name}
            control={control}
            name={campo.name}
            render={({ field }) => (
              <Switch
                label={campo.label}
                defaultChecked={Boolean(field.value)}
                onChange={(checked) => field.onChange(checked)}
              />
            )}
          />
        );
      default:
        return (
          <FormField
            key={campo.name}
            label={campo.label}
            htmlFor={`campo-${campo.name}`}
            required={campo.required}
            hint={campo.hint}
            error={errors[campo.name]?.message as string | undefined}
          >
            <Input
              id={`campo-${campo.name}`}
              type="text"
              placeholder={campo.placeholder}
              error={Boolean(errors[campo.name])}
              {...register(campo.name)}
            />
          </FormField>
        );
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="max-w-xl p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {row ? `Editar ${config.titulo.toLowerCase()}` : `Nuevo ${config.titulo.toLowerCase()}`}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {config.descripcion}
        </p>
      </div>

      <Form
        onSubmit={handleSubmit(
          (valores) => onSubmit(valores as never),
          (errores) => {
            if (process.env.NODE_ENV === "development") {
              console.debug("[catalogos] submit inválido", {
                recurso: config.recurso,
                errores: Object.fromEntries(
                  Object.entries(errores).map(([campo, e]) => [
                    campo,
                    e && typeof e === "object" && "message" in e
                      ? e.message
                      : String(e ?? ""),
                  ])
                ),
                valores: getValues(),
              });
            }
          }
        )}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {config.campos.map(renderCampo)}
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Guardando..."
              : row
                ? "Guardar cambios"
                : "Crear registro"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}