-- =============================================================================
-- SNAPSHOT del estado actual de la base de datos.
-- Este archivo documenta TODAS las tablas, constraints, indices,
-- funciones y politicas RLS existentes en la DB al 2026-09-04.
--
-- Para un monorepo, la filosofia es "migracion = fuente de verdad".
-- Si en el futuro se necesitan migraciones individuales versionadas,
-- se puede dividir este archivo en migraciones cronologicas equivalentess
-- consultando el estado aqui documentado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUM: user_role
-- -----------------------------------------------------------------------------
create type user_role as enum (
  'superadmin',
  'administrador',
  'director_mantenimiento',
  'director_operaciones',
  'coordinador_mantenimiento',
  'coordinador_operaciones',
  'operario'
);

-- -----------------------------------------------------------------------------
-- TABLA: tenants
-- -----------------------------------------------------------------------------
create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  nit         text not null unique,
  direccion   text,
  telefono    text,
  email       text,
  logo_url    text,
  activo      boolean not null default true,
  created_at  timestamp with time zone not null default now()
);

-- -----------------------------------------------------------------------------
-- TABLA: profiles (1:1 con auth.users + datos de negocio)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key,
  tenant_id             uuid not null references public.tenants(id),
  numero_documento      text not null unique,
  nombres               text not null,
  apellidos             text not null,
  rol                   user_role not null,
  email_login           text not null unique,
  activo                boolean not null default true,
  creado_por            uuid references public.profiles(id),
  created_at            timestamp with time zone not null default now(),
  updated_at            timestamp with time zone not null default now(),
  telefono              text,
  estado                text not null default 'activo',
  fecha_ultimo_acceso   timestamp with time zone,
  updated_by            uuid references public.profiles(id)
);

alter table public.profiles enable row level security;

-- -----------------------------------------------------------------------------
-- TABLA: centros_servicio
-- -----------------------------------------------------------------------------
create table public.centros_servicio (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  nombre      text not null,
  activo      boolean not null default true,
  created_at  timestamp with time zone not null default now()
);

alter table public.centros_servicio enable row level security;

-- -----------------------------------------------------------------------------
-- TABLA: centros_costo
-- -----------------------------------------------------------------------------
create table public.centros_costo (
  id                  uuid primary key default gen_random_uuid(),
  centro_servicio_id  uuid not null references public.centros_servicio(id),
  nombre              text not null,
  activo              boolean not null default true,
  created_at          timestamp with time zone not null default now()
);

alter table public.centros_costo enable row level security;

-- -----------------------------------------------------------------------------
-- TABLA: sufijos
-- -----------------------------------------------------------------------------
create table public.sufijos (
  id                uuid primary key default gen_random_uuid(),
  centro_costo_id   uuid not null references public.centros_costo(id),
  nombre            text not null,
  activo            boolean not null default true,
  created_at        timestamp with time zone not null default now()
);

alter table public.sufijos enable row level security;

-- -----------------------------------------------------------------------------
-- TABLA: usuario_centros_servicio
-- -----------------------------------------------------------------------------
create table public.usuario_centros_servicio (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id),
  centro_servicio_id  uuid not null references public.centros_servicio(id),
  created_at          timestamp with time zone not null default now()
);

alter table public.usuario_centros_servicio enable row level security;

-- -----------------------------------------------------------------------------
-- TABLA: roles (roles RBAC)
-- -----------------------------------------------------------------------------
create table public.roles (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  codigo        text not null unique,
  descripcion   text,
  es_sistema    boolean not null default false,
  estado        text not null default 'activo',
  created_by    uuid references public.profiles(id),
  updated_by    uuid references public.profiles(id),
  created_at    timestamp with time zone not null default now(),
  updated_at    timestamp with time zone not null default now()
);

alter table public.roles enable row level security;

-- -----------------------------------------------------------------------------
-- TABLA: permisos (codigos de permisos RBAC)
-- Los codigos siguen la convencion: 'auth.<modulo>.<recurso>.<accion>'
-- -----------------------------------------------------------------------------
create table public.permisos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  codigo        text not null unique,
  descripcion   text,
  modulo        text not null,
  recurso       text not null,
  accion        text not null,
  estado        text not null default 'activo',
  created_at    timestamp with time zone not null default now(),
  updated_at    timestamp with time zone not null default now()
);

