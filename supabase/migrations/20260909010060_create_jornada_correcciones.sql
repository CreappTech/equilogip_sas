-- Auditoría de correcciones manuales a marcaciones.
-- Cada edición de una marcación deja registro aquí.

create table public.jornada_correcciones (
  id                uuid primary key default gen_random_uuid(),
  marcacion_id      uuid not null references public.jornada_marcaciones(id) on delete restrict,
  campo_corregido   text not null,
  valor_anterior    text,
  valor_nuevo       text,
  motivo            text not null,
  corregido_por     uuid references public.profiles(id) on delete set null,
  fecha_correccion  timestamp with time zone not null default now()
);

create index idx_jornada_corr_marcacion on public.jornada_correcciones (marcacion_id);

alter table public.jornada_correcciones enable row level security;

create policy "jornada_corr_select"
  on public.jornada_correcciones for select to authenticated
  using (public.has_permission('jornada.asistencia.corregir'::text));

create policy "jornada_corr_insert"
  on public.jornada_correcciones for insert to authenticated
  with check (public.has_permission('jornada.asistencia.corregir'::text));
