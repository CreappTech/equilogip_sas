import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import {
  listActivosOperativos,
  listClientes,
} from "@/features/operaciones/queries/listReferencias";
import AdminShell from "@/components/layout/AdminShell";
import ActaGeneracionForm from "./ActaGeneracionForm";

export default async function ActasNuevaPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeGenerar =
    permisos.includes("*") || permisos.includes("operaciones.actas.generar");

  if (!puedeGenerar) {
    redirect("/operaciones/actas");
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

  const [clientes, activos] = await Promise.all([
    listClientes(),
    listActivosOperativos(),
  ]);

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <ActaGeneracionForm clientes={clientes} activos={activos} />
    </AdminShell>
  );
}