alter table public.permisos enable row level security;

-- -----------------------------------------------------------------------------
-- TABLA: usuarios_roles
-- -----------------------------------------------------------------------------
create table public.usuarios_roles (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.profiles(id),
  rol_id      uuid not null references public.roles(id),
  created_by  uuid references public.profiles(id),
  created_at  timestamp with time zone not null default now()
);

alter table public.usuarios_roles enable row level security;

-- -----------------------------------------------------------------------------
-- TABLA: roles_permisos
-- -----------------------------------------------------------------------------
create table public.roles_permisos (
  id          uuid primary key default gen_random_uuid(),
  rol_id      uuid not null references public.roles(id),
  permiso_id  uuid not null references public.permisos(id),
  created_by  uuid references public.profiles(id),
  created_at  timestamp with time zone not null default now()
);

alter table public.roles_permisos enable row level security;

-- -----------------------------------------------------------------------------
-- INDICES
-- -----------------------------------------------------------------------------
create unique index idx_centros_costo_centro_servicio on public.centros_costo (centro_servicio_id);
create unique index idx_centros_servicio_tenant on public.centros_servicio (tenant_id);
create unique index idx_permisos_codigo on public.permisos (codigo);
create unique index idx_permisos_modulo on public.permisos (modulo);
create unique index idx_profiles_documento on public.profiles (numero_documento);
create unique index idx_profiles_tenant on public.profiles (tenant_id);
create unique index idx_roles_codigo on public.roles (codigo);
create unique index idx_roles_permisos_permiso on public.roles_permisos (permiso_id);
create unique index idx_roles_permisos_rol on public.roles_permisos (rol_id);
create unique index uq_roles_permisos on public.roles_permisos (rol_id, permiso_id);
create unique index idx_sufijos_centro_costo on public.sufijos (centro_costo_id);
create unique index idx_ucs_centro on public.usuario_centros_servicio (centro_servicio_id);
create unique index idx_ucs_profile on public.usuario_centros_servicio (profile_id);
create unique index usuario_centros_servicio_profile_id_centro_servicio_id_key on public.usuario_centros_servicio (profile_id, centro_servicio_id);
create unique index idx_usuarios_roles_rol on public.usuarios_roles (rol_id);
create unique index idx_usuarios_roles_usuario on public.usuarios_roles (usuario_id);
create unique index uq_usuarios_roles on public.usuarios_roles (usuario_id, rol_id);

-- -----------------------------------------------------------------------------
-- FUNCIONES HELPER para RLS
-- -----------------------------------------------------------------------------
create or replace function public.auth_role()
returns user_role
language sql
security definer
stable
as $$
  SELECT rol FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

create or replace function public.auth_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

create or replace function public.auth_centros_servicio_ids()
returns uuid[]
language sql
security definer
stable
as $$
  SELECT coalesce(
    array(
      select ucs.centro_servicio_id
      from usuario_centros_servicio ucs
      where ucs.profile_id = auth.uid()
    ),
    '{}'::uuid[]
  );
$$;

