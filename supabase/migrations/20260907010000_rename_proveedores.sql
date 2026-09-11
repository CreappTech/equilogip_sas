-- =============================================================================
-- Catálogos maestros: consolidar proveedores
-- -----------------------------------------------------------------------------
-- `proveedores_subarriendo` (creada en la Fase 4 para subarriendo) pasa a ser
-- el catálogo compartido `proveedores` que usarán mantenimiento, finanzas y
-- subarriendo (AGENTS §6 y prompt CRUD de catálogos: un solo catálogo, no
-- duplicados por módulo).
--
-- * La FK activos.proveedor_id la sigue Postgres automáticamente (apunta a la
--   tabla renombrada).
-- * La política de escritura previa exigía activos.activos.crear, lo que
--   rompía el CRUD del Maestro de datos (cuyos permisos son
--   catalogos.proveedores.*). Se reescribe con los códigos del módulo.
--   La política de lectura (creada en 20260906000001 con códigos exactos)
--   ya permite catalogos.proveedores.ver y activos.activos.ver; se conserva.
-- =============================================================================

alter table public.proveedores_subarriendo rename to proveedores;

comment on table public.proveedores
  is 'Catálogo compartido de proveedores (mantenimiento, finanzas y subarriendo de activos).';

-- -----------------------------------------------------------------------------
-- RLS de escritura: solo códigos del módulo catalogos
-- -----------------------------------------------------------------------------
drop policy if exists proveedores_write_admin on public.proveedores;

create policy proveedores_insert_auth on public.proveedores
  for insert to authenticated
  with check (public.has_permission('catalogos.proveedores.crear'::text));

create policy proveedores_update_auth on public.proveedores
  for update to authenticated
  using (public.has_permission('catalogos.proveedores.editar'::text))
  with check (public.has_permission('catalogos.proveedores.editar'::text));

create policy proveedores_delete_auth on public.proveedores
  for delete to authenticated
  using (public.has_permission('catalogos.proveedores.eliminar'::text));