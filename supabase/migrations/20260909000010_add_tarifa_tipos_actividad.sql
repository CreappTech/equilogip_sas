-- MAESTRO DE DATOS - actividades: tarifa por hora o servicio del catálogo
-- de tipos de actividad. Con decimales (25.50) y no negativa. Las filas
-- existentes quedan con tarifa 0 (reajustable desde el maestro de datos).
alter table public.tipos_actividad
  add column tarifa numeric(12, 2) not null default 0
  constraint tipos_actividad_tarifa_no_negativa
    check (tarifa >= 0);

comment on column public.tipos_actividad.tarifa is
  'Tarifa por hora o por servicio asociada a la actividad. Valor positivo con dos decimales.';