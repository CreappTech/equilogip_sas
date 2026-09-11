-- =============================================================================
-- FASE 4 (extensión): Formulario de flota replicando el módulo Flota de
-- "equilogip". Decisiones adoptadas (AGENTS §18, plan aprobado):
--   * Se mantienen las 3 categorías (vehiculo/maquina/equipo) y se agrega un
--     subtipo con los 6 tipos de equipo de equilogip que activa la ficha
--     técnica (datos_tecnicos JSONB).
--   * Ciclo de vida (activo/inactivo/retirado) se conserva; se agrega un
--     estado operativo (OPERATIVA/EN_MANTENIMIENTO/FUERA_DE_SERVICIO/ALQUILADA).
--   * Sede = centros_servicio (FK opcional en la base; obligatoria en el
--     formulario).
--   * origen PROPIA/SUBARRENDADA + tabla proveedores_subarriendo (proveedor
--     obligatorio si SUBARRENDADA).
--   * Ficha técnica (por subtipo) e información del fabricante en JSONB.
--   * "nombre" pasa a ser derivado de marca+modelo (columna nullable).
--   * serie pasa a ser columna canónica en activos (se elimina de maquinas y
--     equipos; tablas vacías hoy).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabla proveedores_subarriendo
-- ---------------------------------------------------------------------------
create table public.proveedores_subarriendo (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  telefono   text,
  email      text,
  direccion  text,
  activo     boolean not null default true,
  created_at timestamp with time zone not null default now()
);

alter table public.proveedores_subarriendo enable row level security;

create policy "proveedores_select_auth" on public.proveedores_subarriendo
  for select to authenticated
  using (public.has_permission('activos.*'::text));

create policy "proveedores_write_admin" on public.proveedores_subarriendo
  for all to authenticated
  using (public.has_permission('activos.activos.crear'::text))
  with check (public.has_permission('activos.activos.crear'::text));

-- ---------------------------------------------------------------------------
-- 2) Alter de activos: columnas nuevas del formulario de flota
-- ---------------------------------------------------------------------------
alter table public.activos
  alter column nombre drop not null,
  add column subtipo text check (subtipo in (
    'MOTOCICLETA', 'AUTOMOVIL', 'MONTACARGAS', 'CARGADOR_FRONTAL',
    'RETROEXCAVADORA', 'YALE_MANUAL'
  )),
  add column estado_operativo text not null default 'OPERATIVA' check (
    estado_operativo in ('OPERATIVA', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO', 'ALQUILADA')
  ),
  add column color text,
  add column numero_motor text,
  add column lectura_inicial numeric(12,2),
  add column serie text,
  add column origen text not null default 'PROPIA' check (origen in ('PROPIA', 'SUBARRENDADA')),
  add column centro_servicio_id uuid references public.centros_servicio(id) on delete set null,
  add column proveedor_id uuid references public.proveedores_subarriendo(id) on delete set null,
  add column datos_tecnicos jsonb not null default '{}'::jsonb,
  add column datos_fabricante jsonb not null default '{}'::jsonb;

alter table public.activos
  add constraint activos_proveedor_check check (
    (origen = 'SUBARRENDADA' and proveedor_id is not null)
    or (origen = 'PROPIA' and proveedor_id is null)
  );

create index idx_activos_estado_operativo on public.activos (estado_operativo);
create index idx_activos_centro_servicio on public.activos (centro_servicio_id);
create index idx_activos_proveedor on public.activos (proveedor_id);

-- serie pasa a ser canónico en activos
alter table public.maquinas drop column serie;
alter table public.equipos drop column serie;

-- ---------------------------------------------------------------------------
-- 3) Trigger: subtipo consistente con la categoría del activo
-- ---------------------------------------------------------------------------
create or replace function public.activos_verificar_subtipo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'vehiculo' and new.subtipo not in ('MOTOCICLETA', 'AUTOMOVIL') then
    raise exception 'El subtipo no corresponde a la categoría de vehículos';
  end if;
  if new.tipo = 'maquina' and new.subtipo not in ('MONTACARGAS', 'CARGADOR_FRONTAL', 'RETROEXCAVADORA') then
    raise exception 'El subtipo no corresponde a la categoría de maquinaria';
  end if;
  if new.tipo = 'equipo' and new.subtipo <> 'YALE_MANUAL' then
    raise exception 'El subtipo no corresponde a la categoría de equipos';
  end if;
  return new;
end;
$$;

create trigger trg_activos_verificar_subtipo
  before insert or update on public.activos
  for each row execute function public.activos_verificar_subtipo();

-- El trigger no necesita ejecutarse vía RPC (PostgREST).
revoke execute on function public.activos_verificar_subtipo() from public, anon, authenticated;