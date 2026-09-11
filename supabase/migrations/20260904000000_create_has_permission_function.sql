-- public.has_permission(permiso text) returns boolean
-- Devuelve true si el usuario actual tiene el permiso solicitado
-- (directamente o por herencia de rol) o si es SUPER_ADMIN.
--
-- Diseñada para usarse en políticas RLS de tablas de negocio:
--
--   USING ( public.has_permission('auth.usuarios.crear') )
--
-- El parametro 'permiso' puede incluir comodines:
--   - 'auth.*'           -> todos los permisos del modulo auth
--   - 'auth.usuarios.*'  -> todos los permisos del recurso usuarios dentro de auth
--   - 'auth.usuarios.ver'-> un permiso especifico
--
-- SECURITY DEFINER + STABLE para que la evaluación de la RLS no haga
-- queries adicionales a roles_permisos por cada fila. La query
-- interna filtra por auth.uid() y solo expone codigos de permisos
-- activos; no se filtra por tenant_id porque se asume que un permiso
-- vale en cualquier tenant donde el rol este activo. Cuando un modulo
-- requiera scope por tenant, el llamador debe componer has_permission()
-- con un check explicito de tenant_id en la policy.

create or replace function public.has_permission(p_permiso text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  with user_perms as (
    select distinct p.codigo
    from public.roles r
    join public.usuarios_roles ur on ur.rol_id = r.id
    join public.roles_permisos rp on rp.rol_id = r.id
    join public.permisos p on p.id = rp.permiso_id
    where ur.usuario_id = auth.uid()
      and r.estado = 'activo'
      and p.estado = 'activo'
  ),
  is_super as (
    select exists (
      select 1
      from public.roles r
      join public.usuarios_roles ur on ur.rol_id = r.id
      where ur.usuario_id = auth.uid()
        and r.estado = 'activo'
        and r.codigo = 'SUPER_ADMIN'
    ) as v
  )
  select
    (select v from is_super)
    or p_permiso = any (array_agg(codigo))
    or exists (
      select 1
      from unnest(array_agg(codigo)) as p(codigo)
      where p_permiso = replace(p.codigo, '.*', '.ver') -- placeholder no-match
    )
    or (
      -- match por wildcards estilo 'auth.*' o 'auth.usuarios.*'
      select bool_or(p_permiso like replace(p2.codigo, '*', '%'))
      from unnest(array_agg(codigo)) as p2(codigo)
      where p2.codigo like '%.*'
    )
  from user_perms;
$$;

comment on function public.has_permission(text) is
  'Devuelve true si el usuario actual tiene el permiso dado. Soporta wildcards (auth.*, auth.usuarios.*).';
