"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import PageHeader from "@/components/common/PageHeader";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import LoadingState from "@/components/ui/states/LoadingState";
import EmptyState from "@/components/ui/states/EmptyState";
import Select from "@/components/form/Select";
import MultiSelect from "@/components/form/MultiSelect";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useResourceMutation } from "@/lib/data/use-resource-mutation";
import { crearProgramacionSemanal } from "@/features/jornada/actions/crearProgramacion";
import { editarProgramacion } from "@/features/jornada/actions/editarProgramacion";
import { fetchProgramacionSemanal } from "@/features/jornada/actions/fetchProgramacion";
import {
  nombreEmpleado,
  formatTime,
  formatDate,
} from "@/features/jornada/types/jornada.types";
import type {
  ListadoProgramacion,
  EmpleadoOpcion,
  TurnoOpcion,
} from "@/features/jornada/types/jornada.types";
import type { ProgramacionInput } from "@/features/jornada/schemas/jornadaSchema";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface PlaneacionClientProps {
  initialProgramacion: ListadoProgramacion[];
  empleados: EmpleadoOpcion[];
  turnos: TurnoOpcion[];
  permisos?: string[];
  semanaInicial: string;
}

export default function PlaneacionClient({
  initialProgramacion,
  empleados,
  turnos,
  permisos: permisosServidor = [],
  semanaInicial,
}: PlaneacionClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [semana, setSemana] = useState(semanaInicial);
  const [programacion, setProgramacion] = useState(initialProgramacion);
  const [cargando, setCargando] = useState(false);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [operadoresSel, setOperadoresSel] = useState<string[]>([]);
  const [turnoSel, setTurnoSel] = useState("");

  const mutationCrear = useResourceMutation(crearProgramacionSemanal);
  const mutationEditar = useResourceMutation(
    ({ id, input }: { id: string; input: ProgramacionInput }) =>
      editarProgramacion(id, input)
  );

  const puedeCrear =
    permisosServidor.includes("*") ||
    permisosServidor.includes("jornada.planeacion.crear");

  const puedeEditar =
    permisosServidor.includes("*") ||
    permisosServidor.includes("jornada.planeacion.editar");

  const [edicionTarget, setEdicionTarget] = useState<ListadoProgramacion | null>(null);
  const [horaInicioEdit, setHoraInicioEdit] = useState("");
  const [horaFinEdit, setHoraFinEdit] = useState("");

  const fechasSemana = useMemo(() => {
    const inicio = new Date(semana);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [semana]);

  const operadoresEnProgramacion = useMemo(() => {
    const ids = new Set(programacion.map((p) => p.operador_id));
    return empleados.filter((e) => ids.has(e.id));
  }, [programacion, empleados]);

  const operadoresOptions = useMemo(
    () =>
      empleados.map((e) => ({
        value: e.id,
        text: `${nombreEmpleado(e)}${
          e.turno_txt ? ` — ${e.turno_txt}` : " — Sin turno habitual"
        }`,
        selected: false,
      })),
    [empleados]
  );

  const turnoOptions = useMemo(
    () =>
      turnos.map((t) => {
        const rango =
          t.hora_inicio && t.hora_fin
            ? ` (${formatTime(t.hora_inicio)}–${formatTime(t.hora_fin)})`
            : "";
        return { value: t.id, label: `${t.nombre}${rango}` };
      }),
    [turnos]
  );

  const programacionMap = useMemo(() => {
    const map = new Map<string, Map<string, ListadoProgramacion>>();
    for (const p of programacion) {
      if (!map.has(p.operador_id)) map.set(p.operador_id, new Map());
      map.get(p.operador_id)!.set(p.fecha, p);
    }
    return map;
  }, [programacion]);

  const cargarSemana = useCallback(
    async (nuevaSemana: string) => {
      setCargando(true);
      try {
        const data = await fetchProgramacionSemanal({
          semana_inicio: nuevaSemana,
        });
        setProgramacion(data);
      } catch {
        toast.error("Error", "No se pudo cargar la programación.");
      } finally {
        setCargando(false);
      }
    },
    [toast]
  );

  function semanaAnterior() {
    const d = new Date(semana);
    d.setDate(d.getDate() - 7);
    const nueva = d.toISOString().split("T")[0];
    setSemana(nueva);
    cargarSemana(nueva);
  }

  function semanaSiguiente() {
    const d = new Date(semana);
    d.setDate(d.getDate() + 7);
    const nueva = d.toISOString().split("T")[0];
    setSemana(nueva);
    cargarSemana(nueva);
  }

  function abrirCrear() {
    setOperadoresSel([]);
    setTurnoSel("");
    setCrearAbierto(true);
  }

  async function onCrearProgramacion() {
    if (operadoresSel.length === 0) {
      toast.error("Selecciona operadores", "Elige al menos un operador.");
      return;
    }
    if (!turnoSel) {
      toast.error("Selecciona el turno", "Elige el turno para la semana.");
      return;
    }
    const resultado = await mutationCrear.mutate({
      operadores: operadoresSel,
      semana_inicio: semana,
      turno_id: turnoSel,
    });

    if (resultado.ok) {
      toast.success(
        "Programación creada",
        "Se creó la programación de la semana con el turno elegido."
      );
      setCrearAbierto(false);
      router.refresh();
    } else {
      toast.error("No se pudo crear", resultado.error);
    }
  }

  function abrirEdicion(prog: ListadoProgramacion) {
    if (!puedeEditar) return;
    setEdicionTarget(prog);
    setHoraInicioEdit(prog.hora_inicio_programada);
    setHoraFinEdit(prog.hora_fin_programada);
  }

  function cerrarEdicion() {
    setEdicionTarget(null);
    setHoraInicioEdit("");
    setHoraFinEdit("");
  }

  async function onEditarProgramacion() {
    if (!edicionTarget) return;
    const result = await mutationEditar.mutate({
      id: edicionTarget.id,
      input: {
        operador_id: edicionTarget.operador_id,
        fecha: edicionTarget.fecha,
        hora_inicio_programada: horaInicioEdit,
        hora_fin_programada: horaFinEdit,
        turno_id: edicionTarget.turno_id,
        centro_servicio_id: edicionTarget.centro_servicio_id,
      },
    });
    if (result.ok) {
      toast.success("Programación actualizada", "Se editó la programación correctamente.");
      cerrarEdicion();
      router.refresh();
    } else {
      toast.error("Error", result.error);
    }
  }

  function CeldaProgramacion({
    prog,
    onClick,
  }: {
    prog?: ListadoProgramacion;
    onClick?: () => void;
  }) {
    if (!prog) {
      return <span className="text-gray-300">&mdash;</span>;
    }
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded px-2 py-1 text-xs transition-colors ${
          puedeEditar
            ? "cursor-pointer hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10"
            : "cursor-default"
        }`}
        disabled={!puedeEditar}
      >
        {formatTime(prog.hora_inicio_programada)} &ndash;{" "}
        {formatTime(prog.hora_fin_programada)}
        {prog.turno_nombre ? (
          <span className="mt-0.5 block text-[10px] font-medium text-brand-600 dark:text-brand-400">
            {prog.turno_nombre}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div>
      <PageHeader
        title="Planeación Semanal"
        description="Programación de jornada laboral por operador y día."
        actions={
          puedeCrear ? (
            <Button
              onClick={abrirCrear}
              disabled={
                mutationCrear.status === "submitting" ||
                empleados.length === 0 ||
                turnos.length === 0
              }
            >
              {mutationCrear.status === "submitting" ? "Creando..." : "Crear programación semanal"}
            </Button>
          ) : undefined
        }
      />

      <ComponentCard title="Programación de la semana">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={semanaAnterior}>
            &larr; Anterior
          </Button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formatDate(semana)} &mdash; {formatDate(fechasSemana[6])}
          </span>
          <Button variant="outline" size="sm" onClick={semanaSiguiente}>
            Siguiente &rarr;
          </Button>
        </div>

        {cargando ? (
          <LoadingState />
        ) : operadoresEnProgramacion.length === 0 ? (
          <EmptyState
            title="Sin programación"
            description="No hay programación para esta semana. Crea una programación semanal para comenzar."
            action={
              puedeCrear ? (
                <Button
                  onClick={abrirCrear}
                  disabled={
                    mutationCrear.status === "submitting" ||
                    empleados.length === 0 ||
                    turnos.length === 0
                  }
                >
                  {mutationCrear.status === "submitting" ? "Creando..." : "Crear programación"}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Vista desktop: tabla */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">
                      Operador
                    </th>
                    {DIAS_SEMANA.map((dia, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-center font-medium text-gray-500"
                      >
                        <div>{dia}</div>
                        <div className="text-xs text-gray-400">
                          {formatDate(fechasSemana[i])}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operadoresEnProgramacion.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-3 py-2 font-medium">
                        {nombreEmpleado(emp)}
                      </td>
                      {fechasSemana.map((fecha, i) => {
                        const prog = programacionMap.get(emp.id)?.get(fecha);
                        return (
                          <td
                            key={i}
                            className="px-3 py-2 text-center"
                          >
                            <CeldaProgramacion
                              prog={prog}
                              onClick={prog ? () => abrirEdicion(prog) : undefined}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista móvil: tarjetas por operador */}
            <div className="space-y-4 md:hidden">
              {operadoresEnProgramacion.map((emp) => (
                <div
                  key={emp.id}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <h3 className="mb-2 font-medium text-gray-900 dark:text-white">
                    {nombreEmpleado(emp)}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {DIAS_SEMANA.map((dia, i) => {
                      const prog = programacionMap.get(emp.id)?.get(fechasSemana[i]);
                      return (
                        <div key={i} className="flex justify-between">
                          <span className="text-gray-500">{dia}:</span>
                          <CeldaProgramacion
                            prog={prog}
                            onClick={prog ? () => abrirEdicion(prog) : undefined}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </ComponentCard>

      {/* Modal de creación de programación semanal */}
      <Modal isOpen={crearAbierto} onClose={() => setCrearAbierto(false)} className="max-w-lg p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Crear programación semanal
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          El turno elegido define los horarios de cada operador seleccionado, de lunes a domingo.
        </p>

        {turnos.length === 0 ? (
          <p className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200">
            No hay turnos activos. Crea al menos un turno en el catálogo para poder programar.
          </p>
        ) : (
          <div className="space-y-4">
            <MultiSelect
              label="Operadores"
              options={operadoresOptions}
              defaultSelected={operadoresSel}
              onChange={setOperadoresSel}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Turno de la semana
              </label>
              <Select
                placeholder="Selecciona el turno"
                value={turnoSel}
                onChange={setTurnoSel}
                options={turnoOptions}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Si el turno elegido difiere del turno habitual de un operador, la semana se
              programa igualmente con el turno de esta programación.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setCrearAbierto(false)}
            disabled={mutationCrear.status === "submitting"}
          >
            Cancelar
          </Button>
          <Button
            onClick={onCrearProgramacion}
            disabled={
              mutationCrear.status === "submitting" ||
              turnos.length === 0 ||
              operadoresSel.length === 0 ||
              !turnoSel
            }
          >
            {mutationCrear.status === "submitting" ? "Creando..." : "Crear programación"}
          </Button>
        </div>
      </Modal>

      {/* Modal de edición */}
      <Modal isOpen={!!edicionTarget} onClose={cerrarEdicion} className="max-w-md p-6">
        <h3 className="mb-4 text-lg font-semibold">
          Editar programación
        </h3>
        {edicionTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <p className="font-medium">{edicionTarget.operador_nombre}</p>
              <p className="text-gray-500">{formatDate(edicionTarget.fecha)}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Hora inicio</label>
              <input
                type="time"
                value={horaInicioEdit}
                onChange={(e) => setHoraInicioEdit(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Hora fin</label>
              <input
                type="time"
                value={horaFinEdit}
                onChange={(e) => setHoraFinEdit(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cerrarEdicion}>
                Cancelar
              </Button>
              <Button
                onClick={onEditarProgramacion}
                disabled={
                  mutationEditar.status === "submitting" ||
                  !horaInicioEdit ||
                  !horaFinEdit
                }
              >
                {mutationEditar.status === "submitting" ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
