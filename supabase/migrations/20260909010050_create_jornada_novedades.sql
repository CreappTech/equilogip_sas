-- Novedades de asistencia: incapacidad, permiso, vacaciones, ausencia injustificada.
-- Se registra cuando un operario programado no va a marcar.

create table public.jornada_novedades (
  id              uuid primary key default gen_random_uuid(),
  operador_id     uuid not null references public.empleados(id) on delete restrict,
  fecha           date not null,
  tipo_novedad    text not null
                  check (tipo_novedad in ('incapacidad', 'permiso', 'vacaciones', 'ausencia_injustificada', 'otro')),
  observaciones   text,
  registrado_por  uuid references public.profiles(id) on delete set null,
  created_at      timestamp with time zone not null default now()
);

create index idx_jornada_nov_operador_fecha on public.jornada_novedades (operador_id, fecha);

alter table public.jornada_novedades enable row level security;

create policy "jornada_novedades_select"
  on public.jornada_novedades for select to authenticated
  using (public.has_permission('jornada.asistencia.ver'::text));

create policy "jornada_novedades_insert"
  on public.jornada_novedades for insert to authenticated
  with check (public.has_permission('jornada.asistencia.marcar'::text));

create policy "jornada_novedades_update"
  on public.jornada_novedades for update to authenticated
  using (public.has_permission('jornada.asistencia.corregir'::text))
  with check (public.has_permission('jornada.asistencia.corregir'::text));

create policy "jornada_novedades_delete"
  on public.jornada_novedades for delete to authenticated
  using (public.has_permission('jornada.asistencia.corregir'::text));
