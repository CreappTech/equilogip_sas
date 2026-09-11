import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import AdminShell from "@/components/layout/AdminShell";
import PageHeader from "@/components/common/PageHeader";
import { CATALOGOS, RECURSOS_CATALOGO } from "@/features/catalogos/catalogo.config";
import { catalogoPermiso } from "@/features/catalogos/types/catalogos";
import type { RecursoCatalogo } from "@/features/catalogos/types/catalogos";

function puedeVerRecurso(
  permisos: string[],
  recurso: RecursoCatalogo
): boolean {
  return (
    permisos.includes("*") ||
    permisos.includes(catalogoPermiso(recurso, "ver")) ||
    permisos.some((p) => p.startsWith(`catalogos.${recurso}.`))
  );
}

export default async function CatalogosPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const visibles = RECURSOS_CATALOGO.filter((recurso) =>
    puedeVerRecurso(permisos, recurso)
  );

  if (visibles.length === 0) {
    redirect("/");
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

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <PageHeader
        title="Maestro de datos"
        description="Catálogos maestros que alimentan los módulos del sistema."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((recurso) => {
          const config = CATALOGOS[recurso];
          return (
            <Link
              key={recurso}
              href={`/catalogos/${recurso}`}
              className="group rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
            >
              <h3 className="text-base font-medium text-gray-800 group-hover:text-brand-600 dark:text-white/90 dark:group-hover:text-brand-400">
                {config.tituloPlural}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {config.descripcion}
              </p>
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}