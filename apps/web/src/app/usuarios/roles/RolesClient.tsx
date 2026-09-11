"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import ConfirmDialog from "@/components/ui/modal/ConfirmDialog";
import { PlusIcon } from "@/icons";

import type { RolConPermisos } from "@/lib/queries/roles";
import type { Permiso } from "@/lib/queries/permisos";
import { eliminarRol as eliminarRolAction } from "@/app/usuarios/actions";

interface Props {
  initialRoles: RolConPermisos[];
  permisosCatalogo: Permiso[];
  canCrear: boolean;
  canEditar: boolean;
  canEliminar: boolean;
}

export default function RolesClient({
  initialRoles,
  canCrear,
  canEditar,
  canEliminar,
}: Props) {
  const router = useRouter();
  const [dropdownFor, setDropdownFor] = useState<string | null>(null);
  const [rolAEliminar, setRolAEliminar] = useState<RolConPermisos | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [feedback, setFeedback] = useState<{
    tipo: "success" | "error";
    mensaje: string;
  } | null>(null);

  async function handleEliminar() {
    if (!rolAEliminar) return;
    setEliminando(true);
    setFeedback(null);
    const res = await eliminarRolAction(rolAEliminar.id);
    setEliminando(false);
    setRolAEliminar(null);
    if (res.ok) {
      setFeedback({ tipo: "success", mensaje: "Rol eliminado correctamente." });
      router.refresh();
    } else {
      setFeedback({ tipo: "error", mensaje: res.error });
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageBreadcrumb pageTitle="Gestión de Roles" />

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
        title="Listado de roles"
        desc="Administra los roles y permisos del sistema"
        headerRight={
          canCrear ? (
            <Link href="/usuarios/roles/nuevo">
              <Button startIcon={<PlusIcon />}>Nuevo rol</Button>
            </Link>
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-100 text-left dark:border-gray-800">
                <TableCell isHeader className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Nombre
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Código
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Permisos
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Estado
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  Acciones
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialRoles.length === 0 && (
                <TableRow>
                  <TableCell className="px-4 py-8 text-center text-sm text-gray-400">
                    No hay roles configurados.
                  </TableCell>
                </TableRow>
              )}
              {initialRoles.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {r.nombre}
                      </span>
                      {r.es_sistema && (
                        <Badge color="info" size="sm">Sistema</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {r.codigo}
                    </code>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.permisos.length === 0 && (
                        <span className="text-xs text-gray-400">Sin permisos</span>
                      )}
                      {r.permisos.slice(0, 4).map((p) => (
                        <Badge key={p} color="light" size="sm">
                          {p.split(".").pop()}
                        </Badge>
                      ))}
                      {r.permisos.length > 4 && (
                        <Badge color="light" size="sm">
                          +{r.permisos.length - 4}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {r.estado === "activo" ? (
                      <Badge color="success">Activo</Badge>
                    ) : (
                      <Badge color="light">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="relative flex justify-end">
                      <button
                        className="dropdown-toggle rounded-full p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() =>
                          setDropdownFor(dropdownFor === r.id ? null : r.id)
                        }
                      >
                        <MoreDot />
                      </button>
                      {dropdownFor === r.id && (
                        <Dropdown
                          isOpen
                          onClose={() => setDropdownFor(null)}
                          className="w-48"
                        >
                          <div className="p-1">
                            {canEditar && (
                              <DropdownItem>
                                <Link
                                  href={`/usuarios/roles/${r.id}`}
                                  className="flex items-center gap-2"
                                  onClick={() => setDropdownFor(null)}
                                >
                                  Editar
                                </Link>
                              </DropdownItem>
                            )}
                            {canEliminar && !r.es_sistema && (
                              <>
                                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                                <DropdownItem
                                  onClick={() => {
                                    setDropdownFor(null);
                                    setRolAEliminar(r);
                                  }}
                                >
                                  <span className="text-error-500">Eliminar</span>
                                </DropdownItem>
                              </>
                            )}
                          </div>
                        </Dropdown>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>

      <ConfirmDialog
        isOpen={rolAEliminar !== null}
        onClose={() => setRolAEliminar(null)}
        onConfirm={handleEliminar}
        title="Eliminar rol"
        message={
          rolAEliminar
            ? `¿Estás seguro de eliminar el rol "${rolAEliminar.nombre}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        loading={eliminando}
        variant="danger"
      />
    </div>
  );
}

function MoreDot() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}
