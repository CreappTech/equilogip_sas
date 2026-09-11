-- ============================================================================
-- Empleados — campos de RRHH (Fase 5, extensión):
--   * 4 catálogos tenant-scoped nuevos: eps, arl, fondos_pension, bancos
--     (mismo patrón que maestro_datos_catalogos: RLS tenant + permisos
--     catalogos.<recurso>.<accion>, administrables desde /catalogos).
--   * Columnas nuevas en `empleados` (todas opcionales): afiliaciones de
--     seguridad social (FK), dotación (tallas cerradas vía CHECK),
--     información financiera (banco FK + número de cuenta), contacto de
--     emergencia e hijos (cantidad + edades) para temas de bienestar.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) EPS
-- ---------------------------------------------------------------------------
create table public.eps (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eps_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.eps enable row level security;

create policy eps_select_tenant on public.eps
  for select to authenticated using (tenant_id = public.auth_tenant_id());
create policy eps_insert_admin on public.eps
  for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.eps.crear'::text));
create policy eps_update_admin on public.eps
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.eps.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.eps.editar'::text));
create policy eps_delete_admin on public.eps
  for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.eps.eliminar'::text));

-- ---------------------------------------------------------------------------
-- 2) ARL
-- ---------------------------------------------------------------------------
create table public.arl (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arl_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.arl enable row level security;

create policy arl_select_tenant on public.arl
  for select to authenticated using (tenant_id = public.auth_tenant_id());
create policy arl_insert_admin on public.arl
  for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.arl.crear'::text));
create policy arl_update_admin on public.arl
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.arl.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.arl.editar'::text));
create policy arl_delete_admin on public.arl
  for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.arl.eliminar'::text));

-- ---------------------------------------------------------------------------
-- 3) Fondos de pensión
-- ---------------------------------------------------------------------------
create table public.fondos_pension (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fondos_pension_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.fondos_pension enable row level security;

create policy fondos_pension_select_tenant on public.fondos_pension
  for select to authenticated using (tenant_id = public.auth_tenant_id());
create policy fondos_pension_insert_admin on public.fondos_pension
  for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.fondos_pension.crear'::text));
create policy fondos_pension_update_admin on public.fondos_pension
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.fondos_pension.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.fondos_pension.editar'::text));
create policy fondos_pension_delete_admin on public.fondos_pension
  for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.fondos_pension.eliminar'::text));

-- ---------------------------------------------------------------------------
-- 4) Bancos
-- ---------------------------------------------------------------------------
create table public.bancos (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bancos_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.bancos enable row level security;

create policy bancos_select_tenant on public.bancos
  for select to authenticated using (tenant_id = public.auth_tenant_id());
create policy bancos_insert_admin on public.bancos
  for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.bancos.crear'::text));
create policy bancos_update_admin on public.bancos
  for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.bancos.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.bancos.editar'::text));
create policy bancos_delete_admin on public.bancos
  for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.bancos.eliminar'::text));

-- ---------------------------------------------------------------------------
-- 5) Columnas nuevas en `empleados` (todas opcionales)
-- ---------------------------------------------------------------------------
alter table public.empleados
  add column eps_id               uuid references public.eps(id) on delete set null,
  add column arl_id               uuid references public.arl(id) on delete set null,
  add column fondo_pension_id     uuid references public.fondos_pension(id) on delete set null,
  add column talla_camisa         text check (talla_camisa in ('S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
  add column talla_pantalon       text check (talla_pantalon in ('28', '30', '32', '34', '36', '38', '40', '42')),
  add column talla_zapato         text check (talla_zapato in ('38', '39', '40', '41', '42', '43', '44', '45')),
  add column banco_id             uuid references public.bancos(id) on delete set null,
  add column numero_cuenta        text,
  add column contacto_emergencia_nombres  text,
  add column contacto_emergencia_apellidos text,
  add column contacto_emergencia_telefono text,
  add column cantidad_hijos       int check (cantidad_hijos >= 0),
  add column edades_hijos         int[];

create index idx_empleados_eps_id            on public.empleados (eps_id);
create index idx_empleados_arl_id            on public.empleados (arl_id);
create index idx_empleados_fondo_pension_id  on public.empleados (fondo_pension_id);
create index idx_empleados_banco_id          on public.empleados (banco_id);

-- ---------------------------------------------------------------------------
-- 6) Permisos del módulo catalogos (recursos nuevos)
-- ---------------------------------------------------------------------------
insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado) values
  ('c1a2c3d4-0013-4000-8000-000000000000', 'Ver EPS',                  'catalogos.eps.ver',           'Ver el catálogo de EPS',                    'catalogos', 'eps',           'ver',      'activo'),
  ('c1a2c3d4-0013-4000-8000-000000000001', 'Crear EPS',                'catalogos.eps.crear',         'Registrar una EPS',                         'catalogos', 'eps',           'crear',    'activo'),
  ('c1a2c3d4-0013-4000-8000-000000000002', 'Editar EPS',               'catalogos.eps.editar',        'Editar una EPS',                            'catalogos', 'eps',           'editar',   'activo'),
  ('c1a2c3d4-0013-4000-8000-000000000003', 'Eliminar EPS',             'catalogos.eps.eliminar',      'Desactivar una EPS',                        'catalogos', 'eps',           'eliminar', 'activo'),
  ('c1a2c3d4-0014-4000-8000-000000000000', 'Ver ARL',                  'catalogos.arl.ver',           'Ver el catálogo de ARL',                     'catalogos', 'arl',           'ver',      'activo'),
  ('c1a2c3d4-0014-4000-8000-000000000001', 'Crear ARL',                'catalogos.arl.crear',         'Registrar una ARL',                          'catalogos', 'arl',           'crear',    'activo'),
  ('c1a2c3d4-0014-4000-8000-000000000002', 'Editar ARL',               'catalogos.arl.editar',        'Editar una ARL',                             'catalogos', 'arl',           'editar',   'activo'),
  ('c1a2c3d4-0014-4000-8000-000000000003', 'Eliminar ARL',             'catalogos.arl.eliminar',      'Desactivar una ARL',                         'catalogos', 'arl',           'eliminar', 'activo'),
  ('c1a2c3d4-0015-4000-8000-000000000000', 'Ver fondos de pensión',    'catalogos.fondos_pension.ver',   'Ver el catálogo de fondos de pensión',    'catalogos', 'fondos_pension', 'ver',      'activo'),
  ('c1a2c3d4-0015-4000-8000-000000000001', 'Crear fondos de pensión',  'catalogos.fondos_pension.crear', 'Registrar un fondo de pensión',           'catalogos', 'fondos_pension', 'crear',    'activo'),
  ('c1a2c3d4-0015-4000-8000-000000000002', 'Editar fondos de pensión', 'catalogos.fondos_pension.editar', 'Editar un fondo de pensión',             'catalogos', 'fondos_pension', 'editar',   'activo'),
  ('c1a2c3d4-0015-4000-8000-000000000003', 'Eliminar fondos de pensión', 'catalogos.fondos_pension.eliminar', 'Desactivar un fondo de pensión',       'catalogos', 'fondos_pension', 'eliminar', 'activo'),
  ('c1a2c3d4-0016-4000-8000-000000000000', 'Ver bancos',               'catalogos.bancos.ver',        'Ver el catálogo de bancos',                   'catalogos', 'bancos',        'ver',      'activo'),
  ('c1a2c3d4-0016-4000-8000-000000000001', 'Crear bancos',             'catalogos.bancos.crear',      'Registrar un banco',                          'catalogos', 'bancos',        'crear',    'activo'),
  ('c1a2c3d4-0016-4000-8000-000000000002', 'Editar bancos',            'catalogos.bancos.editar',     'Editar un banco',                             'catalogos', 'bancos',        'editar',   'activo'),
  ('c1a2c3d4-0016-4000-8000-000000000003', 'Eliminar bancos',          'catalogos.bancos.eliminar',   'Desactivar un banco',                         'catalogos', 'bancos',        'eliminar', 'activo')
