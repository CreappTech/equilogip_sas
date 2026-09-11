"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import Badge from "@/components/ui/badge/Badge";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import Pagination from "@/components/tables/Pagination";
import { EyeIcon, PencilIcon, PlusIcon, TrashIcon } from "@/icons";

import type { ListadoUsuario } from "@/lib/queries/usuarios";
import type { Rol } from "@/lib/queries/roles";
import {
  crearUsuario as crearUsuarioAction,
  eliminarUsuario as eliminarUsuarioAction,
} from "./actions";

const TENANT_PRINCIPAL = "11111111-1111-1111-1111-111111111111";
const PAGE_SIZE = 8;

const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  apellido: z.string().min(1, "El apellido es obligatorio."),
  numeroDocumento: z.string().min(1, "El número de documento es obligatorio."),
  correo: z
    .string()
    .min(1, "El correo es obligatorio.")
    .email("El correo no es válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  telefono: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ESTADOS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
  { value: "bloqueado", label: "Bloqueado" },
] as const;

function estadoBadge(estado: string) {
  if (estado === "activo") return <Badge color="success">Activo</Badge>;
  if (estado === "bloqueado") return <Badge color="error">Bloqueado</Badge>;
  return <Badge color="light">Inactivo</Badge>;
}

interface Props {
  initialUsers: ListadoUsuario[];
  roles: Rol[];
  currentUserId: string;
  canCrear: boolean;
  canVer: boolean;
  canEditar: boolean;
  canEliminar: boolean;
  esSuperAdmin: boolean;
}

