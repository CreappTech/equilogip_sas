import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { permisoEmpleado } from "@/features/empleados/types/empleado.types";
import { listCargos } from "@/features/empleados/queries/listCargos";
import { listAllCatalogosRrhh, listTurnos } from "@/features/empleados/queries/listCatalogosRrhh";
import AdminShell from "@/components/layout/AdminShell";
import EmpleadoNuevoClient from "./EmpleadoNuevoClient";

export default async function EmpleadoNuevoPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  if (!permisos.includes(permisoEmpleado("crear"))) {
    redirect("/empleados");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombres, apellidos, email_login")
    .eq("id", user.id)
    .single();

  const [cargos, catalogosRrhh, turnos] = await Promise.all([
    listCargos(),
    listAllCatalogosRrhh(),
    listTurnos(),
  ]);

  const nombreCompleto = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : user.email ?? "Usuario";
  const correo = profile?.email_login ?? user.email ?? "";

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
      permisos={permisos}
    >
      <EmpleadoNuevoClient
        cargos={cargos}
        eps={catalogosRrhh.eps}
        arl={catalogosRrhh.arl}
        fondosPension={catalogosRrhh.fondos_pension}
        bancos={catalogosRrhh.bancos}
        turnos={turnos}
      />
    </AdminShell>
  );
}