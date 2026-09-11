-- Datos de desarrollo para Supabase.
-- NO incluir datos reales de producción.
-- Este archivo contiene los permisos y roles del sistema auth.
-- Los permisos/roles se crean via la migracion 2026090400001 (renombre)
-- y la snapshot 20260904000003 (esquema completo), por lo que este seed
-- solo valida que el estado esperado este presente en una instalacion limpia.

-- Solo ejecutar en entornos de desarrollo local.
-- En produccion, los permisos/roles se cargan por migracion.

-- ============================================================================
-- PERMISOS DEL MODULO auth
-- Convencion: 'auth.<recurso>.<accion>'
-- ============================================================================
insert into public.permisos (codigo, nombre, modulo, recurso, accion, descripcion) values
  ('auth.usuarios.ver',      'Ver usuarios',          'auth', 'usuarios', 'ver',      'Permite ver el listado de usuarios'),
  ('auth.usuarios.crear',    'Crear usuarios',        'auth', 'usuarios', 'crear',    'Permite crear nuevos usuarios'),
  ('auth.usuarios.editar',   'Editar usuarios',       'auth', 'usuarios', 'editar',   'Permite editar datos de usuarios'),
  ('auth.usuarios.estado',   'Cambiar estado',        'auth', 'usuarios', 'estado',   'Permite activar/inactivar usuarios'),
  ('auth.usuarios.roles',    'Gestionar roles',       'auth', 'usuarios', 'roles',    'Permite asignar roles a usuarios'),
  ('auth.roles.ver',         'Ver roles',             'auth', 'roles',     'ver',      'Permite ver el listado de roles'),
  ('auth.roles.crear',       'Crear roles',           'auth', 'roles',     'crear',    'Permite crear nuevos roles'),
  ('auth.roles.editar',      'Editar roles',          'auth', 'roles',     'editar',   'Permite editar roles existentes'),
  ('auth.roles.permisos',    'Gestionar permisos',    'auth', 'roles',     'permisos', 'Permite asignar permisos a roles')
on conflict (codigo) do nothing;

-- ============================================================================
-- ROLES DEL SISTEMA auth
-- Convencion: codigo inicia con 'AUTH_' para roles de sistema
-- ============================================================================
insert into public.roles (codigo, nombre, descripcion, es_sistema) values
  ('AUTH_SUPER_ADMIN', 'Super Administrador', 'Acceso total al sistema, bypassa todas las policies', true),
  ('AUTH_ADMIN',       'Administrador',       'Acceso a gestion de usuarios, roles y permisos',        true),
  ('CONSULTA',         'Consulta',            'Acceso de solo lectura al modulo de usuarios',         true)
on conflict (codigo) do nothing;

-- ============================================================================
-- ROL -> PERMISOS
-- ============================================================================
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
cross join lateral (
  values
    -- AUTH_SUPER_ADMIN: todos los permisos del modulo auth
    ('auth.usuarios.ver'), ('auth.usuarios.crear'), ('auth.usuarios.editar'),
    ('auth.usuarios.estado'), ('auth.usuarios.roles'),
    ('auth.roles.ver'), ('auth.roles.crear'), ('auth.roles.editar'), ('auth.roles.permisos')
) as per(codigo)
join public.permisos p on p.codigo = per.codigo
where r.codigo = 'AUTH_SUPER_ADMIN'
on conflict do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
cross join lateral (
  values
    ('auth.usuarios.ver'), ('auth.usuarios.crear'), ('auth.usuarios.editar'),
    ('auth.usuarios.estado'), ('auth.usuarios.roles'),
    ('auth.roles.ver'), ('auth.roles.crear'), ('auth.roles.editar'), ('auth.roles.permisos')
) as per(codigo)
join public.permisos p on p.codigo = per.codigo
where r.codigo = 'AUTH_ADMIN'
on conflict do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
cross join lateral (
  values
    ('auth.usuarios.ver'),
    ('auth.roles.ver')
) as per(codigo)
join public.permisos p on p.codigo = per.codigo
where r.codigo = 'CONSULTA'
on conflict do nothing;

-- ============================================================================
-- FASE 4: PERMISOS DEL MODULO activos
-- Convencion: 'activos.<recurso>.<accion>'
-- ============================================================================
insert into public.permisos (codigo, nombre, modulo, recurso, accion, descripcion) values
  ('activos.activos.ver',   'Ver activos',       'activos', 'activos',   'ver',      'Ver el listado unificado de activos'),
  ('activos.vehiculos.ver',   'Ver vehículos',   'activos', 'vehiculos', 'ver',      'Ver el listado de vehículos'),
  ('activos.vehiculos.crear', 'Crear vehículos', 'activos', 'vehiculos', 'crear',    'Registrar un nuevo vehículo'),
  ('activos.vehiculos.editar','Editar vehículos','activos', 'vehiculos', 'editar',   'Editar datos de un vehículo (excepto retiro)'),
  ('activos.vehiculos.eliminar','Retirar vehículos','activos','vehiculos','eliminar','Cambiar estado de un vehículo a retirado'),
  ('activos.maquinas.ver',   'Ver maquinaria',   'activos', 'maquinas',  'ver',      'Ver el listado de maquinaria'),
  ('activos.maquinas.crear', 'Crear maquinaria', 'activos', 'maquinas',  'crear',    'Registrar nueva maquinaria'),
  ('activos.maquinas.editar','Editar maquinaria','activos', 'maquinas',  'editar',   'Editar datos de maquinaria (excepto retiro)'),
  ('activos.maquinas.eliminar','Retirar maquinaria','activos','maquinas','eliminar', 'Cambiar estado de maquinaria a retirado'),
  ('activos.equipos.ver',   'Ver equipos',       'activos', 'equipos',   'ver',      'Ver el listado de equipos'),
  ('activos.equipos.crear', 'Crear equipos',     'activos', 'equipos',   'crear',    'Registrar un nuevo equipo'),
  ('activos.equipos.editar','Editar equipos',    'activos', 'equipos',   'editar',   'Editar datos de un equipo (excepto retiro)'),
  ('activos.equipos.eliminar','Retirar equipos', 'activos', 'equipos',   'eliminar', 'Cambiar estado de un equipo a retirado')
on conflict (codigo) do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r
cross join lateral (
  values
    ('activos.activos.ver'),
    ('activos.vehiculos.ver'), ('activos.vehiculos.crear'),
    ('activos.vehiculos.editar'), ('activos.vehiculos.eliminar'),
    ('activos.maquinas.ver'), ('activos.maquinas.crear'),
    ('activos.maquinas.editar'), ('activos.maquinas.eliminar'),
    ('activos.equipos.ver'), ('activos.equipos.crear'),
    ('activos.equipos.editar'), ('activos.equipos.eliminar')
) as per(codigo)
join public.permisos p on p.codigo = per.codigo
where r.codigo in ('AUTH_SUPER_ADMIN', 'AUTH_ADMIN')
on conflict do nothing;

-- ============================================================================
-- PROVEEDORES (catálogo compartido: mantenimiento, finanzas y subarriendo)
-- Solo datos de desarrollo. En la app aún no hay UI de mantenimiento de
-- proveedores; se cargan aquí para que el formulario de flota los liste.
-- ============================================================================
insert into public.proveedores (nombre, telefono, email, activo) values
  ('Proveedor Demo 1', '3000000001', 'proveedor1@demo.com', true),
  ('Proveedor Demo 2', '3000000002', 'proveedor2@demo.com', true)
on conflict (nombre) do nothing;
