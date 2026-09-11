-- ============================================================================
-- Módulo de Operaciones: lectura de catálogos base para coordinador_operaciones.
--
-- El listado/detalle de actividades embebe nombres de operador (empleados) y
-- de equipo (activos, incluyendo las tablas especializadas vehiculos/maquinas/
-- equipos). Las RLS de esas tablas exigen el permiso de lectura de su propio
-- módulo, por lo que el rol coordinador necesita 'empleados.empleados.ver',
-- 'activos.activos.ver' y los .ver por especialidad para que los embeds
-- devuelvan nombres (CONSULTA ya recibe 'empleados.empleados.ver').
--
-- No se otorga escritura: el coordinador solo lee catálogos; la creación de
-- empleados/activos es de sus módulos (AUTH_ADMIN/AUTH_SUPER_ADMIN).
-- ============================================================================

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'coordinador_operaciones'
  and p.codigo in (
    'empleados.empleados.ver',
    'activos.activos.ver',
    'activos.vehiculos.ver',
    'activos.maquinas.ver',
    'activos.equipos.ver'
  )
on conflict do nothing;