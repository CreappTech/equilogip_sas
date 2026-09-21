-- ============================================================================
-- Dotación — Storage para evidencias y firma de la entrega.
-- Bucket privado, ≤5 MB por archivo, imágenes (JPG/PNG/WebP) y PDF.
-- Mismo patrón que el bucket `inspeccion-evidencias` de mantenimiento:
--   * carpeta raíz = auth.uid() → cada usuario solo escribe/borra en la suya.
--   * lectura ampliada: dueño del archivo o permiso dotacion.entregas.ver.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dotacion-evidencias', 'dotacion-evidencias', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "dotacion_evidencias_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dotacion-evidencias'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_permission('dotacion.entregas.ver'::text)
    )
  );

create policy "dotacion_evidencias_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dotacion-evidencias'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dotacion_evidencias_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dotacion-evidencias'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'dotacion-evidencias'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dotacion_evidencias_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dotacion-evidencias'
    and (storage.foldername(name))[1] = auth.uid()::text
  );