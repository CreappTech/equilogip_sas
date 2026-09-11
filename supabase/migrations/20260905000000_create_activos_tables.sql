-- =============================================================================
-- FASE 4: Tablas del módulo de activos
-- Especialización por tabla (CONSTITUTION §2.2): activos (base) + una tabla
-- por tipo (vehiculos, maquinas, equipos) con FK 1:1 a activos.id.
--
-- Reglas de negocio:
--   * "Eliminar" un activo = cambio de estado a 'retirado' (nunca DELETE).
--     No existen policies de DELETE → el DELETE queda bloqueado por RLS.
--   * El retiro solo lo puede ejecutar quien tenga el permiso
--     activos.<tipo>.eliminar; editar no puede fijar 'retirado'.
--   * Un activo retirado es terminal: ninguna política permite volver a
--     'activo'/'inactivo'.
--   * La especialidad (vehiculos/maquinas/equipos) debe coincidir con el
--     valor de activos.tipo (trigger de consistencia).
--   * Todos los permisos se evaluan con public.has_permission (Fase 3).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trigger genérico de updated_at (se anexa a activos)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- TABLA BASE: activos
-- ---------------------------------------------------------------------------
create table public.activos (
  id                uuid primary key default gen_random_uuid(),
  tipo              text not null check (tipo in ('vehiculo', 'maquina', 'equipo')),
  codigo_interno    text not null unique,
  nombre            text not null,
  estado            text not null default 'activo' check (estado in ('activo', 'inactivo', 'retirado')),
  fecha_adquisicion date,
  created_at        timestamp with time zone not null default now(),
  updated_at        timestamp with time zone not null default now()
);

create index idx_activos_tipo on public.activos (tipo);
create index idx_activos_estado on public.activos (estado);

create trigger trg_activos_updated_at
  before update on public.activos
  for each row execute function public.set_updated_at();

-- El tipo se fija al crear (no se puede re-clasificar un activo)
create or replace function public.activos_tipo_inmutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo is distinct from old.tipo then
    raise exception 'El tipo de un activo no puede cambiarse';
  end if;
  return new;
end;
$$;

create trigger trg_activos_tipo_inmutable
  before update on public.activos
  for each row execute function public.activos_tipo_inmutable();

alter table public.activos enable row level security;

-- ---------------------------------------------------------------------------
-- TABLAS ESPECIALIZADAS (1:1 con activos.id)
-- ---------------------------------------------------------------------------
create table public.vehiculos (
  activo_id   uuid primary key references public.activos(id) on delete restrict,
  placa       text not null unique,
  marca       text,
  modelo      text,
  anio        integer
);

create table public.maquinas (
  activo_id   uuid primary key references public.activos(id) on delete restrict,
  marca       text,
  modelo      text,
  serie       text,
  anio        integer
);

create table public.equipos (
  activo_id   uuid primary key references public.activos(id) on delete restrict,
  marca       text,
  modelo      text,
  serie       text,
  anio        integer
);

alter table public.vehiculos enable row level security;
alter table public.maquinas enable row level security;
alter table public.equipos enable row level security;

-- ---------------------------------------------------------------------------
-- Trigger de consistencia tipo <-> especialidad
-- ---------------------------------------------------------------------------
create or replace function public.activos_verificar_tipo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo_esperado text;
begin
  case TG_TABLE_NAME
    when 'vehiculos' then v_tipo_esperado := 'vehiculo';
    when 'maquinas'  then v_tipo_esperado := 'maquina';
    when 'equipos'   then v_tipo_esperado := 'equipo';
    else raise exception 'Tabla de activo no soportada: %', TG_TABLE_NAME;
  end case;

  if not exists (
    select 1 from public.activos
    where id = new.activo_id and tipo = v_tipo_esperado
  ) then
    raise exception 'El activo % no existe o no es de tipo %', new.activo_id, v_tipo_esperado;
  end if;

  return new;
end;
$$;

create trigger trg_vehiculos_check_tipo
  before insert or update on public.vehiculos
  for each row execute function public.activos_verificar_tipo();

create trigger trg_maquinas_check_tipo
  before insert or update on public.maquinas
  for each row execute function public.activos_verificar_tipo();

create trigger trg_equipos_check_tipo
  before insert or update on public.equipos
  for each row execute function public.activos_verificar_tipo();

