-- ============================================================================
-- FASE 5: Vínculo usuarios ↔ empleados.
-- FASE 3 dejó `usuarios.fk_empleado_id` solo en el papel: esta migración lo
-- materializa en public.profiles (la tabla real de usuarios del sistema).
-- Columna nullable + UNIQUE: relación 0..1 ↔ 0..1 en ambas direcciones.
-- REFERENCE ON DELETE SET NULL por consistencia (un empleado retirado nunca
-- se borra físicamente, pero no debe bloquear al usuario).
-- ============================================================================

alter table public.profiles
  add column fk_empleado_id uuid;

alter table public.profiles
  add constraint profiles_fk_empleado_id_unico unique (fk_empleado_id);

alter table public.profiles
  add constraint profiles_fk_empleado_id_fkey
  foreign key (fk_empleado_id)
  references public.empleados(id)
  on delete set null;