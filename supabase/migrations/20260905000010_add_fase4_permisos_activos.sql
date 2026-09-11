-- =============================================================================
-- FASE 4: Permisos del módulo de activos
-- Convención 'modulo.recurso.accion' (AGENTS §4.8).
-- 'eliminar' = cambio de estado a 'retirado' (nunca DELETE físico).
-- Se asignan a AUTH_ADMIN y AUTH_SUPER_ADMIN (el súper además bypassa
-- las policies vía has_permission).
-- =============================================================================

insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado)
values
  ('b1a2c3d4-0000-4000-8000-000000000000', 'Ver activos',            'activos.activos.ver',    'Ver el listado unificado de activos',            'activos', 'activos',   'ver',      'activo'),
  ('b1a2c3d4-0001-4000-8000-000000000001', 'Ver vehículos',          'activos.vehiculos.ver',  'Ver el listado de vehículos',                    'activos', 'vehiculos', 'ver',      'activo'),
  ('b1a2c3d4-0002-4000-8000-000000000002', 'Crear vehículos',        'activos.vehiculos.crear', 'Registrar un nuevo vehículo',                   'activos', 'vehiculos', 'crear',    'activo'),
  ('b1a2c3d4-0003-4000-8000-000000000003', 'Editar vehículos',       'activos.vehiculos.editar', 'Editar datos de un vehículo (excepto retiro)',  'activos', 'vehiculos', 'editar',   'activo'),
  ('b1a2c3d4-0004-4000-8000-000000000004', 'Retirar vehículos',      'activos.vehiculos.eliminar', 'Cambiar estado de un vehículo a retirado',     'activos', 'vehiculos', 'eliminar', 'activo'),
  ('b1a2c3d4-0005-4000-8000-000000000005', 'Ver maquinaria',         'activos.maquinas.ver',   'Ver el listado de maquinaria',                   'activos', 'maquinas',  'ver',      'activo'),
  ('b1a2c3d4-0006-4000-8000-000000000006', 'Crear maquinaria',       'activos.maquinas.crear', 'Registrar nueva maquinaria',                     'activos', 'maquinas',  'crear',    'activo'),
  ('b1a2c3d4-0007-4000-8000-000000000007', 'Editar maquinaria',      'activos.maquinas.editar', 'Editar datos de maquinaria (excepto retiro)',   'activos', 'maquinas',  'editar',   'activo'),
  ('b1a2c3d4-0008-4000-8000-000000000008', 'Retirar maquinaria',     'activos.maquinas.eliminar', 'Cambiar estado de maquinaria a retirado',       'activos', 'maquinas',  'eliminar', 'activo'),
  ('b1a2c3d4-0009-4000-8000-000000000009', 'Ver equipos',            'activos.equipos.ver',    'Ver el listado de equipos',                      'activos', 'equipos',   'ver',      'activo'),
  ('b1a2c3d4-000a-4000-8000-00000000000a', 'Crear equipos',          'activos.equipos.crear',  'Registrar un nuevo equipo',                      'activos', 'equipos',   'crear',    'activo'),
  ('b1a2c3d4-000b-4000-8000-00000000000b', 'Editar equipos',         'activos.equipos.editar', 'Editar datos de un equipo (excepto retiro)',    'activos', 'equipos',   'editar',   'activo'),
  ('b1a2c3d4-000c-4000-8000-00000000000c', 'Retirar equipos',        'activos.equipos.eliminar', 'Cambiar estado de un equipo a retirado',        'activos', 'equipos',   'eliminar', 'activo')
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- Asignación a AUTH_ADMIN
-- ---------------------------------------------------------------------------
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_ADMIN'
  and p.codigo in (
    'activos.activos.ver',
    'activos.vehiculos.ver', 'activos.vehiculos.crear', 'activos.vehiculos.editar', 'activos.vehiculos.eliminar',
    'activos.maquinas.ver', 'activos.maquinas.crear', 'activos.maquinas.editar', 'activos.maquinas.eliminar',
    'activos.equipos.ver', 'activos.equipos.crear', 'activos.equipos.editar', 'activos.equipos.eliminar'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Asignación a AUTH_SUPER_ADMIN
-- ---------------------------------------------------------------------------
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_SUPER_ADMIN'
  and p.codigo in (
    'activos.activos.ver',
    'activos.vehiculos.ver', 'activos.vehiculos.crear', 'activos.vehiculos.editar', 'activos.vehiculos.eliminar',
    'activos.maquinas.ver', 'activos.maquinas.crear', 'activos.maquinas.editar', 'activos.maquinas.eliminar',
    'activos.equipos.ver', 'activos.equipos.crear', 'activos.equipos.editar', 'activos.equipos.eliminar'
  )
on conflict do nothing;