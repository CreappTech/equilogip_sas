-- Autorizaciones de horas extra.
-- Requiere autorización previa registrada (buena práctica legal colombiana).

create table public.jornada_autorizaciones_extra (
  id                uuid primary key default gen_random_uuid(),
  marcacion_id      uuid not null references public.jornada_marcaciones(id) on delete restrict,
  autorizado_por    uuid references public.profiles(id) on delete set null,
  motivo            text not null,
  fecha_autorizacion timestamp with time zone not null default now()
);

create index idx_jornada_auth_extra_marcacion on public.jornada_autorizaciones_extra (marcacion_id);

alter table public.jornada_autorizaciones_extra enable row level security;

create policy "jornada_auth_extra_select"
  on public.jornada_autorizaciones_extra for select to authenticated
  using (public.has_permission('jornada.asistencia.ver'::text));

create policy "jornada_auth_extra_insert"
  on public.jornada_autorizaciones_extra for insert to authenticated
  with check (public.has_permission('jornada.asistencia.corregir'::text));
