import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import AdminShell from "@/components/layout/AdminShell";
import { listInspecciones } from "@/features/mantenimiento/queries/listInspecciones";
import { listCategorias } from "@/features/mantenimiento/queries/listCategorias";
import { getConfiguracion } from "@/features/mantenimiento/queries/getConfiguracion";
import MantenimientoDashboardClient from "./MantenimientoDashboardClient";

export default async function MantenimientoPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeVer =
    permisos.includes("*") ||
    permisos.includes("mantenimiento.inspecciones.ver");
  const puedeCrear =
    permisos.includes("*") ||
    permisos.includes("mantenimiento.inspecciones.crear");

  if (!puedeVer && !puedeCrear) {
    redirect("/");
  }

  // El panel es para quien puede ver resultados; el operador entra al flujo.
  if (!puedeVer) {
    redirect("/mantenimiento/inspeccion");
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

  const [inspecciones, categorias, configuracion] = await Promise.all([
    listInspecciones(),
    listCategorias(),
    getConfiguracion(),
  ]);

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <MantenimientoDashboardClient
        inspecciones={inspecciones}
        categorias={categorias}
        tiempoMinimoSegundos={configuracion.tiempo_minimo_segundos}
        puedeCrear={puedeCrear}
      />
    </AdminShell>
  );
}