import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import AdminShell from "@/components/layout/AdminShell";
import { listPreguntas } from "@/features/mantenimiento/queries/listPreguntas";
import { listCategorias } from "@/features/mantenimiento/queries/listCategorias";
import PreguntasClient from "./PreguntasClient";

export default async function MantenimientoPreguntasPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeVer =
    permisos.includes("*") ||
    permisos.includes("mantenimiento.preguntas.ver");

  if (!puedeVer) {
    redirect("/mantenimiento");
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

  const [preguntas, categorias] = await Promise.all([
    listPreguntas(),
    listCategorias(),
  ]);

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <PreguntasClient preguntas={preguntas} categorias={categorias} />
    </AdminShell>
  );
}