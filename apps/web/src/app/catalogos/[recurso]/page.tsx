import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import AdminShell from "@/components/layout/AdminShell";
import { CATALOGOS } from "@/features/catalogos/catalogo.config";
import { listarCatalogo } from "@/features/catalogos/queries/listCatalogos";
import { catalogoPermiso } from "@/features/catalogos/types/catalogos";
import type { RecursoCatalogo } from "@/features/catalogos/types/catalogos";
import CatalogoCrud from "./CatalogoCrud";

export default async function CatalogoPage({
  params,
}: {
  params: Promise<{ recurso: string }>;
}) {
  const { recurso } = await params;

  if (!(recurso in CATALOGOS)) {
    notFound();
  }

  const recursoValido = recurso as RecursoCatalogo;
  const config = CATALOGOS[recursoValido];

  const user = await requireUser();
  const permisos = await getPermisos();

  const puedeVer =
    permisos.includes("*") ||
    permisos.includes(catalogoPermiso(recursoValido, "ver")) ||
    permisos.some((p) => p.startsWith(`catalogos.${recursoValido}.`));

  if (!puedeVer) {
    redirect("/catalogos");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombres, apellidos, email_login")
    .eq("id", user.id)
    .single();

  const nombreCompleto = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : user.email ?? "Usuario";
  const correo = profile?.email_login ?? user.email ?? "";

  const filas = await listarCatalogo(recursoValido);

  const opcionesFuente: Record<string, { value: string; label: string }[]> = {};
  for (const campo of config.campos) {
    if (campo.optionsSource) {
      const opciones = await listarCatalogo(campo.optionsSource);
      opcionesFuente[campo.name] = opciones
        .filter((opcion) => opcion.activo !== false)
        .map((opcion) => ({
          value: String(opcion.id),
          label: String(opcion.nombre ?? opcion.codigo ?? ""),
        }));
    }
  }

  const canCrear =
    permisos.includes("*") ||
    permisos.includes(catalogoPermiso(recursoValido, "crear"));
  const canEditar =
    permisos.includes("*") ||
    permisos.includes(catalogoPermiso(recursoValido, "editar"));
  const canEliminar =
    permisos.includes("*") ||
    permisos.includes(catalogoPermiso(recursoValido, "eliminar"));

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <CatalogoCrud
        recurso={recursoValido}
        initialRows={filas}
        canCrear={canCrear}
        canEditar={canEditar}
        canEliminar={canEliminar}
        opcionesFuente={opcionesFuente}
      />
    </AdminShell>
  );
}