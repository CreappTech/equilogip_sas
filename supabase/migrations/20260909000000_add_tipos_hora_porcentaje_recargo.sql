-- MAESTRO DE DATOS - tipos de hora: % de recargo para identificar el tipo
-- (ej. "Hora extra diurna. 25%"). Con decimales (25.50) y no negativo.
alter table public.tipos_hora
  add column porcentaje_recargo numeric(5, 2) not null default 0
  constraint tipos_hora_porcentaje_recargo_positivo
    check (porcentaje_recargo >= 0);

-- Recargos estándar por tipo de hora (reajustables desde el maestro de datos).
update public.tipos_hora set porcentaje_recargo = 0   where nombre = 'Ordinaria';
update public.tipos_hora set porcentaje_recargo = 35  where nombre = 'Recargo nocturno en jornada ordinaria';
update public.tipos_hora set porcentaje_recargo = 25  where nombre = 'Hora extra diurna';
update public.tipos_hora set porcentaje_recargo = 75  where nombre = 'Hora extra nocturna';
update public.tipos_hora set porcentaje_recargo = 75  where nombre = 'Hora dominical o festiva ordinaria';
update public.tipos_hora set porcentaje_recargo = 110 where nombre = 'Hora nocturna dominical o festiva';
update public.tipos_hora set porcentaje_recargo = 100 where nombre = 'Hora extra diurna dominical o festiva';
update public.tipos_hora set porcentaje_recargo = 150 where nombre = 'Hora extra nocturna dominical o festiva';