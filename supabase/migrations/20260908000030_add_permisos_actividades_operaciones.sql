-- ============================================================================
-- Módulo de Operaciones: permisos del recurso 'actividades' + rol coordinador.
-- Convención 'modulo.recurso.accion' (AGENTS §4.8, ARCHITECTURE §14).
-- Se crean los permisos operaciones.actividades.* y operaciones.actas.*
-- (actas se siembran ahora para el módulo, aunque su UI llega en Fase 7).
-- Roles que los reciben:
--   - coordinador_operaciones (rol de negocio nuevo, asignable a perfiles)
--   - AUTH_ADMIN
--   - AUTH_SUPER_ADMIN (por consistencia con el resto de módulos)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Permisos nuevos
-- ---------------------------------------------------------------------------
insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado)
values
  ('e1a2c3d4-0000-4000-8000-000000000000', 'Crear actividad',      'operaciones.actividades.crear',      'Registrar una nueva actividad operativa (operador + equipo + centro)', 'operaciones', 'actividades', 'crear',      'activo'),
  ('e1a2c3d4-0001-4000-8000-000000000001', 'Ver actividades',      'operaciones.actividades.ver',        'Ver el listado y detalle de actividades',                             'operaciones', 'actividades', 'ver',        'activo'),
  ('e1a2c3d4-0002-4000-8000-000000000002', 'Iniciar actividad',    'operaciones.actividades.iniciar',    'Registrar el inicio (play) de una actividad',                         'operaciones', 'actividades', 'iniciar',    'activo'),
  ('e1a2c3d4-0003-4000-8000-000000000003', 'Pausar actividad',     'operaciones.actividades.pausar',     'Registrar una pausa (limitación/novedad) de una actividad',           'operaciones', 'actividades', 'pausar',     'activo'),
  ('e1a2c3d4-0004-4000-8000-000000000004', 'Reanudar actividad',   'operaciones.actividades.reanudar',   'Reanudar una actividad pausada',                                     'operaciones', 'actividades', 'reanudar',   'activo'),
  ('e1a2c3d4-0005-4000-8000-000000000005', 'Finalizar actividad',  'operaciones.actividades.finalizar',  'Finalizar una actividad y cerrar su bitácora',                        'operaciones', 'actividades', 'finalizar',  'activo'),
  ('e1a2c3d4-0006-4000-8000-000000000006', 'Generar actas',        'operaciones.actas.generar',          'Generar el acta de prestación de servicios',                          'operaciones', 'actas',       'generar',    'activo'),
  ('e1a2c3d4-0007-4000-8000-000000000007', 'Ver actas',            'operaciones.actas.ver',              'Ver las actas de prestación de servicios generadas',                  'operaciones', 'actas',       'ver',        'activo')
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- Rol de negocio nuevo: coordinador_operaciones
-- ---------------------------------------------------------------------------
insert into public.roles (codigo, nombre, descripcion, es_sistema, estado)
values ('coordinador_operaciones', 'Coordinador de Operaciones', 'Gestiona las actividades operativas y genera actas de prestación de servicios', false, 'activo')
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- Asignación de permisos al rol coordinador_operaciones (los 8)
-- ---------------------------------------------------------------------------
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'coordinador_operaciones'
  and p.codigo in (
    'operaciones.actividades.crear',
    'operaciones.actividades.ver',
    'operaciones.actividades.iniciar',
    'operaciones.actividades.pausar',
    'operaciones.actividades.reanudar',
    'operaciones.actividades.finalizar',
    'operaciones.actas.generar',
    'operaciones.actas.ver'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Asignación a AUTH_ADMIN (los 8)
-- ---------------------------------------------------------------------------
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_ADMIN'
  and p.codigo in (
    'operaciones.actividades.crear',
    'operaciones.actividades.ver',
    'operaciones.actividades.iniciar',
    'operaciones.actividades.pausar',
    'operaciones.actividades.reanudar',
    'operaciones.actividades.finalizar',
    'operaciones.actas.generar',
    'operaciones.actas.ver'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Asignación a AUTH_SUPER_ADMIN (los 8)
-- ---------------------------------------------------------------------------
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_SUPER_ADMIN'
  and p.codigo in (
    'operaciones.actividades.crear',
    'operaciones.actividades.ver',
    'operaciones.actividades.iniciar',
    'operaciones.actividades.pausar',
    'operaciones.actividades.reanudar',
    'operaciones.actividades.finalizar',
    'operaciones.actas.generar',
    'operaciones.actas.ver'
  )
on conflict do nothing;
