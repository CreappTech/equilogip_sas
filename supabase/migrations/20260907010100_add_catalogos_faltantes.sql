-- =============================================================================
-- MAESTRO DE DATOS — catálogos del resto de dominios (Fase 5 y siguientes)
-- -----------------------------------------------------------------------------
-- Plan aprobado:
--   * Tablas dedicadas por catálogo (mismo patrón que 20260906000001: no EAV).
--   * Marcas/modelos/unidades_medida/tipos_documento_identidad: catálogos
--     técnicos GLOBALES (sin tenant), como activos_subtipos.
--   * Tipos de mantenimiento, repuesto/servicio, actividad, categorías de
--     ingreso/gasto, clientes, conceptos de liquidación y tipos de hora:
--     catálogos de negocio TENANT-SCOPED, como cargos/areas/turnos.
--   * `modelos` referencia `marcas` (FK) para formalizar la relación
--     marca → modelo de los activos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Catálogos técnicos globales
-- -----------------------------------------------------------------------------
create table public.marcas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.marcas enable row level security;
create policy marcas_select_auth on public.marcas for select to authenticated using (true);
create policy marcas_insert_auth on public.marcas for insert to authenticated
  with check (public.has_permission('catalogos.marcas.crear'::text));
create policy marcas_update_auth on public.marcas for update to authenticated
  using (public.has_permission('catalogos.marcas.editar'::text))
  with check (public.has_permission('catalogos.marcas.editar'::text));
create policy marcas_delete_auth on public.marcas for delete to authenticated
  using (public.has_permission('catalogos.marcas.eliminar'::text));

create table public.modelos (
  id         uuid primary key default gen_random_uuid(),
  marca_id   uuid not null references public.marcas(id) on delete restrict,
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint modelos_marca_nombre_unico unique (marca_id, nombre)
);

alter table public.modelos enable row level security;
create policy modelos_select_auth on public.modelos for select to authenticated using (true);
create policy modelos_insert_auth on public.modelos for insert to authenticated
  with check (public.has_permission('catalogos.modelos.crear'::text));
create policy modelos_update_auth on public.modelos for update to authenticated
  using (public.has_permission('catalogos.modelos.editar'::text))
  with check (public.has_permission('catalogos.modelos.editar'::text));
create policy modelos_delete_auth on public.modelos for delete to authenticated
  using (public.has_permission('catalogos.modelos.eliminar'::text));

