-- ============================================================================
-- Módulo de Operaciones (FASE 6 — Reportes): vista única de novedades.
-- Cada fila = una pausa (novedad/limitación) de una actividad, con su causal y
-- la duración del periodo pausa->reanudacion (o pausa->fin si terminó sin
-- reanudar). NULL si la pausa sigue abierta.
-- Fuente única del cálculo de duración de novedades (CONSTITUTION §10,
-- AGENTS §19): el frontend NO duplica la fórmula.
-- security_invoker: respeta la RLS de las tablas subyacentes.
-- ============================================================================

create or replace view public.vw_operacion_novedades
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
    c.orden as causal_orden,
    row_number() over (partition by e.actividad_id order by e.fecha_hora, e.created_at) as n
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
    causal_orden,
    observaciones,
    lead(fecha_hora) over (partition by actividad_id order by n) as siguiente_hora,
    lead(tipo_evento) over (partition by actividad_id order by n) as siguiente_tipo
  from eventos
)
select
  p.actividad_id,
  a.activo_id,
  a.centro_servicio_id,
  a.cliente_id,
  p.fecha_hora                 as fecha_pausa,
  p.causal_id,
  p.causal_nombre,
  p.observaciones,
  p.siguiente_tipo,
  case
    when p.siguiente_hora is not null
    then extract(epoch from (p.siguiente_hora - p.fecha_hora)) / 3600.0
    else null
  end                          as horas_duracion
from emparejados p
join public.operacion_actividades a on a.id = p.actividad_id
where p.tipo_evento = 'pausa';

comment on view public.vw_operacion_novedades is
  'Novedades por actividad: fecha de pausa, causal, observaciones y duración (pausa->reanudacion o pausa->fin). NULL si la pausa sigue abierta. security_invoker respeta RLS.';