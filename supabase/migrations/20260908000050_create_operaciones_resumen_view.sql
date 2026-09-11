-- ============================================================================
-- Módulo de Operaciones (FASE 1.7): vista única de resumen por actividad.
-- Fuente única del cálculo de horas trabajadas y tiempo de limitación
-- (CONSTITUTION §10, AGENTS §19): la lógica NO se duplica en el frontend.
--
-- Horas trabajadas  = suma de intervalos inicio->pausa y reanudacion->fin.
-- Tiempo limitado    = suma de intervalos pausa->reanudacion (o pausa->fin si
--                      la actividad terminó sin reanudar).
-- Novedades          = conteo y sumatoria de duración por pausa.
--
-- security_invoker: la vista respeta la RLS de las tablas subyacentes, de modo
-- que solo se ven filas que el usuario puede leer (permiso .ver).
-- ============================================================================

create or replace view public.vw_operacion_actividades_resumen
with (security_invoker = true)
as
with eventos as (
  select
    e.actividad_id,
    e.tipo_evento,
    e.fecha_hora,
    e.causal_id,
    e.observaciones,
    c.nombre as causal_nombre,
    row_number() over (partition by e.actividad_id order by e.fecha_hora) as n
  from public.operacion_eventos e
  left join public.causales_pausa c on c.id = e.causal_id
),
emparejados as (
  select
    actividad_id,
    tipo_evento,
    fecha_hora,
    causal_id,
    causal_nombre,
    observaciones,
    lead(fecha_hora) over (partition by actividad_id order by n) as siguiente_hora,
    lead(tipo_evento) over (partition by actividad_id order by n) as siguiente_tipo
  from eventos
)
select
  a.id                                     as actividad_id,
  a.activo_id,
  a.operador_id,
  a.centro_servicio_id,
  a.tipo_actividad_id,
  a.cliente_id,
  a.estado,
  a.created_at                            as fecha_creacion,
  (select min(e2.fecha_hora) from public.operacion_eventos e2
    where e2.actividad_id = a.id and e2.tipo_evento = 'inicio') as inicio_hora,
  (select max(e3.fecha_hora) from public.operacion_eventos e3
    where e3.actividad_id = a.id and e3.tipo_evento = 'fin')   as fin_hora,
  -- Horas trabajadas: intervalos inicio->pausa + reanudacion->fin
  coalesce(sum(
    case
      when p.tipo_evento in ('inicio', 'reanudacion')
           and p.siguiente_tipo in ('pausa', 'fin')
      then extract(epoch from (p.siguiente_hora - p.fecha_hora)) / 3600.0
      else 0
    end
  ), 0)                                  as horas_trabajadas,
  -- Tiempo limitado (novedades): intervalos pausa->reanudacion / pausa->fin
  coalesce(sum(
    case
      when p.tipo_evento = 'pausa'
           and p.siguiente_hora is not null
      then extract(epoch from (p.siguiente_hora - p.fecha_hora)) / 3600.0
      else 0
    end
  ), 0)                                  as horas_limitadas,
  -- Conteo de novedades (pausas)
  coalesce(sum(case when p.tipo_evento = 'pausa' then 1 else 0 end), 0)
                                         as total_novedades
from public.operacion_actividades a
left join emparejados p on p.actividad_id = a.id
group by a.id;

comment on view public.vw_operacion_actividades_resumen is
  'Resumen por actividad: inicio, fin, horas trabajadas, horas limitadas y total de novedades. security_invoker respeta RLS.';
