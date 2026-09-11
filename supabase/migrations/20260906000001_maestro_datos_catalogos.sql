-- =============================================================================
-- MAESTRO DE DATOS (módulo catalogos)
-- Plan aprobado:
--   * Tablas dedicadas por catálogo (no EAV). Módulo feature `catalogos`,
--     prefijo de permisos `catalogos.<recurso>.<accion>`.
--   * Catálogos de talento humano tenant-scoped: cargos, areas, tipos_contrato,
--     turnos (se REUTILIZA centros_servicio como "centro", no se crea
--     centros_trabajo).
--   * Catálogos técnicos de activos:
--       - activos_subtipos: editable (los subtipos crecen sin código).
--         Se quita el CHECK de activos.subtipo y el trigger valida contra el
--         catálogo.
--       - activo_estados / activo_estados_operativos / activo_origenes:
--         solo lectura (seed). Alimentan las listas de la UI.
--   * Fix RLS latente: proveedores_select_auth usaba has_permission('activos.*')
--     que jamás coincide con códigos específicos; se abre con códigos exactos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Catálogos técnicos de activos
-- ---------------------------------------------------------------------------
create table public.activos_subtipos (
  id         uuid primary key default gen_random_uuid(),
  categoria  text not null check (categoria in ('vehiculo', 'maquina', 'equipo')),
  codigo     text not null,
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint activos_subtipos_categoria_codigo_unico unique (categoria, codigo)
);

alter table public.activos_subtipos enable row level security;

create policy activos_subtipos_select_auth on public.activos_subtipos
  for select to authenticated
  using (true);

create policy activos_subtipos_insert_auth on public.activos_subtipos
  for insert to authenticated
  with check (public.has_permission('catalogos.subtipos_activos.crear'::text));

create policy activos_subtipos_update_auth on public.activos_subtipos
  for update to authenticated
  using (public.has_permission('catalogos.subtipos_activos.editar'::text))
  with check (public.has_permission('catalogos.subtipos_activos.editar'::text));

create policy activos_subtipos_delete_auth on public.activos_subtipos
  for delete to authenticated
  using (public.has_permission('catalogos.subtipos_activos.eliminar'::text));

-- Tablas de solo lectura (estados / estados operativos / orígenes).
create table public.activo_estados (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  nombre     text not null,
  orden      int  not null default 0,
  created_at timestamp with time zone not null default now()
);

create table public.activo_estados_operativos (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  nombre     text not null,
  orden      int  not null default 0,
  created_at timestamp with time zone not null default now()
);

create table public.activo_origenes (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  nombre     text not null,
  orden      int  not null default 0,
  created_at timestamp with time zone not null default now()
);

alter table public.activo_estados enable row level security;
alter table public.activo_estados_operativos enable row level security;
alter table public.activo_origenes enable row level security;

create policy activo_estados_select_auth on public.activo_estados
  for select to authenticated using (true);
create policy activo_estados_operativos_select_auth on public.activo_estados_operativos
  for select to authenticated using (true);
create policy activo_origenes_select_auth on public.activo_origenes
  for select to authenticated using (true);

-- Seed de catálogos técnicos.
insert into public.activos_subtipos (categoria, codigo, nombre, orden, activo) values
  ('vehiculo', 'MOTOCICLETA',     'Motocicleta',     10, true),
  ('vehiculo', 'AUTOMOVIL',       'Automóvil',       20, true),
  ('maquina',  'MONTACARGAS',     'Montacargas',     10, true),
  ('maquina',  'CARGADOR_FRONTAL', 'Cargador frontal', 20, true),
  ('maquina',  'RETROEXCAVADORA', 'Retroexcavadora', 30, true),
  ('equipo',   'YALE_MANUAL',     'Yale manual',     10, true)
on conflict (categoria, codigo) do nothing;

insert into public.activo_estados (codigo, nombre, orden) values
  ('activo', 'Activo', 10),
  ('inactivo', 'Inactivo', 20),
  ('retirado', 'Retirado', 30)
on conflict (codigo) do nothing;

insert into public.activo_estados_operativos (codigo, nombre, orden) values
  ('OPERATIVA', 'Operativa', 10),
  ('EN_MANTENIMIENTO', 'En mantenimiento', 20),
  ('FUERA_DE_SERVICIO', 'Fuera de servicio', 30),
  ('ALQUILADA', 'Alquilada', 40)
