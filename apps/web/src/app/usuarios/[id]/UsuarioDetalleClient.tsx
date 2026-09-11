"use client";

import Link from "next/link";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";

import type { ListadoUsuario } from "@/lib/queries/usuarios";

interface UsuarioDetalleClientProps {
  usuario: ListadoUsuario;
  canEditar: boolean;
}

function FilaDetalle({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[240px_1fr]">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="text-sm text-gray-800 dark:text-white/90">{value}</dd>
    </div>
  );
}

function estadoBadge(estado: string) {
  if (estado === "activo") return <Badge color="success">Activo</Badge>;
  if (estado === "bloqueado") return <Badge color="error">Bloqueado</Badge>;
  return <Badge color="light">Inactivo</Badge>;
}

export default function UsuarioDetalleClient({
  usuario,
  canEditar,
}: UsuarioDetalleClientProps) {
  return (
    <div>
      <PageHeader
        title={`${usuario.nombres} ${usuario.apellidos}`}
        description={usuario.email_login}
        actions={
          <>
            <Link href="/usuarios">
              <Button variant="outline">Volver al listado</Button>
            </Link>
            {canEditar && (
              <Link href={`/usuarios/${usuario.id}/editar`}>
                <Button variant="outline">Editar</Button>
              </Link>
            )}
          </>
        }
      />

      <ComponentCard title="Datos del usuario">
        <dl className="divide-y divide-gray-100 dark:divide-gray-800">
          <FilaDetalle
            label="Nombre"
            value={`${usuario.nombres} ${usuario.apellidos}`}
          />
          <FilaDetalle label="Correo electrónico" value={usuario.email_login} />
          <FilaDetalle label="Número de documento" value={usuario.numero_documento} />
          <FilaDetalle label="Teléfono" value={usuario.telefono ?? "—"} />
          <FilaDetalle label="Estado" value={estadoBadge(usuario.estado)} />
          <FilaDetalle
            label="Roles"
            value={
              <div className="flex flex-wrap gap-1">
                {usuario.roles.length === 0 && (
                  <span className="text-sm text-gray-400">Sin roles</span>
                )}
                {usuario.roles.map((r) => (
                  <Badge key={r.codigo} color="primary" size="sm">
                    {r.nombre}
                  </Badge>
                ))}
              </div>
            }
          />
          <FilaDetalle
            label="Último acceso"
            value={
              usuario.fecha_ultimo_acceso
                ? new Date(usuario.fecha_ultimo_acceso).toLocaleString("es-CO")
                : "—"
            }
          />
          <FilaDetalle
            label="Creado"
            value={new Date(usuario.created_at).toLocaleString("es-CO")}
          />
        </dl>
      </ComponentCard>
    </div>
  );
}