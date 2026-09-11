-- Soft delete para profiles (usuarios)
--
-- Agrega la columna deleted_at a profiles y amplia la politica de UPDATE
-- para permitir el soft delete a quienes tienen el permiso
-- auth.usuarios.desactivar (y tambien habilita cambiarEstado para actores
-- que solo poseen ese permiso).

alter table public.profiles
  add column deleted_at timestamp with time zone;

comment on column public.profiles.deleted_at
  is 'Marca de soft delete: nulo = activo, con valor = eliminado.';

-- Ampliar la politica de UPDATE de profiles para incluir auth.usuarios.desactivar
drop policy if exists perfiles_update_autorizado on profiles;

create policy perfiles_update_autorizado on profiles for update to authenticated
  using (
    (
      (tenant_id = auth_tenant_id())
      and (
        auth_tiene_permiso('auth.usuarios.editar'::text)
        or auth_tiene_permiso('auth.usuarios.estado'::text)
        or auth_tiene_permiso('auth.usuarios.desactivar'::text)
        or auth_tiene_permiso('auth.usuarios.roles'::text)
        or (auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role]))
      )
    )
    or (id = auth.uid())
  )
  with check (
    (
      (tenant_id = auth_tenant_id())
      and (
        auth_tiene_permiso('auth.usuarios.editar'::text)
        or auth_tiene_permiso('auth.usuarios.estado'::text)
        or auth_tiene_permiso('auth.usuarios.desactivar'::text)
        or auth_tiene_permiso('auth.usuarios.roles'::text)
        or (auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role]))
      )
    )
    or (id = auth.uid())
  );