create or replace function public.auth_tiene_permiso(p_permiso_codigo text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  SELECT EXISTS (
    SELECT 1
    FROM public.roles r
    JOIN public.usuarios_roles ur ON ur.rol_id = r.id
    WHERE ur.usuario_id = auth.uid()
      AND r.estado = 'activo'
      AND (
        r.codigo = 'AUTH_SUPER_ADMIN'
        OR EXISTS (
          SELECT 1
          FROM public.roles_permisos rp
          JOIN public.permisos p ON p.id = rp.permiso_id
          WHERE rp.rol_id = r.id
            AND p.estado = 'activo'
            AND p.codigo = p_permiso_codigo
        )
      )
  );
$$;

create or replace function public.auth_permisos()
returns table(codigo text)
language sql
security definer
stable
as $$
  SELECT DISTINCT p.codigo::text
  FROM public.roles r
  JOIN public.usuarios_roles ur ON ur.rol_id = r.id
  JOIN public.roles_permisos rp ON rp.rol_id = r.id
  JOIN public.permisos p ON p.id = rp.permiso_id
  WHERE ur.usuario_id = auth.uid()
    AND r.estado = 'activo'
    AND p.estado = 'activo'
  UNION
  SELECT '*'
  WHERE EXISTS (
    SELECT 1 FROM public.roles r
    JOIN public.usuarios_roles ur ON ur.rol_id = r.id
    WHERE ur.usuario_id = auth.uid() AND r.estado = 'activo' AND r.codigo = 'AUTH_SUPER_ADMIN'
  );
$$;

create or replace function public.auth_roles()
returns table(codigo text, nombre text)
language sql
security definer
stable
as $$
  SELECT r.codigo::text, r.nombre::text
  FROM public.roles r
  JOIN public.usuarios_roles ur ON ur.rol_id = r.id
  WHERE ur.usuario_id = auth.uid() AND r.estado = 'activo'
  ORDER BY r.nombre;
$$;

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
    or (
      select bool_or(p_permiso like replace(p2.codigo, '*', '%'))
      from unnest(array_agg(codigo)) as p2(codigo)
      where p2.codigo like '%.*'
    )
  from user_perms;
$$;

create or replace function public.get_login_email(p_documento text)
returns text
language sql
security definer
stable
as $$
  SELECT email_login FROM profiles WHERE numero_documento = p_documento AND activo = true LIMIT 1;
$$;

-- -----------------------------------------------------------------------------
-- RLS: tenants
-- -----------------------------------------------------------------------------
drop policy if exists tenants_select_own on tenants;
create policy tenants_select_own on tenants for select to authenticated
  using (id = auth_tenant_id());

-- -----------------------------------------------------------------------------
-- RLS: profiles
-- -----------------------------------------------------------------------------
drop policy if exists perfiles_insert_admin on profiles;
drop policy if exists perfiles_insert_autorizado on profiles;
drop policy if exists perfiles_select_tenant on profiles;
drop policy if exists perfiles_update_admin on profiles;
drop policy if exists perfiles_update_autorizado on profiles;

create policy perfiles_insert_admin on profiles for insert to authenticated
  with check ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and tenant_id = auth_tenant_id());

create policy perfiles_insert_autorizado on profiles for insert to authenticated
  with check ((tenant_id = auth_tenant_id()) and (auth_tiene_permiso('auth.usuarios.crear'::text) or (auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role]))));

create policy perfiles_select_tenant on profiles for select to authenticated
  using (tenant_id = auth_tenant_id());

create policy perfiles_update_admin on profiles for update to authenticated
  using ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and tenant_id = auth_tenant_id())
  with check ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and tenant_id = auth_tenant_id());

create policy perfiles_update_autorizado on profiles for update to authenticated
  using (((tenant_id = auth_tenant_id()) and (auth_tiene_permiso('auth.usuarios.editar'::text) or auth_tiene_permiso('auth.usuarios.estado'::text) or auth_tiene_permiso('auth.usuarios.roles'::text) or (auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])))) or (id = auth.uid()))
  with check (((tenant_id = auth_tenant_id()) and (auth_tiene_permiso('auth.usuarios.editar'::text) or auth_tiene_permiso('auth.usuarios.estado'::text) or auth_tiene_permiso('auth.usuarios.roles'::text) or (auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])))) or (id = auth.uid()));

-- -----------------------------------------------------------------------------
-- RLS: centros_servicio
-- -----------------------------------------------------------------------------
drop policy if exists centros_servicio_delete_admin on centros_servicio;
drop policy if exists centros_servicio_insert_admin on centros_servicio;
drop policy if exists centros_servicio_select on centros_servicio;
drop policy if exists centros_servicio_update_admin on centros_servicio;

create policy centros_servicio_delete_admin on centros_servicio for delete to authenticated
  using ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and tenant_id = auth_tenant_id());

create policy centros_servicio_insert_admin on centros_servicio for insert to authenticated
  with check ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and tenant_id = auth_tenant_id());