on conflict (codigo) do nothing;

insert into public.activo_origenes (codigo, nombre, orden) values
  ('PROPIA', 'Propia', 10),
  ('SUBARRENDADA', 'Subarrendada', 20)
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- 2) activos: el subtipo pasa a venir del catálogo
-- ---------------------------------------------------------------------------
alter table public.activos drop constraint if exists activos_subtipo_check;

create or replace function public.activos_verificar_subtipo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subtipo is not null and not exists (
    select 1 from activos_subtipos s
    where s.categoria = new.tipo
      and s.codigo = new.subtipo
  ) then
    raise exception 'El subtipo no corresponde a la categoría del activo';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_activos_verificar_subtipo on public.activos;

create trigger trg_activos_verificar_subtipo
  before insert or update on public.activos
  for each row execute function public.activos_verificar_subtipo();

revoke execute on function public.activos_verificar_subtipo() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Fix RLS latente en proveedores_subarriendo
--    La policy anterior usaba has_permission('activos.*'), que solo coincide
--    si el usuario tiene un código literal 'activos.*' (no es el caso de los
--    seeds). Se abre con códigos exactos.
-- ---------------------------------------------------------------------------
drop policy if exists proveedores_select_auth on public.proveedores_subarriendo;

create policy proveedores_select_auth on public.proveedores_subarriendo
  for select to authenticated
  using (
    public.has_permission('activos.activos.ver'::text)
    or public.has_permission('catalogos.proveedores.ver'::text)
  );

