-- MAESTRO DE DATOS - actividades:
--   1. Nuevo catálogo "grupos_actividad": agrupador interno de la empresa
--      (ej. "Manipulación de carga"). Tenant-scoped, mismo patrón que
--      tipos_actividad.
--   2. tipos_actividad gana codigo_ciiu (4 dígitos, del RUT) y la FK al grupo
--      opcional. Ambas columnas nullable en BD para no romper filas históricas;
--      el formulario nuevo las exige (grupo obligatorio, CIIU obligatorio).
create table public.grupos_actividad (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint grupos_actividad_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.grupos_actividad enable row level security;
create policy grupos_actividad_select_tenant on public.grupos_actividad for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy grupos_actividad_insert_admin on public.grupos_actividad for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.grupos_actividad.crear'::text));
create policy grupos_actividad_update_admin on public.grupos_actividad for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.grupos_actividad.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.grupos_actividad.editar'::text));
create policy grupos_actividad_delete_admin on public.grupos_actividad for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.grupos_actividad.eliminar'::text));

comment on table public.grupos_actividad is
  'Agrupador interno de la empresa para clasificar las actividades (ej. Manipulación de carga).';

alter table public.tipos_actividad
  add column codigo_ciiu text,
  add column grupo_actividad_id uuid references public.grupos_actividad(id) on delete restrict;

comment on column public.tipos_actividad.codigo_ciiu is
  'Código CIIU (4 dígitos) de la actividad según el RUT. Único por tenant cuando está definido.';
comment on column public.tipos_actividad.grupo_actividad_id is
  'Agrupador interno de la empresa al que pertenece la actividad.';

create unique index uq_tipos_actividad_tenant_ciiu
  on public.tipos_actividad (tenant_id, codigo_ciiu)
  where codigo_ciiu is not null;

create index idx_tipos_actividad_grupo
  on public.tipos_actividad (grupo_actividad_id);

-- -----------------------------------------------------------------------------
-- Permisos del recurso catalogos.grupos_actividad.*
-- -----------------------------------------------------------------------------
insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado) values
  ('c1a2c3d4-0017-4000-8000-000000000000', 'Ver grupos de actividad',    'catalogos.grupos_actividad.ver',       'Ver el catálogo de grupos de actividad',       'catalogos', 'grupos_actividad', 'ver',      'activo'),
  ('c1a2c3d4-0017-4000-8000-000000000001', 'Crear grupos de actividad',  'catalogos.grupos_actividad.crear',     'Registrar un grupo de actividad',               'catalogos', 'grupos_actividad', 'crear',    'activo'),
  ('c1a2c3d4-0017-4000-8000-000000000002', 'Editar grupos de actividad', 'catalogos.grupos_actividad.editar',    'Editar un grupo de actividad',                  'catalogos', 'grupos_actividad', 'editar',   'activo'),
  ('c1a2c3d4-0017-4000-8000-000000000003', 'Eliminar grupos de actividad', 'catalogos.grupos_actividad.eliminar', 'Desactivar un grupo de actividad',            'catalogos', 'grupos_actividad', 'eliminar', 'activo')
on conflict (codigo) do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_ADMIN'
  and p.codigo in (
    'catalogos.grupos_actividad.ver', 'catalogos.grupos_actividad.crear',
    'catalogos.grupos_actividad.editar', 'catalogos.grupos_actividad.eliminar'
  )
on conflict do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_SUPER_ADMIN'
  and p.codigo in (
    'catalogos.grupos_actividad.ver', 'catalogos.grupos_actividad.crear',
    'catalogos.grupos_actividad.editar', 'catalogos.grupos_actividad.eliminar'
  )
on conflict do nothing;