create table public.unidades_medida (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.unidades_medida enable row level security;
create policy unidades_medida_select_auth on public.unidades_medida for select to authenticated using (true);
create policy unidades_medida_insert_auth on public.unidades_medida for insert to authenticated
  with check (public.has_permission('catalogos.unidades_medida.crear'::text));
create policy unidades_medida_update_auth on public.unidades_medida for update to authenticated
  using (public.has_permission('catalogos.unidades_medida.editar'::text))
  with check (public.has_permission('catalogos.unidades_medida.editar'::text));
create policy unidades_medida_delete_auth on public.unidades_medida for delete to authenticated
  using (public.has_permission('catalogos.unidades_medida.eliminar'::text));

create table public.tipos_documento_identidad (
  id         uuid primary key default gen_random_uuid(),
  codigo     text not null unique,
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.tipos_documento_identidad enable row level security;
create policy tipos_documento_identidad_select_auth on public.tipos_documento_identidad for select to authenticated using (true);
create policy tipos_documento_identidad_insert_auth on public.tipos_documento_identidad for insert to authenticated
  with check (public.has_permission('catalogos.tipos_documento_identidad.crear'::text));
create policy tipos_documento_identidad_update_auth on public.tipos_documento_identidad for update to authenticated
  using (public.has_permission('catalogos.tipos_documento_identidad.editar'::text))
  with check (public.has_permission('catalogos.tipos_documento_identidad.editar'::text));
create policy tipos_documento_identidad_delete_auth on public.tipos_documento_identidad for delete to authenticated
  using (public.has_permission('catalogos.tipos_documento_identidad.eliminar'::text));

-- -----------------------------------------------------------------------------
-- 2) Catálogos de negocio tenant-scoped
-- -----------------------------------------------------------------------------
create table public.tipos_mantenimiento (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint tipos_mantenimiento_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.tipos_mantenimiento enable row level security;
create policy tipos_mantenimiento_select_tenant on public.tipos_mantenimiento for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy tipos_mantenimiento_insert_admin on public.tipos_mantenimiento for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_mantenimiento.crear'::text));
create policy tipos_mantenimiento_update_admin on public.tipos_mantenimiento for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_mantenimiento.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_mantenimiento.editar'::text));
create policy tipos_mantenimiento_delete_admin on public.tipos_mantenimiento for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_mantenimiento.eliminar'::text));

create table public.tipos_repuesto_servicio (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint tipos_repuesto_servicio_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.tipos_repuesto_servicio enable row level security;
create policy tipos_repuesto_servicio_select_tenant on public.tipos_repuesto_servicio for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy tipos_repuesto_servicio_insert_admin on public.tipos_repuesto_servicio for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_repuesto_servicio.crear'::text));
create policy tipos_repuesto_servicio_update_admin on public.tipos_repuesto_servicio for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_repuesto_servicio.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_repuesto_servicio.editar'::text));
create policy tipos_repuesto_servicio_delete_admin on public.tipos_repuesto_servicio for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_repuesto_servicio.eliminar'::text));

create table public.tipos_actividad (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint tipos_actividad_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.tipos_actividad enable row level security;
create policy tipos_actividad_select_tenant on public.tipos_actividad for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy tipos_actividad_insert_admin on public.tipos_actividad for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_actividad.crear'::text));
create policy tipos_actividad_update_admin on public.tipos_actividad for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_actividad.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_actividad.editar'::text));
create policy tipos_actividad_delete_admin on public.tipos_actividad for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_actividad.eliminar'::text));

create table public.categorias_ingreso (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint categorias_ingreso_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.categorias_ingreso enable row level security;
create policy categorias_ingreso_select_tenant on public.categorias_ingreso for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy categorias_ingreso_insert_admin on public.categorias_ingreso for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.categorias_ingreso.crear'::text));
create policy categorias_ingreso_update_admin on public.categorias_ingreso for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.categorias_ingreso.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.categorias_ingreso.editar'::text));
create policy categorias_ingreso_delete_admin on public.categorias_ingreso for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.categorias_ingreso.eliminar'::text));

create table public.categorias_gasto (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint categorias_gasto_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.categorias_gasto enable row level security;
create policy categorias_gasto_select_tenant on public.categorias_gasto for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy categorias_gasto_insert_admin on public.categorias_gasto for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.categorias_gasto.crear'::text));
create policy categorias_gasto_update_admin on public.categorias_gasto for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.categorias_gasto.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.categorias_gasto.editar'::text));
create policy categorias_gasto_delete_admin on public.categorias_gasto for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.categorias_gasto.eliminar'::text));

create table public.clientes (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  telefono   text,
  email      text,
  direccion  text,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint clientes_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.clientes enable row level security;
create policy clientes_select_tenant on public.clientes for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy clientes_insert_admin on public.clientes for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.clientes.crear'::text));
create policy clientes_update_admin on public.clientes for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.clientes.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.clientes.editar'::text));
create policy clientes_delete_admin on public.clientes for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.clientes.eliminar'::text));

create table public.conceptos_liquidacion (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint conceptos_liquidacion_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.conceptos_liquidacion enable row level security;
create policy conceptos_liquidacion_select_tenant on public.conceptos_liquidacion for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy conceptos_liquidacion_insert_admin on public.conceptos_liquidacion for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.conceptos_liquidacion.crear'::text));
create policy conceptos_liquidacion_update_admin on public.conceptos_liquidacion for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.conceptos_liquidacion.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.conceptos_liquidacion.editar'::text));
create policy conceptos_liquidacion_delete_admin on public.conceptos_liquidacion for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.conceptos_liquidacion.eliminar'::text));

create table public.tipos_hora (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id),
  nombre     text not null,
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint tipos_hora_tenant_nombre_unico unique (tenant_id, nombre)
);

alter table public.tipos_hora enable row level security;
create policy tipos_hora_select_tenant on public.tipos_hora for select to authenticated
  using (tenant_id = public.auth_tenant_id());
create policy tipos_hora_insert_admin on public.tipos_hora for insert to authenticated
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_hora.crear'::text));
create policy tipos_hora_update_admin on public.tipos_hora for update to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_hora.editar'::text))
  with check (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_hora.editar'::text));
create policy tipos_hora_delete_admin on public.tipos_hora for delete to authenticated
  using (tenant_id = public.auth_tenant_id() and public.has_permission('catalogos.tipos_hora.eliminar'::text));

-- -----------------------------------------------------------------------------
-- 3) Permisos del módulo catalogos (nuevos recursos)
-- -----------------------------------------------------------------------------
insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado) values
  ('c1a2c3d4-0007-4000-8000-000000000000', 'Ver marcas',                  'catalogos.marcas.ver',                  'Ver el catálogo de marcas',                     'catalogos', 'marcas',                  'ver',      'activo'),
  ('c1a2c3d4-0007-4000-8000-000000000001', 'Crear marcas',                'catalogos.marcas.crear',                'Registrar una marca en el catálogo',            'catalogos', 'marcas',                  'crear',    'activo'),
  ('c1a2c3d4-0007-4000-8000-000000000002', 'Editar marcas',               'catalogos.marcas.editar',               'Editar una marca del catálogo',                 'catalogos', 'marcas',                  'editar',   'activo'),
  ('c1a2c3d4-0007-4000-8000-000000000003', 'Eliminar marcas',             'catalogos.marcas.eliminar',             'Desactivar una marca del catálogo',             'catalogos', 'marcas',                  'eliminar', 'activo'),
  ('c1a2c3d4-0008-4000-8000-000000000000', 'Ver modelos',                 'catalogos.modelos.ver',                 'Ver el catálogo de modelos',                    'catalogos', 'modelos',                 'ver',      'activo'),
  ('c1a2c3d4-0008-4000-8000-000000000001', 'Crear modelos',               'catalogos.modelos.crear',               'Registrar un modelo en el catálogo',            'catalogos', 'modelos',                 'crear',    'activo'),
  ('c1a2c3d4-0008-4000-8000-000000000002', 'Editar modelos',              'catalogos.modelos.editar',              'Editar un modelo del catálogo',                 'catalogos', 'modelos',                 'editar',   'activo'),
  ('c1a2c3d4-0008-4000-8000-000000000003', 'Eliminar modelos',            'catalogos.modelos.eliminar',            'Desactivar un modelo del catálogo',             'catalogos', 'modelos',                 'eliminar', 'activo'),
  ('c1a2c3d4-0009-4000-8000-000000000000', 'Ver unidades de medida',      'catalogos.unidades_medida.ver',         'Ver el catálogo de unidades de medida',         'catalogos', 'unidades_medida',         'ver',      'activo'),
  ('c1a2c3d4-0009-4000-8000-000000000001', 'Crear unidades de medida',    'catalogos.unidades_medida.crear',       'Registrar una unidad de medida',                'catalogos', 'unidades_medida',         'crear',    'activo'),
  ('c1a2c3d4-0009-4000-8000-000000000002', 'Editar unidades de medida',   'catalogos.unidades_medida.editar',      'Editar una unidad de medida',                   'catalogos', 'unidades_medida',         'editar',   'activo'),
  ('c1a2c3d4-0009-4000-8000-000000000003', 'Eliminar unidades de medida', 'catalogos.unidades_medida.eliminar',    'Desactivar una unidad de medida',               'catalogos', 'unidades_medida',         'eliminar', 'activo'),
  ('c1a2c3d4-000a-4000-8000-000000000000', 'Ver tipos de documento',      'catalogos.tipos_documento_identidad.ver',   'Ver el catálogo de tipos de documento de identidad', 'catalogos', 'tipos_documento_identidad', 'ver', 'activo'),
  ('c1a2c3d4-000a-4000-8000-000000000001', 'Crear tipos de documento',    'catalogos.tipos_documento_identidad.crear', 'Registrar un tipo de documento de identidad',  'catalogos', 'tipos_documento_identidad', 'crear', 'activo'),
  ('c1a2c3d4-000a-4000-8000-000000000002', 'Editar tipos de documento',   'catalogos.tipos_documento_identidad.editar', 'Editar un tipo de documento de identidad',     'catalogos', 'tipos_documento_identidad', 'editar', 'activo'),
  ('c1a2c3d4-000a-4000-8000-000000000003', 'Eliminar tipos de documento', 'catalogos.tipos_documento_identidad.eliminar', 'Desactivar un tipo de documento de identidad','catalogos', 'tipos_documento_identidad', 'eliminar', 'activo'),
  ('c1a2c3d4-000b-4000-8000-000000000000', 'Ver tipos de mantenimiento',  'catalogos.tipos_mantenimiento.ver',      'Ver el catálogo de tipos de mantenimiento',     'catalogos', 'tipos_mantenimiento',     'ver',      'activo'),
  ('c1a2c3d4-000b-4000-8000-000000000001', 'Crear tipos de mantenimiento','catalogos.tipos_mantenimiento.crear',    'Registrar un tipo de mantenimiento',            'catalogos', 'tipos_mantenimiento',     'crear',    'activo'),
  ('c1a2c3d4-000b-4000-8000-000000000002', 'Editar tipos de mantenimiento','catalogos.tipos_mantenimiento.editar',   'Editar un tipo de mantenimiento',               'catalogos', 'tipos_mantenimiento',     'editar',   'activo'),
  ('c1a2c3d4-000b-4000-8000-000000000003', 'Eliminar tipos de mantenimiento', 'catalogos.tipos_mantenimiento.eliminar', 'Desactivar un tipo de mantenimiento',         'catalogos', 'tipos_mantenimiento',     'eliminar', 'activo'),
  ('c1a2c3d4-000c-4000-8000-000000000000', 'Ver tipos de repuesto/servicio', 'catalogos.tipos_repuesto_servicio.ver',  'Ver el catálogo de tipos de repuesto/servicio', 'catalogos', 'tipos_repuesto_servicio', 'ver',     'activo'),
  ('c1a2c3d4-000c-4000-8000-000000000001', 'Crear tipos de repuesto/servicio', 'catalogos.tipos_repuesto_servicio.crear', 'Registrar un tipo de repuesto/servicio',     'catalogos', 'tipos_repuesto_servicio', 'crear',   'activo'),
  ('c1a2c3d4-000c-4000-8000-000000000002', 'Editar tipos de repuesto/servicio', 'catalogos.tipos_repuesto_servicio.editar', 'Editar un tipo de repuesto/servicio',        'catalogos', 'tipos_repuesto_servicio', 'editar',  'activo'),
  ('c1a2c3d4-000c-4000-8000-000000000003', 'Eliminar tipos de repuesto/servicio', 'catalogos.tipos_repuesto_servicio.eliminar', 'Desactivar un tipo de repuesto/servicio', 'catalogos', 'tipos_repuesto_servicio', 'eliminar','activo'),
  ('c1a2c3d4-000d-4000-8000-000000000000', 'Ver tipos de actividad',      'catalogos.tipos_actividad.ver',           'Ver el catálogo de tipos de actividad',         'catalogos', 'tipos_actividad',         'ver',      'activo'),
  ('c1a2c3d4-000d-4000-8000-000000000001', 'Crear tipos de actividad',    'catalogos.tipos_actividad.crear',         'Registrar un tipo de actividad',                'catalogos', 'tipos_actividad',         'crear',    'activo'),
  ('c1a2c3d4-000d-4000-8000-000000000002', 'Editar tipos de actividad',   'catalogos.tipos_actividad.editar',        'Editar un tipo de actividad',                   'catalogos', 'tipos_actividad',         'editar',   'activo'),
  ('c1a2c3d4-000d-4000-8000-000000000003', 'Eliminar tipos de actividad', 'catalogos.tipos_actividad.eliminar',      'Desactivar un tipo de actividad',               'catalogos', 'tipos_actividad',         'eliminar', 'activo'),
  ('c1a2c3d4-000e-4000-8000-000000000000', 'Ver categorías de ingreso',   'catalogos.categorias_ingreso.ver',        'Ver el catálogo de categorías de ingreso',      'catalogos', 'categorias_ingreso',      'ver',      'activo'),
  ('c1a2c3d4-000e-4000-8000-000000000001', 'Crear categorías de ingreso', 'catalogos.categorias_ingreso.crear',      'Registrar una categoría de ingreso',            'catalogos', 'categorias_ingreso',      'crear',    'activo'),
  ('c1a2c3d4-000e-4000-8000-000000000002', 'Editar categorías de ingreso','catalogos.categorias_ingreso.editar',     'Editar una categoría de ingreso',               'catalogos', 'categorias_ingreso',      'editar',   'activo'),
  ('c1a2c3d4-000e-4000-8000-000000000003', 'Eliminar categorías de ingreso', 'catalogos.categorias_ingreso.eliminar', 'Desactivar una categoría de ingreso',          'catalogos', 'categorias_ingreso',      'eliminar', 'activo'),
  ('c1a2c3d4-000f-4000-8000-000000000000', 'Ver categorías de gasto',     'catalogos.categorias_gasto.ver',          'Ver el catálogo de categorías de gasto',        'catalogos', 'categorias_gasto',       'ver',      'activo'),
  ('c1a2c3d4-000f-4000-8000-000000000001', 'Crear categorías de gasto',   'catalogos.categorias_gasto.crear',        'Registrar una categoría de gasto',              'catalogos', 'categorias_gasto',       'crear',    'activo'),
  ('c1a2c3d4-000f-4000-8000-000000000002', 'Editar categorías de gasto',  'catalogos.categorias_gasto.editar',       'Editar una categoría de gasto',                 'catalogos', 'categorias_gasto',       'editar',   'activo'),
  ('c1a2c3d4-000f-4000-8000-000000000003', 'Eliminar categorías de gasto','catalogos.categorias_gasto.eliminar',     'Desactivar una categoría de gasto',             'catalogos', 'categorias_gasto',       'eliminar', 'activo'),
  ('c1a2c3d4-0010-4000-8000-000000000000', 'Ver clientes',                'catalogos.clientes.ver',                  'Ver el catálogo de clientes',                   'catalogos', 'clientes',              'ver',      'activo'),
  ('c1a2c3d4-0010-4000-8000-000000000001', 'Crear clientes',              'catalogos.clientes.crear',                'Registrar un cliente',                          'catalogos', 'clientes',              'crear',    'activo'),
  ('c1a2c3d4-0010-4000-8000-000000000002', 'Editar clientes',             'catalogos.clientes.editar',               'Editar un cliente',                             'catalogos', 'clientes',              'editar',   'activo'),
  ('c1a2c3d4-0010-4000-8000-000000000003', 'Eliminar clientes',           'catalogos.clientes.eliminar',             'Desactivar un cliente',                         'catalogos', 'clientes',              'eliminar', 'activo'),
  ('c1a2c3d4-0011-4000-8000-000000000000', 'Ver conceptos de liquidación','catalogos.conceptos_liquidacion.ver',     'Ver el catálogo de conceptos de liquidación',   'catalogos', 'conceptos_liquidacion','ver',      'activo'),
  ('c1a2c3d4-0011-4000-8000-000000000001', 'Crear conceptos de liquidación', 'catalogos.conceptos_liquidacion.crear', 'Registrar un concepto de liquidación',          'catalogos', 'conceptos_liquidacion','crear',    'activo'),
  ('c1a2c3d4-0011-4000-8000-000000000002', 'Editar conceptos de liquidación', 'catalogos.conceptos_liquidacion.editar', 'Editar un concepto de liquidación',           'catalogos', 'conceptos_liquidacion','editar',   'activo'),
  ('c1a2c3d4-0011-4000-8000-000000000003', 'Eliminar conceptos de liquidación', 'catalogos.conceptos_liquidacion.eliminar', 'Desactivar un concepto de liquidación',    'catalogos', 'conceptos_liquidacion','eliminar', 'activo'),
  ('c1a2c3d4-0012-4000-8000-000000000000', 'Ver tipos de hora',           'catalogos.tipos_hora.ver',                'Ver el catálogo de tipos de hora',              'catalogos', 'tipos_hora',            'ver',      'activo'),
  ('c1a2c3d4-0012-4000-8000-000000000001', 'Crear tipos de hora',         'catalogos.tipos_hora.crear',              'Registrar un tipo de hora',                     'catalogos', 'tipos_hora',            'crear',    'activo'),
  ('c1a2c3d4-0012-4000-8000-000000000002', 'Editar tipos de hora',        'catalogos.tipos_hora.editar',             'Editar un tipo de hora',                        'catalogos', 'tipos_hora',            'editar',   'activo'),
  ('c1a2c3d4-0012-4000-8000-000000000003', 'Eliminar tipos de hora',      'catalogos.tipos_hora.eliminar',           'Desactivar un tipo de hora',                    'catalogos', 'tipos_hora',            'eliminar', 'activo')
on conflict (codigo) do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_ADMIN'
  and p.codigo in (
    'catalogos.marcas.ver', 'catalogos.marcas.crear', 'catalogos.marcas.editar', 'catalogos.marcas.eliminar',
    'catalogos.modelos.ver', 'catalogos.modelos.crear', 'catalogos.modelos.editar', 'catalogos.modelos.eliminar',
    'catalogos.unidades_medida.ver', 'catalogos.unidades_medida.crear', 'catalogos.unidades_medida.editar', 'catalogos.unidades_medida.eliminar',
    'catalogos.tipos_documento_identidad.ver', 'catalogos.tipos_documento_identidad.crear', 'catalogos.tipos_documento_identidad.editar', 'catalogos.tipos_documento_identidad.eliminar',
    'catalogos.tipos_mantenimiento.ver', 'catalogos.tipos_mantenimiento.crear', 'catalogos.tipos_mantenimiento.editar', 'catalogos.tipos_mantenimiento.eliminar',
    'catalogos.tipos_repuesto_servicio.ver', 'catalogos.tipos_repuesto_servicio.crear', 'catalogos.tipos_repuesto_servicio.editar', 'catalogos.tipos_repuesto_servicio.eliminar',
    'catalogos.tipos_actividad.ver', 'catalogos.tipos_actividad.crear', 'catalogos.tipos_actividad.editar', 'catalogos.tipos_actividad.eliminar',
    'catalogos.categorias_ingreso.ver', 'catalogos.categorias_ingreso.crear', 'catalogos.categorias_ingreso.editar', 'catalogos.categorias_ingreso.eliminar',
    'catalogos.categorias_gasto.ver', 'catalogos.categorias_gasto.crear', 'catalogos.categorias_gasto.editar', 'catalogos.categorias_gasto.eliminar',
    'catalogos.clientes.ver', 'catalogos.clientes.crear', 'catalogos.clientes.editar', 'catalogos.clientes.eliminar',
    'catalogos.conceptos_liquidacion.ver', 'catalogos.conceptos_liquidacion.crear', 'catalogos.conceptos_liquidacion.editar', 'catalogos.conceptos_liquidacion.eliminar',
    'catalogos.tipos_hora.ver', 'catalogos.tipos_hora.crear', 'catalogos.tipos_hora.editar', 'catalogos.tipos_hora.eliminar'
  )
on conflict do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_SUPER_ADMIN'
  and p.codigo in (
    'catalogos.marcas.ver', 'catalogos.marcas.crear', 'catalogos.marcas.editar', 'catalogos.marcas.eliminar',
    'catalogos.modelos.ver', 'catalogos.modelos.crear', 'catalogos.modelos.editar', 'catalogos.modelos.eliminar',
    'catalogos.unidades_medida.ver', 'catalogos.unidades_medida.crear', 'catalogos.unidades_medida.editar', 'catalogos.unidades_medida.eliminar',
    'catalogos.tipos_documento_identidad.ver', 'catalogos.tipos_documento_identidad.crear', 'catalogos.tipos_documento_identidad.editar', 'catalogos.tipos_documento_identidad.eliminar',
    'catalogos.tipos_mantenimiento.ver', 'catalogos.tipos_mantenimiento.crear', 'catalogos.tipos_mantenimiento.editar', 'catalogos.tipos_mantenimiento.eliminar',
    'catalogos.tipos_repuesto_servicio.ver', 'catalogos.tipos_repuesto_servicio.crear', 'catalogos.tipos_repuesto_servicio.editar', 'catalogos.tipos_repuesto_servicio.eliminar',
    'catalogos.tipos_actividad.ver', 'catalogos.tipos_actividad.crear', 'catalogos.tipos_actividad.editar', 'catalogos.tipos_actividad.eliminar',
    'catalogos.categorias_ingreso.ver', 'catalogos.categorias_ingreso.crear', 'catalogos.categorias_ingreso.editar', 'catalogos.categorias_ingreso.eliminar',
    'catalogos.categorias_gasto.ver', 'catalogos.categorias_gasto.crear', 'catalogos.categorias_gasto.editar', 'catalogos.categorias_gasto.eliminar',
    'catalogos.clientes.ver', 'catalogos.clientes.crear', 'catalogos.clientes.editar', 'catalogos.clientes.eliminar',
    'catalogos.conceptos_liquidacion.ver', 'catalogos.conceptos_liquidacion.crear', 'catalogos.conceptos_liquidacion.editar', 'catalogos.conceptos_liquidacion.eliminar',
    'catalogos.tipos_hora.ver', 'catalogos.tipos_hora.crear', 'catalogos.tipos_hora.editar', 'catalogos.tipos_hora.eliminar'
  )
on conflict do nothing;