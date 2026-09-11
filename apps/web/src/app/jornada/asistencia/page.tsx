import { getPermisos } from "@/lib/auth/permisos";
import { listarAsistenciaDelDia } from "@/features/jornada/queries/listarAsistencia";
import AsistenciaClient from "./AsistenciaClient";

export default async function AsistenciaPage() {
  const permisos = await getPermisos();
  const hoy = new Date().toISOString().split("T")[0];

  let asistencia: Awaited<ReturnType<typeof listarAsistenciaDelDia>> = [];
  try {
    asistencia = await listarAsistenciaDelDia({ fecha: hoy });
  } catch {
    // Si falla, mostrar vacío
  }

  return (
    <AsistenciaClient
      initialAsistencia={asistencia}
      permisos={permisos}
      fechaInicial={hoy}
    />
  );
}
