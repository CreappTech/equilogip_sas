-- ============================================================================
-- Índice cubriente para el FK jornada_programacion.turno_id → turnos.id.
-- El turno es columna clave de la jornada (se une a `turnos` en el listado
-- semanal y se filtra por turno al editar/consultar).
-- ============================================================================

create index if not exists idx_jornada_prog_turno
  on public.jornada_programacion (turno_id);