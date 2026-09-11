-- Marcaciones reales de asistencia (llegada y salida).
-- Cada fila se vincula a una programación y captura las horas reales.

create table public.jornada_marcaciones (
  id                      uuid primary key default gen_random_uuid(),
  programacion_id         uuid not null references public.jornada_programacion(id) on delete restrict,
  hora_inicio_real        timestamp with time zone,
  hora_fin_real           timestamp with time zone,
  registrado_por_inicio   uuid references public.profiles(id) on delete set null,
  registrado_por_fin      uuid references public.profiles(id) on delete set null,
  estado                  text not null default 'pendiente'
                          check (estado in ('pendiente', 'en_curso', 'completa')),
  created_at              timestamp with time zone not null default now(),
  updated_at              timestamp with time zone not null default now()
);

create index idx_jornada_marc_prog on public.jornada_marcaciones (programacion_id);
create index idx_jornada_marc_estado on public.jornada_marcaciones (estado);

alter table public.jornada_marcaciones enable row level security;

create policy "jornada_marc_select"
  on public.jornada_marcaciones for select to authenticated
  using (public.has_permission('jornada.asistencia.ver'::text));

create policy "jornada_marc_insert"
  on public.jornada_marcaciones for insert to authenticated
  with check (public.has_permission('jornada.asistencia.marcar'::text));

create policy "jornada_marc_update"
  on public.jornada_marcaciones for update to authenticated
  using (
    public.has_permission('jornada.asistencia.marcar'::text)
    or public.has_permission('jornada.asistencia.corregir'::text)
  )
  with check (
    public.has_permission('jornada.asistencia.marcar'::text)
    or public.has_permission('jornada.asistencia.corregir'::text)
  );

create trigger jornada_marcaciones_updated_at
  before update on public.jornada_marcaciones
  for each row execute function public.set_updated_at();
