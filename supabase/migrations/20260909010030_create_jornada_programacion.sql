-- Programación semanal de jornada laboral.
-- Cada fila = un operador programado para un día específico con hora inicio/fin.
-- Constraint: no duplicar programación para el mismo operador y fecha.

create table public.jornada_programacion (
  id                      uuid primary key default gen_random_uuid(),
  operador_id             uuid not null references public.empleados(id) on delete restrict,
  fecha                   date not null,
  hora_inicio_programada  time not null,
  hora_fin_programada     time not null,
  turno_id                uuid references public.turnos(id) on delete set null,
  centro_servicio_id      uuid references public.centros_servicio(id) on delete set null,
  creado_por              uuid references public.profiles(id) on delete set null,
  created_at              timestamp with time zone not null default now(),
  updated_at              timestamp with time zone not null default now(),

  constraint jornada_prog_operador_fecha_unico unique (operador_id, fecha),
  constraint jornada_prog_horas_validas check (hora_inicio_programada < hora_fin_programada)
);

create index idx_jornada_prog_fecha on public.jornada_programacion (fecha);
create index idx_jornada_prog_operador on public.jornada_programacion (operador_id);

alter table public.jornada_programacion enable row level security;

create policy "jornada_prog_select"
  on public.jornada_programacion for select to authenticated
  using (public.has_permission('jornada.planeacion.ver'::text));

create policy "jornada_prog_insert"
  on public.jornada_programacion for insert to authenticated
  with check (public.has_permission('jornada.planeacion.crear'::text));

create policy "jornada_prog_update"
  on public.jornada_programacion for update to authenticated
  using (public.has_permission('jornada.planeacion.editar'::text))
  with check (public.has_permission('jornada.planeacion.editar'::text));

create policy "jornada_prog_delete"
  on public.jornada_programacion for delete to authenticated
  using (public.has_permission('jornada.planeacion.editar'::text));

create trigger jornada_programacion_updated_at
  before update on public.jornada_programacion
  for each row execute function public.set_updated_at();
