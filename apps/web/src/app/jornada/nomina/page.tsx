import { getPermisos } from "@/lib/auth/permisos";
import { obtenerResumenNomina } from "@/features/jornada/queries/obtenerResumenNomina";
import NominaClient from "./NominaClient";

export default async function NominaPage() {
  const permisos = await getPermisos();

  let resumen: Awaited<ReturnType<typeof obtenerResumenNomina>> = [];
  try {
    resumen = await obtenerResumenNomina();
  } catch {
    // Si falla, mostrar vacío
  }

  return <NominaClient initialResumen={resumen} permisos={permisos} />;
}
