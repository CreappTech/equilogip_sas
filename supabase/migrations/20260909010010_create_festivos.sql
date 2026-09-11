-- Tabla de días festivos (Colombia por defecto, extensible a otros países).
-- Se usa en fn_clasificar_horas para saber si un día es festivo.

create table public.festivos (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null,
  descripcion text not null,
  pais        text not null default 'CO',
  created_at  timestamp with time zone not null default now(),

  constraint festivos_fecha_pais_unico unique (fecha, pais)
);

alter table public.festivos enable row level security;

create policy "festivos_select_tenant"
  on public.festivos for select to authenticated
  using (true);

-- Festivos Colombia 2026 (Ley 51 de 1983 + decretos anuales).
-- Se usa INSERT ... ON CONFLICT para ser idempotente.
insert into public.festivos (fecha, descripcion, pais) values
  ('2026-01-01', 'Año Nuevo', 'CO'),
  ('2026-01-12', 'Día de los Reyes Magos', 'CO'),
  ('2026-03-23', 'Día de San José', 'CO'),
  ('2026-04-02', 'Jueves Santo', 'CO'),
  ('2026-04-03', 'Viernes Santo', 'CO'),
  ('2026-05-01', 'Día del Trabajo', 'CO'),
  ('2026-05-18', 'Ascensión del Señor', 'CO'),
  ('2026-06-08', 'Corpus Christi', 'CO'),
  ('2026-06-15', 'Sagrado Corazón de Jesús', 'CO'),
  ('2026-06-29', 'San Pedro y San Pablo', 'CO'),
  ('2026-07-20', 'Día de la Independencia', 'CO'),
  ('2026-08-07', 'Batalla de Boyacá', 'CO'),
  ('2026-08-15', 'Asunción de la Virgen', 'CO'),
  ('2026-10-12', 'Día de la Raza', 'CO'),
  ('2026-11-01', 'Todos los Santos', 'CO'),
  ('2026-11-11', 'Independencia de Cartagena', 'CO'),
  ('2026-12-08', 'Inmaculada Concepción', 'CO'),
  ('2026-12-25', 'Navidad', 'CO')
on conflict (fecha, pais) do nothing;
