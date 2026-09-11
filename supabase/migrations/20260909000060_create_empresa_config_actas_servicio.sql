-- ============================================================================
-- Módulo de Operaciones (FASE 7 — Actas): empresa_config + actas_servicio.
--   - empresa_config : datos de la empresa para el encabezado del acta
--     imprimible (fila única, id=1).
--   - actas_servicio : histórico persistido de actas generadas con su
--     snapshot JSONB (congela empresa + datos calculados en el momento de la
--     generación; ver spec 7.6).
-- Permisos: lectura con operaciones.actas.ver, escritura de actas con
-- operaciones.actas.generar. La edición de empresa_config la puede hacer quien
-- genera actas (es parte del flujo del acta) y el súper admin (has_permission('*')).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- empresa_config (fila única)
-- ---------------------------------------------------------------------------
create table if not exists public.empresa_config (
  id bigint generated always as identity primary key,
  razon_social text not null default '',
  nit text not null default '',
  direccion text not null default '',
  ciudad text not null default '',
  telefono text not null default '',
  representante text not null default '',
  updated_at timestamptz not null default now(),
  constraint empresa_config_una_fila check (id = 1)
);

alter table public.empresa_config enable row level security;

create policy "empresa_config_select_auth"
  on public.empresa_config
  for select
  to authenticated
  using (true);

create policy "empresa_config_insert_actas"
  on public.empresa_config
  for insert
  to authenticated
  with check (
    public.has_permission('*'::text) or
    public.has_permission('operaciones.actas.generar'::text)
  );

create policy "empresa_config_update_actas"
  on public.empresa_config
  for update
  to authenticated
  using (
    public.has_permission('*'::text) or
    public.has_permission('operaciones.actas.generar'::text)
  )
  with check (
    public.has_permission('*'::text) or
    public.has_permission('operaciones.actas.generar'::text)
  );

-- ---------------------------------------------------------------------------
-- actas_servicio (histórico)
-- ---------------------------------------------------------------------------
create table if not exists public.actas_servicio (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  periodo_inicio date not null,
  periodo_fin date not null,
  cliente_id uuid not null references public.clientes(id),
  equipo_id uuid not null references public.activos(id),
  generado_por uuid references public.profiles(id),
  fecha_generacion timestamptz not null default now(),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint actas_periodo_valido check (periodo_fin >= periodo_inicio)
);

comment on table public.actas_servicio is
  'Histórico de actas de prestación de servicios generadas. El snapshot jsonb congela los datos mostrados en el momento de la generación.';

alter table public.actas_servicio enable row level security;

create policy "actas_select_ver"
  on public.actas_servicio
  for select
  to authenticated
  using (public.has_permission('operaciones.actas.ver'::text));

create policy "actas_insert_generar"
  on public.actas_servicio
  for insert
  to authenticated
  with check (public.has_permission('operaciones.actas.generar'::text));