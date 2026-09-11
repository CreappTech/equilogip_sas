import { getPermisos } from "@/lib/auth/permisos";
import { obtenerConfiguracionJornada } from "@/features/jornada/queries/obtenerConfiguracionJornada";
import ConfiguracionClient from "./ConfiguracionClient";

export default async function ConfiguracionPage() {
  const permisos = await getPermisos();

  let config: Awaited<ReturnType<typeof obtenerConfiguracionJornada>> = null;
  try {
    config = await obtenerConfiguracionJornada();
  } catch {
    // Si falla, mostrar vacío
  }

  return <ConfiguracionClient initialConfig={config} permisos={permisos} />;
}
