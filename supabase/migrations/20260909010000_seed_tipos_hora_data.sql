-- Semilla de los 8 tipos de hora legal colombiana.
-- La migración 20260909000000 agregó la columna porcentaje_recargo y ejecutó
-- UPDATEs por nombre, pero las filas no existían → los porcentajes quedaron en 0.
-- Esta migración inserta las filas y corrige los porcentajes de una sola vez.

insert into public.tipos_hora (tenant_id, nombre, orden, activo, porcentaje_recargo)
select t.id, v.nombre, v.orden, true, v.porcentaje_recargo
from public.tenants t
cross join (values
  ('Ordinaria',                                  1,  0),
  ('Recargo nocturno en jornada ordinaria',      2,  35),
  ('Hora extra diurna',                          3,  25),
  ('Hora extra nocturna',                        4,  75),
  ('Hora dominical o festiva ordinaria',         5,  90),
  ('Hora nocturna dominical o festiva',          6, 125),
  ('Hora extra diurna dominical o festiva',      7, 115),
  ('Hora extra nocturna dominical o festiva',    8, 165)
) as v(nombre, orden, porcentaje_recargo)
on conflict (tenant_id, nombre) do update
  set porcentaje_recargo = excluded.porcentaje_recargo,
      orden = excluded.orden;
