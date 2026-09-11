-- Función que clasifica las horas trabajadas de una marcación en las 8 categorías legales.
-- Cruza: ¿es de noche? (configuracion_jornada) + ¿es festivo/dominical? + ¿excede lo programado?
-- Maneja turnos que cruzan medianoche.

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
  -- Buscar la configuración del tenant del usuario actual
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

  -- Calcular horas programadas
  v_horas_prog := extract(epoch from (
    make_timestamp(1970,1,1, extract(hour from v_prog_inicio)::int, extract(minute from v_prog_inicio)::int, 0)
    - make_timestamp(1970,1,1, extract(hour from v_prog_fin)::int, extract(minute from v_prog_fin)::int, 0)
  )) / -3600.0;
  if v_horas_prog <= 0 then
    v_horas_prog := v_config.horas_jornada_ordinaria;
  end if;

  -- Horas excedentes (las que exceden la programación)
  v_horas_excedentes := greatest(0, v_horas_trabajadas - v_horas_prog);

  -- Iterar minuto a minuto
  v_minuto := v_inicio;
  while v_minuto < v_fin loop
    v_hora_actual := v_minuto::time;
    v_dia_semana := extract(dow from v_minuto)::int; -- 0=dom, 1=lun, ...

    -- ¿Es de noche? (horario nocturno configurable, puede cruzar medianoche)
    if v_config.hora_inicio_nocturna <= v_config.hora_fin_nocturna then
      -- No cruza medianoche: ej. 21:00 - 06:00
      v_es_noche := v_hora_actual >= v_config.hora_inicio_nocturna
                 or v_hora_actual < v_config.hora_fin_nocturna;
    else
      -- Cruza medianoche: ej. 22:00 - 05:00
      v_es_noche := v_hora_actual >= v_config.hora_inicio_nocturna
                 or v_hora_actual < v_config.hora_fin_nocturna;
    end if;

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
