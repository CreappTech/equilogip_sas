-- =============================================================================
-- FIX RLS ACTIVOS + has_permission
--   1. Las policies de la tabla base `activos` construian el código de permiso
--      con el valor singular de `activos.tipo` ('vehiculo'/'maquina'/'equipo'),
--      pero el catálogo de permisos usa plural ('activos.vehiculos.crear').
--      Resultado: AUTH_ADMIN/AUTH_SUPER_ADMIN recibian 42501 (RLS) al crear o
--      editar activos. Se mapea singular -> plural con el helper
--      activos_recurso_tipo (mismo mapeo que tipoARecurso() del front).
--   2. has_permission(): el bypass de super admin miraba r.codigo = 'SUPER_ADMIN'
--      pero el rol real se llama 'AUTH_SUPER_ADMIN' (AGENTS 4.8), por lo que el
--      bypass nunca se activaba. Se corrige el nombre del rol.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: recurso plural a partir del tipo singular (espejo de tipoARecurso)
-- ---------------------------------------------------------------------------
create or replace function public.activos_recurso_tipo(p_tipo text)
returns text
language sql
immutable
as $$
  select case p_tipo
    when 'vehiculo' then 'vehiculos'
    when 'maquina'  then 'maquinas'
    when 'equipo'   then 'equipos'
    else p_tipo
  end;
$$;

comment on function public.activos_recurso_tipo(text) is
  'Traduce el tipo singular de activos (vehiculo/maquina/equipo) al recurso plural del catálogo de permisos (vehiculos/maquinas/equipos).';

-- ---------------------------------------------------------------------------
-- Recrear policies de public.activos con el recurso plural
-- ---------------------------------------------------------------------------
drop policy if exists activos_insert on public.activos;
create policy activos_insert on public.activos
  for insert to authenticated
  with check (has_permission('activos.' || public.activos_recurso_tipo(tipo) || '.crear'));

drop policy if exists activos_update_datos on public.activos;
create policy activos_update_datos on public.activos
  for update to authenticated
  using (
    estado <> 'retirado'
    and has_permission('activos.' || public.activos_recurso_tipo(tipo) || '.editar')
  )
  with check (
    estado in ('activo', 'inactivo')
    and has_permission('activos.' || public.activos_recurso_tipo(tipo) || '.editar')
  );

drop policy if exists activos_update_retiro on public.activos;
create policy activos_update_retiro on public.activos
  for update to authenticated
  using (
    estado <> 'retirado'
    and has_permission('activos.' || public.activos_recurso_tipo(tipo) || '.eliminar')
  )
  with check (
    estado = 'retirado'
    and has_permission('activos.' || public.activos_recurso_tipo(tipo) || '.eliminar')
  );

-- ---------------------------------------------------------------------------
-- Corregir bypass de super admin en has_permission (AUTH_SUPER_ADMIN)
-- ---------------------------------------------------------------------------
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
        and r.codigo = 'AUTH_SUPER_ADMIN'
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