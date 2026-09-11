-- ============================================================================
-- FASE 5: Tabla `empleados` (entidad simple, sin especialización por tipo).
-- Retiro = cambio de estado a 'retirado' (nunca DELETE físico), mismo patrón
-- que activos (FASE 4). Sin tenant_id: la RLS se gobierna por permisos
-- `empleados.empleados.*`, consistente con activos.
-- `cargo` es FK al catálogo tenant-scoped `cargos` (maestro_datos_catalogos).
-- ============================================================================

create table public.empleados (
  id                  uuid primary key default gen_random_uuid(),
  nombres             text not null,
  apellidos           text not null,
  documento_identidad text not null unique,
  fecha_nacimiento    date,
  fecha_ingreso       date not null,
  cargo_id            uuid not null references public.cargos(id) on delete restrict,
  estado              text not null default 'activo'
                      check (estado in ('activo', 'inactivo', 'retirado')),
  telefono            text,
  email_contacto      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.empleados enable row level security;

comment on table public.empleados is
  'Empleados de la compañía. El retiro es un cambio de estado, nunca un DELETE físico.';

create index idx_empleados_estado   on public.empleados (estado);
create index idx_empleados_cargo_id on public.empleados (cargo_id);

create trigger trg_empleados_updated_at
  before update on public.empleados
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (mismo estándar que activos): autorización por permiso, no por ocultar
-- UI. 'retirado' solo puede fijarse con empleados.empleados.eliminar.
-- ---------------------------------------------------------------------------
create policy empleados_select_auth on public.empleados
  for select to authenticated
  using (public.has_permission('empleados.empleados.ver'::text));

create policy empleados_insert_auth on public.empleados
  for insert to authenticated
  with check (public.has_permission('empleados.empleados.crear'::text));

create policy empleados_update_datos on public.empleados
  for update to authenticated
  using (
    public.has_permission('empleados.empleados.editar'::text)
    and estado <> 'retirado'
  )
  with check (
    public.has_permission('empleados.empleados.editar'::text)
    and estado in ('activo', 'inactivo')
  );

create policy empleados_update_retiro on public.empleados
  for update to authenticated
  using (
    public.has_permission('empleados.empleados.eliminar'::text)
    and estado <> 'retirado'
  )
  with check (
    public.has_permission('empleados.empleados.eliminar'::text)
    and estado = 'retirado'
  );