-- ---------------------------------------------------------------------------
-- 4) Catálogos de talento humano (tenant-scoped)
-- ---------------------------------------------------------------------------
create table public.cargos (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint cargos_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.cargos enable row level security;
create policy cargos_select_tenant on public.cargos for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy cargos_insert_admin on public.cargos for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.cargos.crear'::text));
create policy cargos_update_admin on public.cargos for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.cargos.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.cargos.editar'::text));
create policy cargos_delete_admin on public.cargos for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.cargos.eliminar'::text));

create table public.areas (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint areas_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.areas enable row level security;
create policy areas_select_tenant on public.areas for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy areas_insert_admin on public.areas for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.areas.crear'::text));
create policy areas_update_admin on public.areas for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.areas.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.areas.editar'::text));
create policy areas_delete_admin on public.areas for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.areas.eliminar'::text));

create table public.tipos_contrato (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint tipos_contrato_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.tipos_contrato enable row level security;
create policy tipos_contrato_select_tenant on public.tipos_contrato for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy tipos_contrato_insert_admin on public.tipos_contrato for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_contrato.crear'::text));
create policy tipos_contrato_update_admin on public.tipos_contrato for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_contrato.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_contrato.editar'::text));
create policy tipos_contrato_delete_admin on public.tipos_contrato for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_contrato.eliminar'::text));

create table public.turnos (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint turnos_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.turnos enable row level security;
create policy turnos_select_tenant on public.turnos for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy turnos_insert_admin on public.turnos for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.turnos.crear'::text));
create policy turnos_update_admin on public.turnos for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.turnos.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.turnos.editar'::text));
create policy turnos_delete_admin on public.turnos for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.turnos.eliminar'::text));

-- ---------------------------------------------------------------------------
-- 5) Permisos del módulo catalogos
-- ---------------------------------------------------------------------------
insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado) values
  ('c1a2c3d4-0000-4000-8000-000000000000', 'Ver cargos',           'catalogos.cargos.ver',            'Ver el catálogo de cargos',          'catalogos', 'cargos',          'ver',      'activo'),
  ('c1a2c3d4-0000-4000-8000-000000000001', 'Crear cargos',         'catalogos.cargos.crear',          'Crear cargos en el catálogo',        'catalogos', 'cargos',          'crear',    'activo'),
  ('c1a2c3d4-0000-4000-8000-000000000002', 'Editar cargos',        'catalogos.cargos.editar',         'Editar cargos del catálogo',         'catalogos', 'cargos',          'editar',   'activo'),
  ('c1a2c3d4-0000-4000-8000-000000000003', 'Eliminar cargos',      'catalogos.cargos.eliminar',       'Desactivar cargos del catálogo',     'catalogos', 'cargos',          'eliminar', 'activo'),
  ('c1a2c3d4-0001-4000-8000-000000000000', 'Ver áreas',            'catalogos.areas.ver',             'Ver el catálogo de áreas',           'catalogos', 'areas',           'ver',      'activo'),
  ('c1a2c3d4-0001-4000-8000-000000000001', 'Crear áreas',          'catalogos.areas.crear',           'Crear áreas en el catálogo',         'catalogos', 'areas',           'crear',    'activo'),
  ('c1a2c3d4-0001-4000-8000-000000000002', 'Editar áreas',         'catalogos.areas.editar',          'Editar áreas del catálogo',          'catalogos', 'areas',           'editar',   'activo'),
  ('c1a2c3d4-0001-4000-8000-000000000003', 'Eliminar áreas',       'catalogos.areas.eliminar',        'Desactivar áreas del catálogo',      'catalogos', 'areas',           'eliminar', 'activo'),
  ('c1a2c3d4-0002-4000-8000-000000000000', 'Ver tipos de contrato', 'catalogos.tipos_contrato.ver',   'Ver el catálogo de tipos de contrato', 'catalogos', 'tipos_contrato', 'ver',    'activo'),
  ('c1a2c3d4-0002-4000-8000-000000000001', 'Crear tipos de contrato', 'catalogos.tipos_contrato.crear', 'Crear tipos de contrato',             'catalogos', 'tipos_contrato', 'crear', 'activo'),
  ('c1a2c3d4-0002-4000-8000-000000000002', 'Editar tipos de contrato', 'catalogos.tipos_contrato.editar', 'Editar tipos de contrato',           'catalogos', 'tipos_contrato', 'editar', 'activo'),
  ('c1a2c3d4-0002-4000-8000-000000000003', 'Eliminar tipos de contrato', 'catalogos.tipos_contrato.eliminar', 'Desactivar tipos de contrato',     'catalogos', 'tipos_contrato', 'eliminar', 'activo'),
  ('c1a2c3d4-0003-4000-8000-000000000000', 'Ver turnos',           'catalogos.turnos.ver',            'Ver el catálogo de turnos',          'catalogos', 'turnos',          'ver',      'activo'),
  ('c1a2c3d4-0003-4000-8000-000000000001', 'Crear turnos',         'catalogos.turnos.crear',          'Crear turnos en el catálogo',        'catalogos', 'turnos',          'crear',    'activo'),
  ('c1a2c3d4-0003-4000-8000-000000000002', 'Editar turnos',        'catalogos.turnos.editar',         'Editar turnos del catálogo',         'catalogos', 'turnos',          'editar',   'activo'),
  ('c1a2c3d4-0003-4000-8000-000000000003', 'Eliminar turnos',      'catalogos.turnos.eliminar',       'Desactivar turnos del catálogo',     'catalogos', 'turnos',          'eliminar', 'activo'),
  ('c1a2c3d4-0004-4000-8000-000000000000', 'Ver subtipos de activos', 'catalogos.subtipos_activos.ver',   'Ver el catálogo de tipos de equipo',  'catalogos', 'subtipos_activos', 'ver',   'activo'),
  ('c1a2c3d4-0004-4000-8000-000000000001', 'Crear subtipos de activos', 'catalogos.subtipos_activos.crear', 'Registrar un tipo de equipo nuevo',   'catalogos', 'subtipos_activos', 'crear','activo'),
  ('c1a2c3d4-0004-4000-8000-000000000002', 'Editar subtipos de activos', 'catalogos.subtipos_activos.editar', 'Editar un tipo de equipo',           'catalogos', 'subtipos_activos', 'editar','activo'),
  ('c1a2c3d4-0004-4000-8000-000000000003', 'Eliminar subtipos de activos', 'catalogos.subtipos_activos.eliminar', 'Desactivar un tipo de equipo',      'catalogos', 'subtipos_activos', 'eliminar','activo'),
  ('c1a2c3d4-0005-4000-8000-000000000000', 'Ver centros de trabajo', 'catalogos.centros_servicio.ver', 'Ver el catálogo de centros de trabajo', 'catalogos', 'centros_servicio', 'ver','activo'),
  ('c1a2c3d4-0005-4000-8000-000000000001', 'Crear centros de trabajo', 'catalogos.centros_servicio.crear', 'Registrar un centro de trabajo',    'catalogos', 'centros_servicio', 'crear','activo'),
  ('c1a2c3d4-0005-4000-8000-000000000002', 'Editar centros de trabajo', 'catalogos.centros_servicio.editar', 'Editar un centro de trabajo',       'catalogos', 'centros_servicio', 'editar','activo'),
  ('c1a2c3d4-0005-4000-8000-000000000003', 'Eliminar centros de trabajo', 'catalogos.centros_servicio.eliminar', 'Desactivar un centro de trabajo',   'catalogos', 'centros_servicio', 'eliminar','activo'),
  ('c1a2c3d4-0006-4000-8000-000000000000', 'Ver proveedores',      'catalogos.proveedores.ver',       'Ver el catálogo de proveedores',     'catalogos', 'proveedores',     'ver',      'activo'),
  ('c1a2c3d4-0006-4000-8000-000000000001', 'Crear proveedores',    'catalogos.proveedores.crear',     'Registrar un proveedor',             'catalogos', 'proveedores',     'crear',    'activo'),
  ('c1a2c3d4-0006-4000-8000-000000000002', 'Editar proveedores',   'catalogos.proveedores.editar',    'Editar un proveedor',                'catalogos', 'proveedores',     'editar',   'activo'),
  ('c1a2c3d4-0006-4000-8000-000000000003', 'Eliminar proveedores', 'catalogos.proveedores.eliminar',  'Desactivar un proveedor',            'catalogos', 'proveedores',     'eliminar', 'activo')
on conflict (codigo) do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_ADMIN'
  and p.codigo in (
    'catalogos.cargos.ver', 'catalogos.cargos.crear', 'catalogos.cargos.editar', 'catalogos.cargos.eliminar',
    'catalogos.areas.ver', 'catalogos.areas.crear', 'catalogos.areas.editar', 'catalogos.areas.eliminar',
    'catalogos.tipos_contrato.ver', 'catalogos.tipos_contrato.crear', 'catalogos.tipos_contrato.editar', 'catalogos.tipos_contrato.eliminar',
    'catalogos.turnos.ver', 'catalogos.turnos.crear', 'catalogos.turnos.editar', 'catalogos.turnos.eliminar',
    'catalogos.subtipos_activos.ver', 'catalogos.subtipos_activos.crear', 'catalogos.subtipos_activos.editar', 'catalogos.subtipos_activos.eliminar',
    'catalogos.centros_servicio.ver', 'catalogos.centros_servicio.crear', 'catalogos.centros_servicio.editar', 'catalogos.centros_servicio.eliminar',
    'catalogos.proveedores.ver', 'catalogos.proveedores.crear', 'catalogos.proveedores.editar', 'catalogos.proveedores.eliminar'
  )
on conflict do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_SUPER_ADMIN'
  and p.codigo in (
    'catalogos.cargos.ver', 'catalogos.cargos.crear', 'catalogos.cargos.editar', 'catalogos.cargos.eliminar',
    'catalogos.areas.ver', 'catalogos.areas.crear', 'catalogos.areas.editar', 'catalogos.areas.eliminar',
    'catalogos.tipos_contrato.ver', 'catalogos.tipos_contrato.crear', 'catalogos.tipos_contrato.editar', 'catalogos.tipos_contrato.eliminar',
    'catalogos.turnos.ver', 'catalogos.turnos.crear', 'catalogos.turnos.editar', 'catalogos.turnos.eliminar',
    'catalogos.subtipos_activos.ver', 'catalogos.subtipos_activos.crear', 'catalogos.subtipos_activos.editar', 'catalogos.subtipos_activos.eliminar',
    'catalogos.centros_servicio.ver', 'catalogos.centros_servicio.crear', 'catalogos.centros_servicio.editar', 'catalogos.centros_servicio.eliminar',
    'catalogos.proveedores.ver', 'catalogos.proveedores.crear', 'catalogos.proveedores.editar', 'catalogos.proveedores.eliminar'
  )
on conflict do nothing;