on conflict (codigo) do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_ADMIN'
  and p.codigo in (
    'catalogos.eps.ver', 'catalogos.eps.crear', 'catalogos.eps.editar', 'catalogos.eps.eliminar',
    'catalogos.arl.ver', 'catalogos.arl.crear', 'catalogos.arl.editar', 'catalogos.arl.eliminar',
    'catalogos.fondos_pension.ver', 'catalogos.fondos_pension.crear', 'catalogos.fondos_pension.editar', 'catalogos.fondos_pension.eliminar',
    'catalogos.bancos.ver', 'catalogos.bancos.crear', 'catalogos.bancos.editar', 'catalogos.bancos.eliminar'
  )
on conflict do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_SUPER_ADMIN'
  and p.codigo in (
    'catalogos.eps.ver', 'catalogos.eps.crear', 'catalogos.eps.editar', 'catalogos.eps.eliminar',
    'catalogos.arl.ver', 'catalogos.arl.crear', 'catalogos.arl.editar', 'catalogos.arl.eliminar',
    'catalogos.fondos_pension.ver', 'catalogos.fondos_pension.crear', 'catalogos.fondos_pension.editar', 'catalogos.fondos_pension.eliminar',
    'catalogos.bancos.ver', 'catalogos.bancos.crear', 'catalogos.bancos.editar', 'catalogos.bancos.eliminar'
  )
on conflict do nothing;