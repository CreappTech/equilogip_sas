-- ============================================================================
-- Dotación — entrega de dotación a empleados con evidencia y firma del receptor.
--
-- Modelo (decisión tomada según requerimiento):
--   * entregas_dotacion            → encabezado (empleado, fecha, tipo, quien
--                                     entrega, observaciones, firma, evidencias).
--   * entregas_dotacion_detalle    → líneas del encabezado (descripción libre,
--                                     cantidad, talla opcional).
--
-- Reglas:
--   * 'anulada' es terminal (nunca DELETE físico), mismo estándar que activos
--     y empleados. La evidencia y la firma quedan para auditoría aunque la
--     entrega se anule.
--   * La escritura de cabecera + líneas es transaccional vía RPC
--     (registrar_entrega_dotacion / actualizar_entrega_dotacion): nunca queda
--     una entrega parcialmente registrada.
--   * `firma_path` (PNG) y `evidencia_paths` (JPG/PNG/WEBP/PDF) viven en el
--     bucket privado dotacion-evidencias.
-- ============================================================================

create table public.entregas_dotacion (
  id               uuid primary key default gen_random_uuid(),
  empleado_id      uuid not null references public.empleados(id) on delete restrict,
  fecha_entrega    date not null,
  tipo_entrega     text not null default 'inicial'
                   check (tipo_entrega in ('inicial', 'renovacion', 'reposicion')),
  entregado_por    text not null,
  observaciones    text,
  evidencia_paths  text[] not null default '{}',
  firma_path       text not null,
  estado           text not null default 'entregada'
                   check (estado in ('entregada', 'anulada')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.entregas_dotacion_detalle (
  id          uuid primary key default gen_random_uuid(),
  entrega_id  uuid not null references public.entregas_dotacion(id) on delete cascade,
  descripcion text not null,
  cantidad    int  not null check (cantidad > 0),
  talla       text,
  created_at  timestamptz not null default now()
);

alter table public.entregas_dotacion enable row level security;
alter table public.entregas_dotacion_detalle enable row level security;

comment on table public.entregas_dotacion is
  'Entrega de dotación a un empleado. La anulación es un cambio de estado (nunca DELETE); la evidencia y la firma se conservan para auditoría.';
comment on table public.entregas_dotacion_detalle is
  'Líneas de una entrega de dotación (descripción libre, cantidad y talla opcional). Solo se escriben vía RPC transaccional.';

create index idx_entregas_dotacion_empleado_id    on public.entregas_dotacion (empleado_id);
create index idx_entregas_dotacion_fecha_entrega  on public.entregas_dotacion (fecha_entrega);
create index idx_entregas_dotacion_estado         on public.entregas_dotacion (estado);
create index idx_entregas_dotacion_detalle_entrega on public.entregas_dotacion_detalle (entrega_id);

create trigger trg_entregas_dotacion_updated_at
  before update on public.entregas_dotacion
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS cabecera — autorización por permiso (AGENTS §10, §12).
-- ---------------------------------------------------------------------------
create policy entregas_dotacion_select on public.entregas_dotacion
  for select to authenticated
  using (public.has_permission('dotacion.entregas.ver'::text));

create policy entregas_dotacion_insert on public.entregas_dotacion
  for insert to authenticated
  with check (
    public.has_permission('dotacion.entregas.crear'::text)
    and estado = 'entregada'
  );

create policy entregas_dotacion_update_datos on public.entregas_dotacion
  for update to authenticated
  using (
    public.has_permission('dotacion.entregas.editar'::text)
    and estado <> 'anulada'
  )
  with check (
    public.has_permission('dotacion.entregas.editar'::text)
    and estado = 'entregada'
  );

create policy entregas_dotacion_update_anulacion on public.entregas_dotacion
  for update to authenticated
  using (
    public.has_permission('dotacion.entregas.eliminar'::text)
    and estado = 'entregada'
  )
  with check (
    public.has_permission('dotacion.entregas.eliminar'::text)
    and estado = 'anulada'
  );

-- ---------------------------------------------------------------------------
-- RLS detalle — la escritura la ejecuta el RPC (security invoker, por eso se
-- requieren policies de insert/update/delete alineadas con el permiso).
-- ---------------------------------------------------------------------------
create policy entregas_dotacion_detalle_select on public.entregas_dotacion_detalle
  for select to authenticated
  using (public.has_permission('dotacion.entregas.ver'::text));

create policy entregas_dotacion_detalle_insert on public.entregas_dotacion_detalle
  for insert to authenticated
  with check (
    public.has_permission('dotacion.entregas.crear'::text)
    or public.has_permission('dotacion.entregas.editar'::text)
  );

create policy entregas_dotacion_detalle_update on public.entregas_dotacion_detalle
  for update to authenticated
  using (public.has_permission('dotacion.entregas.editar'::text))
  with check (public.has_permission('dotacion.entregas.editar'::text));

create policy entregas_dotacion_detalle_delete on public.entregas_dotacion_detalle
  for delete to authenticated
  using (
    public.has_permission('dotacion.entregas.crear'::text)
    or public.has_permission('dotacion.entregas.editar'::text)
  );

-- ---------------------------------------------------------------------------
-- RPC registrar entrega — cabecera + líneas en UNA transacción.
-- security invoker: las policies RLS de ambas tablas se evalúan con los
-- permisos del usuario final (mismo patrón que operaciones_registrar_evento).
-- ---------------------------------------------------------------------------
create or replace function public.registrar_entrega_dotacion(
  p_empleado_id     uuid,
  p_fecha_entrega   date,
  p_tipo_entrega    text,
  p_entregado_por   text,
  p_observaciones   text,
  p_evidencia_paths text[],
  p_firma_path      text,
  p_lineas          jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_entrega_id uuid;
  v_linea      jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.'
      using errcode = '42501';
  end if;

  if not public.has_permission('dotacion.entregas.crear'::text) then
    raise exception 'No tienes permiso para registrar entregas de dotación.'
      using errcode = '42501';
  end if;

  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'La entrega debe tener al menos un elemento.'
      using errcode = 'P0001';
  end if;

  if p_firma_path is null or length(p_firma_path) = 0 then
    raise exception 'La firma del receptor es obligatoria.'
      using errcode = 'P0001';
  end if;

  insert into public.entregas_dotacion
    (empleado_id, fecha_entrega, tipo_entrega, entregado_por, observaciones,
     evidencia_paths, firma_path, estado)
  values
    (p_empleado_id, p_fecha_entrega, p_tipo_entrega, p_entregado_por,
     nullif(p_observaciones, ''), p_evidencia_paths, p_firma_path, 'entregada')
  returning id into v_entrega_id;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    insert into public.entregas_dotacion_detalle
      (entrega_id, descripcion, cantidad, talla)
    values
      (v_entrega_id,
       v_linea->>'descripcion',
       (v_linea->>'cantidad')::int,
       nullif(v_linea->>'talla', ''));
  end loop;

  return v_entrega_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC actualizar entrega — cabecera + reemplazo de líneas en UNA transacción.
-- La evidencia y la firma NO se tocan (son inmutables para auditoría).
-- ---------------------------------------------------------------------------
create or replace function public.actualizar_entrega_dotacion(
  p_entrega_id     uuid,
  p_empleado_id    uuid,
  p_fecha_entrega  date,
  p_tipo_entrega   text,
  p_entregado_por  text,
  p_observaciones  text,
  p_lineas         jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_estado text;
  v_linea  jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.'
      using errcode = '42501';
  end if;

  if not public.has_permission('dotacion.entregas.editar'::text) then
    raise exception 'No tienes permiso para editar entregas de dotación.'
      using errcode = '42501';
  end if;

  select estado into v_estado
  from public.entregas_dotacion
  where id = p_entrega_id
  for update;

  if not found then
    raise exception 'Entrega no encontrada.'
      using errcode = 'P0002';
  end if;

  if v_estado = 'anulada' then
    raise exception 'No se puede editar una entrega anulada.'
      using errcode = 'P0001';
  end if;

  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'La entrega debe tener al menos un elemento.'
      using errcode = 'P0001';
  end if;

  update public.entregas_dotacion
     set empleado_id    = p_empleado_id,
         fecha_entrega  = p_fecha_entrega,
         tipo_entrega   = p_tipo_entrega,
         entregado_por  = p_entregado_por,
         observaciones  = nullif(p_observaciones, '')
   where id = p_entrega_id;

  delete from public.entregas_dotacion_detalle
   where entrega_id = p_entrega_id;

  for v_linea in select * from jsonb_array_elements(p_lineas)
  loop
    insert into public.entregas_dotacion_detalle
      (entrega_id, descripcion, cantidad, talla)
    values
      (p_entrega_id,
       v_linea->>'descripcion',
       (v_linea->>'cantidad')::int,
       nullif(v_linea->>'talla', ''));
  end loop;
end;
$$;

revoke all on function public.registrar_entrega_dotacion(uuid, date, text, text, text, text[], text, jsonb) from public, anon, authenticated;
revoke all on function public.actualizar_entrega_dotacion(uuid, uuid, date, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_entrega_dotacion(uuid, date, text, text, text, text[], text, jsonb) to authenticated;
grant execute on function public.actualizar_entrega_dotacion(uuid, uuid, date, text, text, text, jsonb) to authenticated;

comment on function public.registrar_entrega_dotacion(uuid, date, text, text, text, text[], text, jsonb) is
  'Registra una entrega de dotación (cabecera + líneas) en una sola transacción. Valida permiso dotacion.entregas.crear, al menos una línea y la firma del receptor.';
comment on function public.actualizar_entrega_dotacion(uuid, uuid, date, text, text, text, jsonb) is
  'Actualiza cabecera y reemplaza las líneas de una entrega de dotación en una sola transacción. La evidencia y la firma quedan intactas.';