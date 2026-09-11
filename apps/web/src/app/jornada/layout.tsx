import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import JornadaShell from "./JornadaShell";

export default async function JornadaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const permisos = await getPermisos();

  const tienePermiso =
    permisos.includes("*") ||
    permisos.some(
      (p) =>
        p.startsWith("jornada.planeacion") ||
        p.startsWith("jornada.asistencia") ||
        p.startsWith("jornada.nomina") ||
        p.startsWith("jornada.configuracion")
    );

  if (!tienePermiso) {
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
    <JornadaShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      {children}
    </JornadaShell>
  );
}
