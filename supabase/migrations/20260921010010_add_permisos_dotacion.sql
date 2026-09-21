-- ============================================================================
-- Dotación — permisos del módulo.
-- Convención 'modulo.recurso.accion' (AGENTS §4.8): dotacion.entregas.{...}.
-- 'eliminar' = anulación (cambio de estado, nunca DELETE físico).
-- AUTH_ADMIN + AUTH_SUPER_ADMIN: los 4 permisos. CONSULTA: solo lectura (.ver).
-- ============================================================================

insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado)
values
  ('f2a2c3d4-0000-4000-8000-000000000000', 'Ver entregas de dotación', 'dotacion.entregas.ver',       'Ver el listado, detalle y recibo de entregas de dotación', 'dotacion', 'entregas', 'ver',       'activo'),
  ('f2a2c3d4-0001-4000-8000-000000000001', 'Registrar entregas',        'dotacion.entregas.crear',     'Registrar una entrega de dotación con firma y evidencia',   'dotacion', 'entregas', 'crear',     'activo'),
  ('f2a2c3d4-0002-4000-8000-000000000002', 'Editar entregas',           'dotacion.entregas.editar',    'Editar datos y elementos de una entrega',                  'dotacion', 'entregas', 'editar',    'activo'),
  ('f2a2c3d4-0003-4000-8000-000000000003', 'Anular entregas',           'dotacion.entregas.eliminar',  'Cambiar el estado de una entrega a anulada',               'dotacion', 'entregas', 'eliminar',  'activo')
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- Asignación a AUTH_ADMIN y AUTH_SUPER_ADMIN (los 4)
-- ---------------------------------------------------------------------------
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo in ('AUTH_ADMIN', 'AUTH_SUPER_ADMIN')
  and p.codigo in (
    'dotacion.entregas.ver',
    'dotacion.entregas.crear',
    'dotacion.entregas.editar',
    'dotacion.entregas.eliminar'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Asignación a CONSULTA (solo lectura)
-- ---------------------------------------------------------------------------
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'CONSULTA'
  and p.codigo = 'dotacion.entregas.ver'
on conflict do nothing;