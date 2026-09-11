-- ============================================================================
-- Módulo de Operaciones (FASE 5): función RPC del cuadro de control.
-- Registra un evento de bitácora y el cambio de estado en UNA transacción.
-- Autorización por permiso y máquina de estados centralizadas en la base
-- (CONSTITUTION §10, AGENTS §19): el frontend nunca ejecuta updates sueltos.
--
-- security invoker: las policies RLS de operacion_actividades /
-- operacion_eventos se evalúan con los permisos del usuario final.
--
-- Transiciones válidas:
--   creada     -> inicio      -> en_curso
--   en_curso   -> pausa | fin
--   pausada    -> reanudacion | fin   (finalizar desde pausada: el tramo
--                                      pausa->fin cuenta como limitado en la
--                                      vista de resumen)
--   finalizada -> (terminal, sin eventos nuevos)
-- ============================================================================

create or replace function public.operaciones_registrar_evento(
  p_actividad_id   uuid,
  p_tipo_evento    text,
  p_causal_id      uuid default null,
  p_observaciones  text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_estado       text;
  v_permiso      text;
  v_estado_nuevo text;
  v_evento_id    uuid;
begin
  v_permiso := case p_tipo_evento
    when 'inicio'      then 'operaciones.actividades.iniciar'
    when 'pausa'       then 'operaciones.actividades.pausar'
    when 'reanudacion' then 'operaciones.actividades.reanudar'
    when 'fin'         then 'operaciones.actividades.finalizar'
    else null
  end;

  if v_permiso is null then
    raise exception 'Tipo de evento inválido: %', p_tipo_evento
      using errcode = 'P0001';
  end if;

  if not public.has_permission(v_permiso) then
    raise exception 'No tienes permiso para %', v_permiso
      using errcode = '42501';
  end if;

  -- Bloquea la fila para serializar transiciones concurrentes.
  select estado into v_estado
  from public.operacion_actividades
  where id = p_actividad_id
  for update;

  if not found then
    raise exception 'Actividad no encontrada.'
      using errcode = 'P0002';
  end if;

  if not (
    (v_estado = 'creada'    and p_tipo_evento = 'inicio') or
    (v_estado = 'en_curso'  and p_tipo_evento in ('pausa', 'fin')) or
    (v_estado = 'pausada'   and p_tipo_evento in ('reanudacion', 'fin'))
  ) then
    raise exception 'Transición inválida: la actividad está en "%" y el evento "%" no se puede registrar.', v_estado, p_tipo_evento
      using errcode = 'P0001';
  end if;

  v_estado_nuevo := case p_tipo_evento
    when 'inicio'      then 'en_curso'
    when 'pausa'       then 'pausada'
    when 'reanudacion' then 'en_curso'
    when 'fin'         then 'finalizada'
  end;

  insert into public.operacion_eventos
    (actividad_id, tipo_evento, causal_id, observaciones, registrado_por)
  values
    (p_actividad_id, p_tipo_evento, p_causal_id, p_observaciones, auth.uid())
  returning id into v_evento_id;

  update public.operacion_actividades
     set estado = v_estado_nuevo
   where id = p_actividad_id;

  return v_evento_id;
end;
$$;

comment on function public.operaciones_registrar_evento(uuid, text, uuid, text) is
  'Registra un evento de bitácora (inicio/pausa/reanudacion/fin) y actualiza el estado de la actividad en una sola transacción. Valida el permiso del evento y la máquina de estados.';