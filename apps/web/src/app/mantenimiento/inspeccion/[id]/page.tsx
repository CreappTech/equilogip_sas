import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import AdminShell from "@/components/layout/AdminShell";
import { getInspeccion } from "@/features/mantenimiento/queries/getInspeccion";
import { listPreguntas } from "@/features/mantenimiento/queries/listPreguntas";
import type { TipoActivo } from "@/features/activos/types/activo.types";
import type { PreguntaMantenimiento } from "@/features/mantenimiento/types/mantenimiento.types";
import InspeccionClient from "./InspeccionClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InspeccionDetallePage({ params }: Props) {
  const { id } = await params;

  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeCrear =
    permisos.includes("*") ||
    permisos.includes("mantenimiento.inspecciones.crear");

  if (!puedeCrear) {
    redirect("/mantenimiento");
  }

  const inspeccion = await getInspeccion(id);

  // RLS ya restringe al propietario; aquí se refuerza la navegación.
  if (!inspeccion || inspeccion.operador_id !== user.id) {
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

  const { data: activo } = await supabase
    .from("activos")
    .select("tipo")
    .eq("id", inspeccion.activo_id)
    .maybeSingle();

  const tipo = (activo?.tipo as TipoActivo | undefined) ?? null;

  // Las mismas reglas que usa finalizarInspeccion en servidor.
  const todas = await listPreguntas({ soloActivas: true });
  const preguntas: PreguntaMantenimiento[] = tipo
    ? todas.filter(
        (p) => p.tipo_activo === "ambos" || p.tipo_activo === tipo
      )
    : [];

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <InspeccionClient
        inspeccion={inspeccion}
        preguntas={preguntas}
        userId={user.id}
      />
    </AdminShell>
  );
}