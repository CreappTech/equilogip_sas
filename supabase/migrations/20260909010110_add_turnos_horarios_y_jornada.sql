-- ============================================================================
-- Turnos con horario + asignación a empleados + jornadas que cruzan medianoche.
-- Decisión (equilogipsas): el turno es una entidad con rango horario.
--   hora_fin < hora_inicio  =>  turno que cruza la medianoche (nocturno).
-- `empleados.turno_id` = turno habitual del operador (estable, reasignable).
-- `jornada_programacion` guarda 1 fila por operador/día incluso si cruza: se
-- relaja la constraint de horas válidas a `<>` y se corrige fn_clasificar_horas
-- (antes, fin<=inicio caía al fallback de horas ordinarias).
-- ============================================================================

alter table public.turnos
  add column hora_inicio time not null default '06:00',
  add column hora_fin time not null default '14:00',
  add constraint turnos_horas_distintas check (hora_inicio <> hora_fin);

-- Migrar la fila heredada cuyo horario vivía en el nombre ("06:00 a 14:00").
update public.turnos
  set hora_inicio = '06:00', hora_fin = '14:00'
  where nombre = '06:00 a 14:00';

alter table public.empleados
  add column turno_id uuid references public.turnos(id) on delete set null;

create index idx_empleados_turno_id on public.empleados (turno_id);

-- Permitir turnos que cruzan medianoche (22:00 -> 06:00) como UNA fila.
alter table public.jornada_programacion
  drop constraint jornada_prog_horas_validas;

alter table public.jornada_programacion
  add constraint jornada_prog_horas_distintas
  check (hora_inicio_programada <> hora_fin_programada);

comment on table public.turnos is
  'Turnos de la compañía. hora_fin < hora_inicio indica turno que cruza la medianoche.';
comment on column public.empleados.turno_id is
  'Turno habitual del empleado (estable, reasignable). Cada registro de programación guarda su propio turno.';

