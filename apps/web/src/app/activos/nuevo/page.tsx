import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getPermisos, requireUser } from "@/lib/auth/permisos";
import { permisoActivo } from "@/features/activos/types/activo.types";
import type { TipoActivo } from "@/features/activos/types/activo.types";
import { listCentrosServicio, listActivoSubtipos, listProveedores } from "@/features/activos/queries/listReferencias";
import AdminShell from "@/components/layout/AdminShell";
import ActivoNuevoClient from "./ActivoNuevoClient";

const TIPOS: TipoActivo[] = ["vehiculo", "maquina", "equipo"];

export default async function ActivoNuevoPage() {
  const user = await requireUser();

  const permisos = await getPermisos();

  const puedeCrear = TIPOS.some((t) => permisos.includes(permisoActivo(t, "crear")));
  if (!puedeCrear) redirect("/activos");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nombres, apellidos, email_login")
    .eq("id", user.id)
    .single();

  const [centros, proveedores, subtipos] = await Promise.all([
    listCentrosServicio(),
    listProveedores(),
    listActivoSubtipos(),
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
      <ActivoNuevoClient centros={centros} proveedores={proveedores} subtipos={subtipos} />
    </AdminShell>
  );
}