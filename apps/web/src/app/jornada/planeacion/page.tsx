import { getPermisos } from "@/lib/auth/permisos";
import { listarProgramacionSemanal } from "@/features/jornada/queries/listarProgramacionSemanal";
import { listarEmpleadosOpciones } from "@/features/jornada/queries/listarAsistencia";
import { listarTurnosActivos } from "@/features/jornada/queries/listarTurnosActivos";
import PlaneacionClient from "./PlaneacionClient";

export default async function PlaneacionPage() {
  const permisos = await getPermisos();

  const hoy = new Date();
  const diaSemana = hoy.getDay();
  const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes);
  const semanaInicio = lunes.toISOString().split("T")[0];

  let programacion: Awaited<ReturnType<typeof listarProgramacionSemanal>> = [];
  let empleados: Awaited<ReturnType<typeof listarEmpleadosOpciones>> = [];
  let turnos: Awaited<ReturnType<typeof listarTurnosActivos>> = [];

  try {
    [programacion, empleados, turnos] = await Promise.all([
      listarProgramacionSemanal({ semana_inicio: semanaInicio }),
      listarEmpleadosOpciones(),
      listarTurnosActivos(),
    ]);
  } catch {
    // Si falla, mostrar vacío
  }

  return (
    <PlaneacionClient
      initialProgramacion={programacion}
      empleados={empleados}
      turnos={turnos}
      permisos={permisos}
      semanaInicial={semanaInicio}
    />
  );
}
