import { notFound, redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { getEmpleadoDetalle } from "@/features/empleados/queries/getEmpleadoDetalle";
import { listCargos } from "@/features/empleados/queries/listCargos";
import { listAllCatalogosRrhh, listTurnos } from "@/features/empleados/queries/listCatalogosRrhh";
import { listUsuariosVinculables } from "@/features/empleados/queries/listUsuariosVinculables";
import { permisoEmpleado } from "@/features/empleados/types/empleado.types";
import AdminShell from "@/components/layout/AdminShell";
import EmpleadoEditarClient from "./EmpleadoEditarClient";

export default async function EmpleadoEditarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();

  const permisos = await getPermisos();

  const detalle = await getEmpleadoDetalle(id);
  if (!detalle) notFound();

  if (!permisos.includes(permisoEmpleado("editar"))) {
    redirect(`/empleados/${id}`);
  }

  if (detalle.empleado.estado === "retirado") {
    redirect(`/empleados/${id}`);
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombres, apellidos, email_login")
    .eq("id", user.id)
    .single();

  const [cargos, catalogosRrhh, turnos, usuarios] = await Promise.all([
    listCargos(),
    listAllCatalogosRrhh(),
    listTurnos(),
    listUsuariosVinculables(id),
  ]);

  const nombreCompleto = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : user.email ?? "Usuario";
  const correo = profile?.email_login ?? user.email ?? "";

  const { empleado } = detalle;

const initialValues = {
    nombres: empleado.nombres,
    apellidos: empleado.apellidos,
    documento_identidad: empleado.documento_identidad,
    fecha_nacimiento: empleado.fecha_nacimiento ?? "",
    fecha_ingreso: empleado.fecha_ingreso,
    cargo_id: empleado.cargo_id,
    turno_id: empleado.turno_id ?? null,
    estado: empleado.estado as "activo" | "inactivo",
    telefono: empleado.telefono ?? "",
    email_contacto: empleado.email_contacto ?? "",
    eps_id: empleado.eps_id ?? null,
    arl_id: empleado.arl_id ?? null,
    fondo_pension_id: empleado.fondo_pension_id ?? null,
    talla_camisa: (empleado.talla_camisa as "S" | "M" | "L" | "XL" | "XXL" | "XXXL" | null) ?? null,
    talla_pantalon: (empleado.talla_pantalon as "28" | "30" | "32" | "34" | "36" | "38" | "40" | "42" | null) ?? null,
    talla_zapato: (empleado.talla_zapato as "38" | "39" | "40" | "41" | "42" | "43" | "44" | "45" | null) ?? null,
    banco_id: empleado.banco_id ?? null,
    numero_cuenta: empleado.numero_cuenta ?? "",
    contacto_emergencia_nombres: empleado.contacto_emergencia_nombres ?? "",
    contacto_emergencia_apellidos: empleado.contacto_emergencia_apellidos ?? "",
    contacto_emergencia_telefono: empleado.contacto_emergencia_telefono ?? "",
    cantidad_hijos: empleado.cantidad_hijos ?? null,
    edades_hijos: empleado.edades_hijos ?? [],
  };

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <EmpleadoEditarClient
        id={id}
        initialValues={initialValues}
        cargos={cargos}
        eps={catalogosRrhh.eps}
        arl={catalogosRrhh.arl}
        fondosPension={catalogosRrhh.fondos_pension}
        bancos={catalogosRrhh.bancos}
        turnos={turnos}
        usuario={detalle.usuario ?? null}
        usuarios={usuarios}
      />
    </AdminShell>
  );
}