create policy centros_servicio_select on centros_servicio for select to authenticated
  using ((tenant_id = auth_tenant_id()) and ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) or (id = any (auth_centros_servicio_ids()))));

create policy centros_servicio_update_admin on centros_servicio for update to authenticated
  using ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and tenant_id = auth_tenant_id())
  with check ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and tenant_id = auth_tenant_id());

-- -----------------------------------------------------------------------------
-- RLS: centros_costo
-- -----------------------------------------------------------------------------
drop policy if exists centros_costo_delete_admin on centros_costo;
drop policy if exists centros_costo_insert_admin on centros_costo;
drop policy if exists centros_costo_select on centros_costo;
drop policy if exists centros_costo_update_admin on centros_costo;

create policy centros_costo_delete_admin on centros_costo for delete to authenticated
  using (centro_servicio_id in (select id from centros_servicio where tenant_id = auth_tenant_id() and auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])));

create policy centros_costo_insert_admin on centros_costo for insert to authenticated
  with check (centro_servicio_id in (select id from centros_servicio where tenant_id = auth_tenant_id() and auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])));

create policy centros_costo_select on centros_costo for select to authenticated
  using (centro_servicio_id in (select id from centros_servicio where tenant_id = auth_tenant_id() and ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) or (id = any (auth_centros_servicio_ids())))));

create policy centros_costo_update_admin on centros_costo for update to authenticated
  using (centro_servicio_id in (select id from centros_servicio where tenant_id = auth_tenant_id() and auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])))
  with check (centro_servicio_id in (select id from centros_servicio where tenant_id = auth_tenant_id() and auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])));

-- -----------------------------------------------------------------------------
-- RLS: sufijos
-- -----------------------------------------------------------------------------
drop policy if exists sufijos_delete_admin on sufijos;
drop policy if exists sufijos_insert_admin on sufijos;
drop policy if exists sufijos_select on sufijos;
drop policy if exists sufijos_update_admin on sufijos;

create policy sufijos_delete_admin on sufijos for delete to authenticated
  using (centro_costo_id in (select cc.id from centros_costo cc join centros_servicio cs on cs.id = cc.centro_servicio_id where cs.tenant_id = auth_tenant_id() and auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])));

create policy sufijos_insert_admin on sufijos for insert to authenticated
  with check (centro_costo_id in (select cc.id from centros_costo cc join centros_servicio cs on cs.id = cc.centro_servicio_id where cs.tenant_id = auth_tenant_id() and auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])));

create policy sufijos_select on sufijos for select to authenticated
  using (centro_costo_id in (select cc.id from centros_costo cc join centros_servicio cs on cs.id = cc.centro_servicio_id where cs.tenant_id = auth_tenant_id() and ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) or (cs.id = any (auth_centros_servicio_ids())))));

create policy sufijos_update_admin on sufijos for update to authenticated
  using (centro_costo_id in (select cc.id from centros_costo cc join centros_servicio cs on cs.id = cc.centro_servicio_id where cs.tenant_id = auth_tenant_id() and auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])))
  with check (centro_costo_id in (select cc.id from centros_costo cc join centros_servicio cs on cs.id = cc.centro_servicio_id where cs.tenant_id = auth_tenant_id() and auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])));

-- -----------------------------------------------------------------------------
-- RLS: usuario_centros_servicio
-- -----------------------------------------------------------------------------
drop policy if exists ucs_delete_admin on usuario_centros_servicio;
drop policy if exists ucs_insert_admin on usuario_centros_servicio;
drop policy if exists ucs_select_admin on usuario_centros_servicio;

create policy ucs_delete_admin on usuario_centros_servicio for delete to authenticated
  using ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and (profile_id in (select id from profiles where tenant_id = auth_tenant_id())));

create policy ucs_insert_admin on usuario_centros_servicio for insert to authenticated
  with check ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and (profile_id in (select id from profiles where tenant_id = auth_tenant_id())));

create policy ucs_select_admin on usuario_centros_servicio for select to authenticated
  using ((auth_role() = any (array['superadmin'::user_role, 'administrador'::user_role])) and (profile_id in (select id from profiles where tenant_id = auth_tenant_id())));

