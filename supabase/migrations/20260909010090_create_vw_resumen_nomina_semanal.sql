-- Vista de resumen de nómina semanal: fuente única para UI y Excel.
-- Consume fn_clasificar_horas y agrupa por operador + semana (lunes-domingo).

create or replace view public.vw_resumen_nomina_semanal as
select
  e.id as operador_id,
  e.nombres || ' ' || e.apellidos as operador_nombre,
  date_trunc('week', p.fecha)::date as semana_inicio,
  (date_trunc('week', p.fecha)::date + interval '6 days')::date as semana_fin,
  sum((c.horas_ordinarias)) as horas_ordinarias,
  sum((c.recargo_nocturno_ordinaria)) as recargo_nocturno_ordinaria,
  sum((c.hora_extra_diurna)) as hora_extra_diurna,
  sum((c.hora_extra_nocturna)) as hora_extra_nocturna,
  sum((c.hora_dominical_festiva_ordinaria)) as hora_dominical_festiva_ordinaria,
  sum((c.hora_nocturna_dominical_festiva)) as hora_nocturna_dominical_festiva,
  sum((c.hora_extra_diurna_dominical_festiva)) as hora_extra_diurna_dominical_festiva,
  sum((c.hora_extra_nocturna_dominical_festiva)) as hora_extra_nocturna_dominical_festiva
from public.jornada_marcaciones m
join public.jornada_programacion p on p.id = m.programacion_id
join public.empleados e on e.id = p.operador_id
cross join lateral public.fn_clasificar_horas(m.id) c
where m.estado = 'completa'
  and c.horas_ordinarias + c.recargo_nocturno_ordinaria
    + c.hora_extra_diurna + c.hora_extra_nocturna
    + c.hora_dominical_festiva_ordinaria + c.hora_nocturna_dominical_festiva
    + c.hora_extra_diurna_dominical_festiva + c.hora_extra_nocturna_dominical_festiva > 0
group by e.id, e.nombres, e.apellidos, date_trunc('week', p.fecha)::date;

alter view public.vw_resumen_nomina_semanal set (security_invoker = true);

-- Permisos del módulo de Jornada de Trabajo (8 permisos).
insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado) values
  ('f1a2c3d4-0001-4000-8000-000000000001', 'Ver planeación de jornada',       'jornada.planeacion.ver',       'Permite ver la programación semanal de jornada',                  'jornada', 'planeacion', 'ver',       'activo'),
  ('f1a2c3d4-0002-4000-8000-000000000002', 'Crear planeación de jornada',      'jornada.planeacion.crear',     'Permite crear programación semanal de jornada',                   'jornada', 'planeacion', 'crear',     'activo'),
  ('f1a2c3d4-0003-4000-8000-000000000003', 'Editar planeación de jornada',     'jornada.planeacion.editar',    'Permite editar programación semanal de jornada',                  'jornada', 'planeacion', 'editar',    'activo'),
  ('f1a2c3d4-0004-4000-8000-000000000004', 'Marcar asistencia',                'jornada.asistencia.marcar',    'Permite marcar llegada y salida de operadores',                   'jornada', 'asistencia', 'marcar',    'activo'),
  ('f1a2c3d4-0005-4000-8000-000000000005', 'Corregir asistencia',              'jornada.asistencia.corregir',  'Permite corregir marcaciones y registrar novedades',               'jornada', 'asistencia', 'corregir',  'activo'),
  ('f1a2c3d4-0006-4000-8000-000000000006', 'Ver asistencia',                   'jornada.asistencia.ver',       'Permite ver la lista de asistencia del día',                      'jornada', 'asistencia', 'ver',       'activo'),
  ('f1a2c3d4-0007-4000-8000-000000000007', 'Ver resumen de nómina',            'jornada.nomina.ver',           'Permite ver el resumen de horas por operador',                    'jornada', 'nomina',     'ver',       'activo'),
  ('f1a2c3d4-0008-4000-8000-000000000008', 'Exportar resumen de nómina',       'jornada.nomina.exportar',      'Permite descargar el resumen de nómina en Excel',                 'jornada', 'nomina',     'exportar',  'activo'),
  ('f1a2c3d4-0009-4000-8000-000000000009', 'Editar configuración de jornada',  'jornada.configuracion.editar', 'Permite editar la configuración de horario nocturno y jornada',    'jornada', 'configuracion', 'editar', 'activo')
on conflict (codigo) do nothing;

-- Asignación de permisos a roles
-- AUTH_SUPER_ADMIN recibe todos (ya tiene bypass por has_permission, pero se inserta por consistencia)
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_SUPER_ADMIN'
  and p.codigo in (
    'jornada.planeacion.ver', 'jornada.planeacion.crear', 'jornada.planeacion.editar',
    'jornada.asistencia.marcar', 'jornada.asistencia.corregir', 'jornada.asistencia.ver',
    'jornada.nomina.ver', 'jornada.nomina.exportar',
    'jornada.configuracion.editar'
  )
on conflict do nothing;

-- AUTH_ADMIN recibe permisos de administración
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_ADMIN'
  and p.codigo in (
    'jornada.planeacion.ver', 'jornada.planeacion.crear', 'jornada.planeacion.editar',
    'jornada.asistencia.marcar', 'jornada.asistencia.corregir', 'jornada.asistencia.ver',
    'jornada.nomina.ver', 'jornada.nomina.exportar',
    'jornada.configuracion.editar'
  )
on conflict do nothing;

-- Coordinador de operaciones recibe permisos operativos
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'coordinador_operaciones'
  and p.codigo in (
    'jornada.planeacion.ver', 'jornada.planeacion.crear', 'jornada.planeacion.editar',
    'jornada.asistencia.marcar', 'jornada.asistencia.corregir', 'jornada.asistencia.ver',
    'jornada.nomina.ver', 'jornada.nomina.exportar'
  )
on conflict do nothing;

-- CONSULTA recibe solo permisos de lectura
insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'CONSULTA'
  and p.codigo in (
    'jornada.planeacion.ver',
    'jornada.asistencia.ver',
    'jornada.nomina.ver'
  )
on conflict do nothing;
