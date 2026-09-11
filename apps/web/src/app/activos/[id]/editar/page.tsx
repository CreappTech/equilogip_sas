import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { getActivoDetalle } from "@/features/activos/queries/getActivoDetalle";
import { permisoActivo, tipoARecurso } from "@/features/activos/types/activo.types";
import type { ActivoFormValues } from "@/features/activos/schemas/activoFormSchema";
import { listCentrosServicio, listProveedores } from "@/features/activos/queries/listReferencias";
import AdminShell from "@/components/layout/AdminShell";
import ActivoEditarClient from "./ActivoEditarClient";

export default async function ActivoEditarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();

  const permisos = await getPermisos();

  const detalle = await getActivoDetalle(id);
  if (!detalle) notFound();

  const { activo } = detalle;
  const tipo = activo.tipo;

  if (!permisos.includes(permisoActivo(tipo, "editar"))) {
    redirect(`/activos/${id}`);
  }

  if (activo.estado === "retirado") {
    redirect(`/activos/${id}`);
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombres, apellidos, email_login")
    .eq("id", user.id)
    .single();

  const [centros, proveedores] = await Promise.all([
    listCentrosServicio(),
    listProveedores(),
  ]);

  const nombreCompleto = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : user.email ?? "Usuario";
  const correo = profile?.email_login ?? user.email ?? "";

  const especifico =
    tipo === "vehiculo"
      ? detalle.vehiculo
      : tipo === "maquina"
        ? detalle.maquina
        : detalle.equipo;

  const initialValues: Partial<ActivoFormValues> = {
    tipo,
    codigo_interno: activo.codigo_interno,
    subtipo: activo.subtipo,
    estado_operativo: activo.estado_operativo as
      | "OPERATIVA"
      | "EN_MANTENIMIENTO"
      | "FUERA_DE_SERVICIO",
    estado: activo.estado === "inactivo" ? "inactivo" : "activo",
    fecha_adquisicion: activo.fecha_adquisicion,
    placa: detalle.vehiculo?.placa ?? "",
    marca: especifico?.marca ?? "",
    modelo: especifico?.modelo ?? "",
    serie: activo.serie ?? "",
    numero_motor: activo.numero_motor ?? "",
    color: activo.color ?? "",
    lectura_inicial: activo.lectura_inicial ?? null,
    origen: activo.origen,
    centro_servicio_id: activo.centro_servicio_id ?? "",
    proveedor_id: activo.proveedor_id ?? "",
    anio: especifico?.anio ?? null,
  };

  const datosTecnicos = activo.datos_tecnicos;
  const datosFabricante = activo.datos_fabricante;

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <ActivoEditarClient
        id={id}
        tipoLabel={tipoARecurso(tipo)}
        initialValues={initialValues}
        datosTecnicos={datosTecnicos}
        datosFabricante={datosFabricante}
        centros={centros}
        proveedores={proveedores}
      />
    </AdminShell>
  );
}