-- fn_clasificar_horas: calcular horas programadas soportando cruce de medianoche.
create or replace function public.fn_clasificar_horas(p_marcacion_id uuid)
returns table (
  horas_ordinarias                     numeric(5,2),
  recargo_nocturno_ordinaria           numeric(5,2),
  hora_extra_diurna                    numeric(5,2),
  hora_extra_nocturna                  numeric(5,2),
  hora_dominical_festiva_ordinaria     numeric(5,2),
  hora_nocturna_dominical_festiva      numeric(5,2),
  hora_extra_diurna_dominical_festiva  numeric(5,2),
  hora_extra_nocturna_dominical_festiva numeric(5,2)
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  v_marcacion record;
  v_config record;
  v_inicio timestamp with time zone;
  v_fin timestamp with time zone;
  v_prog_inicio time;
  v_prog_fin time;
  v_horas_prog numeric(5,2);
  v_minuto timestamp with time zone;
  v_hora_actual time;
  v_es_noche boolean;
  v_es_festivo boolean;
  v_es_dominical boolean;
  v_dia_semana int;
  v_duracion numeric(5,2);
  v_acum_ordinarias numeric(5,2) := 0;
  v_acum_recargo_noct_ord numeric(5,2) := 0;
  v_acum_extra_diurna numeric(5,2) := 0;
  v_acum_extra_nocturna numeric(5,2) := 0;
  v_acum_dom_fest_ord numeric(5,2) := 0;
  v_acum_noct_dom_fest numeric(5,2) := 0;
  v_acum_extra_diurna_dom_fest numeric(5,2) := 0;
  v_acum_extra_noct_dom_fest numeric(5,2) := 0;
  v_horas_trabajadas numeric(5,2);
  v_horas_excedentes numeric(5,2);
  v_minutos_intervalo int;
begin
  -- Obtener la marcación con su programación
  select m.*, p.hora_inicio_programada, p.hora_fin_programada, p.fecha
    into v_marcacion
  from public.jornada_marcaciones m
  join public.jornada_programacion p on p.id = m.programacion_id
  where m.id = p_marcacion_id;

  if not found or v_marcacion.hora_inicio_real is null then
    return;
  end if;

  v_inicio := v_marcacion.hora_inicio_real;
  v_fin := coalesce(v_marcacion.hora_fin_real, v_inicio);
  v_prog_inicio := v_marcacion.hora_inicio_programada;
  v_prog_fin := v_marcacion.hora_fin_programada;

  -- Obtener configuración de jornada (del tenant del operador)
  select cj.*
    into v_config
  from public.configuracion_jornada cj
  join public.empleados e on e.id = v_marcacion.operador_id
  where cj.tenant_id = public.auth_tenant_id()
  limit 1;

  -- Si no hay configuración, usar valores por defecto de Colombia
  if not found then
    v_config.hora_inicio_nocturna := '21:00'::time;
    v_config.hora_fin_nocturna := '06:00'::time;
    v_config.horas_jornada_ordinaria := 8.00;
  end if;

  -- Calcular horas totales trabajadas
  v_horas_trabajadas := extract(epoch from (v_fin - v_inicio)) / 3600.0;
  if v_horas_trabajadas < 0 then
    v_horas_trabajadas := 0;
  end if;

  -- Calcular horas programadas soportando turnos que cruzan la medianoche
  -- (ej. 22:00 -> 06:00 => 8 horas). Si fin <= inicio se asume que cruza.
  v_horas_prog := extract(epoch from (
      make_timestamp(1970,1,1, extract(hour from v_prog_fin)::int, extract(minute from v_prog_fin)::int, 0)
    - make_timestamp(1970,1,1, extract(hour from v_prog_inicio)::int, extract(minute from v_prog_inicio)::int, 0)
  )) / 3600.0;
  if v_horas_prog <= 0 then
    v_horas_prog := v_horas_prog + 24;
  end if;

  -- Horas excedentes (las que exceden la programación)
  v_horas_excedentes := greatest(0, v_horas_trabajadas - v_horas_prog);

  -- Iterar minuto a minuto
  v_minuto := v_inicio;
  while v_minuto < v_fin loop
    v_hora_actual := v_minuto::time;
    v_dia_semana := extract(dow from v_minuto)::int; -- 0=dom, 1=lun, ...

    -- ¿Es de noche? (horario nocturno configurable, puede cruzar medianoche)
    v_es_noche := v_hora_actual >= v_config.hora_inicio_nocturna
               or v_hora_actual < v_config.hora_fin_nocturna;

    -- ¿Es festivo?
    select exists(
      select 1 from public.festivos f
      where f.fecha = v_minuto::date
    ) into v_es_festivo;

    -- ¿Es domingo? (0 = domingo en extract(dow))
    v_es_dominical := (v_dia_semana = 0);

    v_duracion := 1.0 / 60.0; -- 1 minuto en horas

    if v_es_festivo or v_es_dominical then
      -- Día festivo o dominical
      if v_es_noche then
        if v_minuto >= v_inicio + make_interval(hours => v_horas_prog) then
          v_acum_extra_noct_dom_fest := v_acum_extra_noct_dom_fest + v_duracion;
        else
          v_acum_noct_dom_fest := v_acum_noct_dom_fest + v_duracion;
        end if;
      else
        if v_minuto >= v_inicio + make_interval(hours => v_horas_prog) then
          v_acum_extra_diurna_dom_fest := v_acum_extra_diurna_dom_fest + v_duracion;
        else
          v_acum_dom_fest_ord := v_acum_dom_fest_ord + v_duracion;
        end if;
      end if;
    else
      -- Día hábil
      if v_minuto >= v_inicio + make_interval(hours => v_horas_prog) then
        -- Excede la jornada programada → hora extra
        if v_es_noche then
          v_acum_extra_nocturna := v_acum_extra_nocturna + v_duracion;
        else
          v_acum_extra_diurna := v_acum_extra_diurna + v_duracion;
        end if;
      else
        -- Dentro de la jornada programada
        if v_es_noche then
          v_acum_recargo_noct_ord := v_acum_recargo_noct_ord + v_duracion;
        else
          v_acum_ordinarias := v_acum_ordinarias + v_duracion;
        end if;
      end if;
    end if;

    v_minuto := v_minuto + interval '1 minute';
  end loop;

  -- Redondear a 2 decimales
  horas_ordinarias := round(v_acum_ordinarias, 2);
  recargo_nocturno_ordinaria := round(v_acum_recargo_noct_ord, 2);
  hora_extra_diurna := round(v_acum_extra_diurna, 2);
  hora_extra_nocturna := round(v_acum_extra_nocturna, 2);
  hora_dominical_festiva_ordinaria := round(v_acum_dom_fest_ord, 2);
  hora_nocturna_dominical_festiva := round(v_acum_noct_dom_fest, 2);
  hora_extra_diurna_dominical_festiva := round(v_acum_extra_diurna_dom_fest, 2);
  hora_extra_nocturna_dominical_festiva := round(v_acum_extra_noct_dom_fest, 2);

  return next;
end;
$$;

-- La función queda ejecutable solo por rol autenticado (patrón del proyecto).
revoke execute on function public.fn_clasificar_horas(uuid) from public, anon;