-- -----------------------------------------------------------------------------
-- RLS: roles
-- -----------------------------------------------------------------------------
drop policy if exists roles_insert_autorizado on roles;
drop policy if exists roles_select_autorizado on roles;
drop policy if exists roles_update_autorizado on roles;

create policy roles_insert_autorizado on roles for insert to authenticated
  with check (auth_tiene_permiso('auth.roles.crear'::text));

create policy roles_select_autorizado on roles for select to authenticated
  using (auth_tiene_permiso('auth.roles.ver'::text));

create policy roles_update_autorizado on roles for update to authenticated
  using (auth_tiene_permiso('auth.roles.editar'::text))
  with check (auth_tiene_permiso('auth.roles.editar'::text));

-- -----------------------------------------------------------------------------
-- RLS: permisos
-- -----------------------------------------------------------------------------
drop policy if exists permisos_select_autorizado on permisos;

create policy permisos_select_autorizado on permisos for select to authenticated
  using (auth_tiene_permiso('auth.roles.ver'::text) or auth_tiene_permiso('auth.roles.permisos'::text) or auth_tiene_permiso('auth.usuarios.roles'::text));

-- -----------------------------------------------------------------------------
-- RLS: roles_permisos
-- -----------------------------------------------------------------------------
drop policy if exists roles_permisos_delete_autorizado on roles_permisos;
drop policy if exists roles_permisos_insert_autorizado on roles_permisos;
drop policy if exists roles_permisos_select_autorizado on roles_permisos;
drop policy if exists roles_permisos_update_autorizado on roles_permisos;

create policy roles_permisos_delete_autorizado on roles_permisos for delete to authenticated
  using (auth_tiene_permiso('auth.roles.permisos'::text));

create policy roles_permisos_insert_autorizado on roles_permisos for insert to authenticated
  with check (auth_tiene_permiso('auth.roles.permisos'::text));

create policy roles_permisos_select_autorizado on roles_permisos for select to authenticated
  using (auth_tiene_permiso('auth.roles.ver'::text) or auth_tiene_permiso('auth.roles.permisos'::text));

create policy roles_permisos_update_autorizado on roles_permisos for update to authenticated
  using (auth_tiene_permiso('auth.roles.permisos'::text))
  with check (auth_tiene_permiso('auth.roles.permisos'::text));

-- -----------------------------------------------------------------------------
-- RLS: usuarios_roles
-- -----------------------------------------------------------------------------
drop policy if exists usuarios_roles_delete_autorizado on usuarios_roles;
drop policy if exists usuarios_roles_insert_autorizado on usuarios_roles;
drop policy if exists usuarios_roles_select_autorizado on usuarios_roles;
drop policy if exists usuarios_roles_update_autorizado on usuarios_roles;

create policy usuarios_roles_delete_autorizado on usuarios_roles for delete to authenticated
  using (auth_tiene_permiso('auth.usuarios.roles'::text));

create policy usuarios_roles_insert_autorizado on usuarios_roles for insert to authenticated
  with check (auth_tiene_permiso('auth.usuarios.roles'::text));

create policy usuarios_roles_select_autorizado on usuarios_roles for select to authenticated
  using (auth_tiene_permiso('auth.usuarios.ver'::text) or auth_tiene_permiso('auth.usuarios.roles'::text) or (usuario_id = auth.uid()));

create policy usuarios_roles_update_autorizado on usuarios_roles for update to authenticated
  using (auth_tiene_permiso('auth.usuarios.roles'::text))
  with check (auth_tiene_permiso('auth.usuarios.roles'::text));

-- -----------------------------------------------------------------------------
-- SEGURIDAD: revokes sobre funciones SECURITY DEFINER
-- Las funciones helper de auth (auth_*) son SECURITY DEFINER.
-- Han de ejecutarse solo como postgres, authenticated, o service_role.
-- -----------------------------------------------------------------------------
revoke execute on function public.has_permission(text) from public, anon;
revoke execute on function public.get_login_email(text) from public, anon;
