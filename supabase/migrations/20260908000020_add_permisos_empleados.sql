-- ============================================================================
-- FASE 5: Permisos del módulo de empleados.
-- Convención 'modulo.recurso.accion' (AGENTS §4.8).
-- 'eliminar' = cambio de estado a 'retirado' (nunca DELETE físico).
-- AUTH_ADMIN + AUTH_SUPER_ADMIN: los 5 permisos. CONSULTA: solo lectura (.ver).
-- ============================================================================

insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado)
values
  ('d1a2c3d4-0000-4000-8000-000000000000', 'Ver empleados',            'empleados.empleados.ver',              'Ver el listado y detalle de empleados',        'empleados', 'empleados', 'ver',              'activo'),
  ('d1a2c3d4-0001-4000-8000-000000000001', 'Crear empleados',          'empleados.empleados.crear',            'Registrar un nuevo empleado',                   'empleados', 'empleados', 'crear',            'activo'),
  ('d1a2c3d4-0002-4000-8000-000000000002', 'Editar empleados',         'empleados.empleados.editar',           'Editar datos de un empleado (excepto retiro)',  'empleados', 'empleados', 'editar',           'activo'),
  ('d1a2c3d4-0003-4000-8000-000000000003', 'Retirar empleados',        'empleados.empleados.eliminar',         'Cambiar estado de un empleado a retirado',      'empleados', 'empleados', 'eliminar',         'activo'),
  ('d1a2c3d4-0004-4000-8000-000000000004', 'Vincular usuario',         'empleados.empleados.vincular_usuario', 'Asociar o desasociar un usuario a un empleado', 'empleados', 'empleados', 'vincular_usuario', 'activo')
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- Asignación a AUTH_ADMIN y AUTH_SUPER_ADMIN (los 5)
-- ---------------------------------------------------------------------------
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo in ('AUTH_ADMIN', 'AUTH_SUPER_ADMIN')
  and p.codigo in (
    'empleados.empleados.ver',
    'empleados.empleados.crear',
    'empleados.empleados.editar',
    'empleados.empleados.eliminar',
    'empleados.empleados.vincular_usuario'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Asignación a CONSULTA (solo lectura)
-- ---------------------------------------------------------------------------
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'CONSULTA'
  and p.codigo = 'empleados.empleados.ver'
on conflict do nothing;