export default function UsuariosClient({
  initialUsers,
  roles,
  currentUserId,
  canCrear,
  canVer,
  canEditar,
  canEliminar,
  esSuperAdmin,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [page, setPage] = useState(1);

  const [feedback, setFeedback] = useState<{
    tipo: "success" | "error";
    mensaje: string;
  } | null>(null);

  const createModal = useModal();
  const createForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      numeroDocumento: "",
      correo: "",
      password: "",
      telefono: "",
    },
  });
  const [nuevosRoles, setNuevosRoles] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);

  const [eliminarTarget, setEliminarTarget] = useState<ListadoUsuario | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialUsers.filter((u) => {
      if (
        q &&
        !`${u.nombres} ${u.apellidos} ${u.email_login}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      if (filtroEstado !== "todos" && u.estado !== filtroEstado) return false;
      if (filtroRol !== "todos" && !u.roles.some((r) => r.id === filtroRol))
        return false;
      return true;
    });
  }, [initialUsers, query, filtroEstado, filtroRol]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function onSubmit(data: FormValues) {
    setCreando(true);
    setFeedback(null);
    const res = await crearUsuarioAction({
      nombre: data.nombre,
      apellido: data.apellido,
      numeroDocumento: data.numeroDocumento,
      correo: data.correo,
      password: data.password,
      telefono: data.telefono,
      tenantId: TENANT_PRINCIPAL,
      rol: "operario",
      rolIds: nuevosRoles,
    });
    setCreando(false);
    if (res.ok) {
      setFeedback({ tipo: "success", mensaje: "Usuario creado correctamente." });
      createModal.closeModal();
      createForm.reset();
      setNuevosRoles([]);
      router.refresh();
    } else {
      setFeedback({ tipo: "error", mensaje: res.error });
    }
  }

  async function onConfirmarEliminacion() {
    if (!eliminarTarget) return;
    setEliminando(true);
    setFeedback(null);
    const res = await eliminarUsuarioAction({ id: eliminarTarget.id });
    setEliminando(false);
    if (res.ok) {
      setFeedback({
        tipo: "success",
        mensaje: `El usuario "${eliminarTarget.nombres} ${eliminarTarget.apellidos}" fue eliminado.`,
      });
      setEliminarTarget(null);
      router.refresh();
    } else {
      setFeedback({ tipo: "error", mensaje: res.error });
      setEliminarTarget(null);
    }
  }

  const rolOptions = roles.map((r) => ({ value: r.id, label: r.nombre }));
  const rolFiltroOptions = [
    { value: "todos", label: "Todos los roles" },
    ...rolOptions,
  ];
  const estadoOptions = [
    { value: "todos", label: "Todos los estados" },
    ...ESTADOS.map((e) => ({ value: e.value, label: e.label })),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageBreadcrumb pageTitle="Gestión de Usuarios" />

      {feedback && (
        <div
          className={`mb-4 rounded-xl border p-4 text-sm ${
            feedback.tipo === "success"
              ? "border-success-500 bg-success-50 text-success-700 dark:bg-success-500/10"
              : "border-error-500 bg-error-50 text-error-700 dark:bg-error-500/10"
          }`}
        >
          {feedback.mensaje}
        </div>
      )}

      <ComponentCard
        title="Listado de usuarios"
        desc="Busca, filtra y administra los usuarios del sistema"
        headerRight={
          canCrear ? (
            <Button
              onClick={() => {
                createModal.openModal();
                setFeedback(null);
              }}
              startIcon={<PlusIcon />}
            >
              Nuevo usuario
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Buscar</Label>
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Nombre, apellido o correo..."
            />
          </div>
          <div>
            <Label>Estado</Label>
            <Select
              value={filtroEstado}
              onChange={(v) => {
                setFiltroEstado(v);
                setPage(1);
              }}
              options={estadoOptions}
            />
          </div>
          <div>
            <Label>Rol</Label>
            <Select
              value={filtroRol}
              onChange={(v) => {
                setFiltroRol(v);
                setPage(1);
              }}
              options={rolFiltroOptions}
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 text-left dark:border-gray-800">
                <TableCell isHeader className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Nombre
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Correo
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Documento
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Roles
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  Estado
                </TableCell>
                <TableCell isHeader className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                  Acciones
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((u) => (
                <TableRow
                  key={u.id}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <TableCell className="px-3 py-2.5">
                    <div className="text-[13px] font-medium text-gray-800 dark:text-white/90">
                      {u.nombres} {u.apellidos}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-[13px] text-gray-600 dark:text-gray-400">
                    {u.email_login}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-[13px] text-gray-600 dark:text-gray-400">
                    {u.numero_documento}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && (
                        <span className="text-xs text-gray-400">Sin roles</span>
                      )}
                      {u.roles.map((r) => (
                        <Badge key={r.codigo} color="primary" size="sm">
                          {r.nombre}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">{estadoBadge(u.estado)}</TableCell>
                  <TableCell className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {canVer && (
                        <Link
                          href={`/usuarios/${u.id}`}
                          title="Ver detalle"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                      )}
                      {canEditar && (
                        <Link
                          href={`/usuarios/${u.id}/editar`}
                          title="Editar"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-white"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      )}
                      {canEliminar && u.id !== currentUserId && (
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => setEliminarTarget(u)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-error-500 transition-colors hover:bg-error-50 dark:hover:bg-error-500/10"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-3 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length === 0
              ? "Mostrando 0 de 0 usuarios"
              : `Mostrando ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(
                  safePage * PAGE_SIZE,
                  filtered.length
                )} de ${filtered.length} usuarios`}
          </p>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </ComponentCard>

      <Modal
        isOpen={createModal.isOpen}
        onClose={createModal.closeModal}
        className="max-w-lg p-6"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Nuevo usuario
        </h3>
        <form onSubmit={createForm.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre *</Label>
              <Controller
                name="nombre"
                control={createForm.control}
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="Nombre"
                    error={Boolean(createForm.formState.errors.nombre)}
                  />
                )}
              />
            </div>
            <div>
              <Label>Apellido *</Label>
              <Controller
                name="apellido"
                control={createForm.control}
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="Apellido"
                    error={Boolean(createForm.formState.errors.apellido)}
                  />
                )}
              />
            </div>
          </div>
          <div>
            <Label>Número de documento *</Label>
            <Controller
              name="numeroDocumento"
              control={createForm.control}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="Número de documento"
                  error={Boolean(createForm.formState.errors.numeroDocumento)}
                />
              )}
            />
          </div>
          <div>
            <Label>Correo electrónico *</Label>
            <Controller
              name="correo"
              control={createForm.control}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  type="email"
                  placeholder="correo@ejemplo.com"
                  error={Boolean(createForm.formState.errors.correo)}
                />
              )}
            />
          </div>
          <div>
            <Label>Contraseña *</Label>
            <Controller
              name="password"
              control={createForm.control}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  error={Boolean(createForm.formState.errors.password)}
                />
              )}
            />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Controller
              name="telefono"
              control={createForm.control}
              render={({ field }) => (
                <Input
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="Opcional"
                />
              )}
            />
          </div>

          <div>
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => {
                const activo = nuevosRoles.includes(r.id);
                const noPermitido = r.codigo === "AUTH_SUPER_ADMIN" && !esSuperAdmin;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={noPermitido}
                    onClick={() =>
                      setNuevosRoles((prev) =>
                        activo ? prev.filter((x) => x !== r.id) : [...prev, r.id]
                      )
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      activo
                        ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15"
                        : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {r.nombre}
                    {noPermitido && (
                      <span className="text-xs text-gray-400">(no permitido)</span>
                    )}
                  </button>
                );
              })}
              {roles.length === 0 && (
                <span className="text-sm text-gray-400">
                  No hay roles disponibles.
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={createModal.closeModal}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creando}>
              {creando ? "Creando..." : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={eliminarTarget !== null}
        onClose={() => setEliminarTarget(null)}
        onConfirm={onConfirmarEliminacion}
        title="¿Eliminar usuario?"
        message={
          eliminarTarget
            ? `¿Estás seguro de que deseas eliminar a "${eliminarTarget.nombres} ${eliminarTarget.apellidos}"? El usuario dejará de poder ingresar al sistema y podrás restaurarlo más adelante.`
            : ""
        }
        confirmLabel="Eliminar"
        loading={eliminando}
      />
    </div>
  );
}
