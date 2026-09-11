-- Módulo de Operaciones (Fase 7): índices de las FK de actas_servicio
-- (la política SQL de FK sin índice se detectó en el advisor de performance).
create index if not exists idx_actas_servicio_cliente
  on public.actas_servicio (cliente_id);
create index if not exists idx_actas_servicio_equipo
  on public.actas_servicio (equipo_id);
create index if not exists idx_actas_servicio_generado_por
  on public.actas_servicio (generado_por);