-- ---------------------------------------------------------------------------
-- RLS: activos (base)
-- ---------------------------------------------------------------------------
-- Lectura: cualquiera con activos.activos.ver o un permiso de tipo (*.ver)
drop policy if exists activos_select on public.activos;
create policy activos_select on public.activos
  for select to authenticated
  using (
    has_permission('activos.activos.ver')
    or has_permission('activos.vehiculos.ver')
    or has_permission('activos.maquinas.ver')
    or has_permission('activos.equipos.ver')
  );

-- Inserción: requiere el permiso de creación del tipo indicado
-- (en WITH CHECK, las columnas corresponden a la fila nueva)
drop policy if exists activos_insert on public.activos;
create policy activos_insert on public.activos
  for insert to authenticated
  with check (has_permission('activos.' || tipo || '.crear'));

-- Edición de datos (la fila existente se evalúa en USING, la nueva en
-- WITH CHECK). No puede fijar 'retirado': eso exige activos.<tipo>.eliminar.
drop policy if exists activos_update_datos on public.activos;
create policy activos_update_datos on public.activos
  for update to authenticated
  using (
    estado <> 'retirado'
    and has_permission('activos.' || tipo || '.editar')
  )
  with check (
    estado in ('activo', 'inactivo')
    and has_permission('activos.' || tipo || '.editar')
  );

-- Retiro: solo quien tenga activos.<tipo>.eliminar; un activo retirado no
-- puede volver a editarse (USING exige que la fila existente no sea 'retirado')
drop policy if exists activos_update_retiro on public.activos;
create policy activos_update_retiro on public.activos
  for update to authenticated
  using (
    estado <> 'retirado'
    and has_permission('activos.' || tipo || '.eliminar')
  )
  with check (
    estado = 'retirado'
    and has_permission('activos.' || tipo || '.eliminar')
  );

-- ---------------------------------------------------------------------------
-- RLS: vehiculos
-- ---------------------------------------------------------------------------
drop policy if exists vehiculos_select on public.vehiculos;
create policy vehiculos_select on public.vehiculos
  for select to authenticated
  using (has_permission('activos.vehiculos.ver'));

drop policy if exists vehiculos_insert on public.vehiculos;
create policy vehiculos_insert on public.vehiculos
  for insert to authenticated
  with check (has_permission('activos.vehiculos.crear'));

drop policy if exists vehiculos_update on public.vehiculos;
create policy vehiculos_update on public.vehiculos
  for update to authenticated
  using (has_permission('activos.vehiculos.editar'))
  with check (has_permission('activos.vehiculos.editar'));

-- ---------------------------------------------------------------------------
-- RLS: maquinas
-- ---------------------------------------------------------------------------
drop policy if exists maquinas_select on public.maquinas;
create policy maquinas_select on public.maquinas
  for select to authenticated
  using (has_permission('activos.maquinas.ver'));

drop policy if exists maquinas_insert on public.maquinas;
create policy maquinas_insert on public.maquinas
  for insert to authenticated
  with check (has_permission('activos.maquinas.crear'));

drop policy if exists maquinas_update on public.maquinas;
create policy maquinas_update on public.maquinas
  for update to authenticated
  using (has_permission('activos.maquinas.editar'))
  with check (has_permission('activos.maquinas.editar'));

-- ---------------------------------------------------------------------------
-- RLS: equipos
-- ---------------------------------------------------------------------------
drop policy if exists equipos_select on public.equipos;
create policy equipos_select on public.equipos
  for select to authenticated
  using (has_permission('activos.equipos.ver'));

drop policy if exists equipos_insert on public.equipos;
create policy equipos_insert on public.equipos
  for insert to authenticated
  with check (has_permission('activos.equipos.crear'));

drop policy if exists equipos_update on public.equipos;
create policy equipos_update on public.equipos
  for update to authenticated
  using (has_permission('activos.equipos.editar'))
  with check (has_permission('activos.equipos.editar'));

-- ---------------------------------------------------------------------------
-- Acceso a las funciones helper (solo autenticado / servicio, nunca anon)
-- ---------------------------------------------------------------------------
revoke execute on function public.set_updated_at() from public, anon;
revoke execute on function public.activos_verificar_tipo() from public, anon;
revoke execute on function public.activos_tipo_inmutable() from public, anon;