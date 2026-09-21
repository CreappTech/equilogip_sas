import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { listEntregas } from "@/features/dotacion/queries/listEntregas";
import { permisoDotacion } from "@/features/dotacion/types/dotacion.types";
import AdminShell from "@/components/layout/AdminShell";
import DotacionesClient from "./DotacionesClient";

export default async function DotacionPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  if (!permisos.includes(permisoDotacion("ver"))) {
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

  const entregas = await listEntregas();

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <DotacionesClient initialEntregas={entregas} permisos={permisos} />
    </AdminShell>
  );
}