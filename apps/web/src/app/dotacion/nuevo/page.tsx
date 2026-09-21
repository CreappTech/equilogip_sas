import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { permisoDotacion } from "@/features/dotacion/types/dotacion.types";
import { listEmpleadosParaDotacion } from "@/features/dotacion/queries/listEmpleadosParaDotacion";
import AdminShell from "@/components/layout/AdminShell";
import DotacionNuevoClient from "./DotacionNuevoClient";

export default async function DotacionNuevoPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  if (!permisos.includes(permisoDotacion("crear"))) {
    redirect("/dotacion");
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

  const empleados = await listEmpleadosParaDotacion();

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <DotacionNuevoClient empleados={empleados} />
    </AdminShell>
  );
}