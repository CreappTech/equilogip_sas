import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { getEntregaDetalle } from "@/features/dotacion/queries/getEntregaDetalle";
import { permisoDotacion } from "@/features/dotacion/types/dotacion.types";
import { getEmpresaConfig } from "@/features/operaciones/queries/actas";
import AdminShell from "@/components/layout/AdminShell";
import DotacionDetalleClient from "./DotacionDetalleClient";

export default async function DotacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();

  const permisos = await getPermisos();

  const detalle = await getEntregaDetalle(id);
  if (!detalle) notFound();

  if (!permisos.includes(permisoDotacion("ver"))) {
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

  const empresa = await getEmpresaConfig();

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <DotacionDetalleClient
        detalle={detalle}
        empresa={empresa}
        permisos={permisos}
      />
    </AdminShell>
  );
}