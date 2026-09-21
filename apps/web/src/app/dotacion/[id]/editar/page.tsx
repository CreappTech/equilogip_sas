import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { getEntregaDetalle } from "@/features/dotacion/queries/getEntregaDetalle";
import { listEmpleadosParaDotacion } from "@/features/dotacion/queries/listEmpleadosParaDotacion";
import { permisoDotacion } from "@/features/dotacion/types/dotacion.types";
import AdminShell from "@/components/layout/AdminShell";
import DotacionEditarClient from "./DotacionEditarClient";

export default async function DotacionEditarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();

  const permisos = await getPermisos();

  const detalle = await getEntregaDetalle(id);
  if (!detalle) notFound();

  if (!permisos.includes(permisoDotacion("editar"))) {
    redirect(`/dotacion/${id}`);
  }

  if (detalle.entrega.estado === "anulada") {
    redirect(`/dotacion/${id}`);
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

  const { entrega } = detalle;

  const initialValues = {
    empleado_id: entrega.empleado_id,
    fecha_entrega: entrega.fecha_entrega,
    tipo_entrega: entrega.tipo_entrega,
    entregado_por: entrega.entregado_por,
    observaciones: entrega.observaciones ?? "",
    lineas: detalle.lineas.map((linea) => ({
      descripcion: linea.descripcion,
      cantidad: linea.cantidad,
      talla: linea.talla ?? "",
    })),
  };

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <DotacionEditarClient
        id={id}
        initialValues={initialValues}
        empleados={empleados}
      />
    </AdminShell>
  );
}