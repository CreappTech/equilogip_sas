-- ============================================================================
-- Módulo de Operaciones (FASE 1): tablas del dominio de actividades operativas.
-- Entidad transaccional principal: operacion_actividades (una sesión de trabajo
-- de un operador con un equipo en un centro de servicio). Bitácora en
-- operacion_eventos. Catálogo nuevo causales_pausa.
-- Patrón RLS: autorización por permiso (operaciones.*), igual que activos/
-- empleados. "Finalizar" es un cambio de estado, no DELETE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1.1 Catálogo causales_pausa (+ seed de causales comunes) + RLS de lectura
-- ---------------------------------------------------------------------------
create table public.causales_pausa (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  descripcion text,
  activo      boolean not null default true,
  orden       integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.causales_pausa enable row level security;

comment on table public.causales_pausa is
  'Catálogo de causales de pausa (novedades/limitaciones) de las actividades operativas.';

create policy causales_pausa_select_auth on public.causales_pausa
  for select to authenticated
  using (public.has_permission('operaciones.actividades.ver'::text) or
         public.has_permission('operaciones.actividades.pausar'::text));

insert into public.causales_pausa (orden, nombre, descripcion) values
  (1, 'Falla mecánica',          'Avería o daño en el equipo (ej. llanta, motor, etc.)'),
  (2, 'Falta de material',       'Espera de insumos, repuestos o material de trabajo'),
  (3, 'Condiciones climáticas',  'Interrupción por lluvia, viento u otra condición del clima'),
  (4, 'Descanso / Almuerzo',     'Pausa por descanso del operador (almuerzo, refrigerio)'),
  (5, 'Cambio de turno',         'Transición entre turnos de operadores'),
  (6, 'Mantenimiento programado','Parada programada por mantenimiento del equipo'),
  (7, 'Otra',                    'Cualquier otra causal no contemplada')
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------------
-- 1.2 Tabla operacion_actividades
-- ---------------------------------------------------------------------------
create table public.operacion_actividades (
  id                 uuid primary key default gen_random_uuid(),
  activo_id          uuid not null references public.activos(id) on delete restrict,
  operador_id        uuid not null references public.empleados(id) on delete restrict,
  centro_servicio_id uuid not null references public.centros_servicio(id) on delete restrict,
  tipo_actividad_id  uuid not null references public.tipos_actividad(id) on delete restrict,
  cliente_id         uuid references public.clientes(id) on delete set null,
  estado             text not null default 'creada'
                     check (estado in ('creada', 'en_curso', 'pausada', 'finalizada')),
  creado_por         uuid not null references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.operacion_actividades enable row level security;

comment on table public.operacion_actividades is
  'Sesión de trabajo de un operador con un equipo. Ciclo de vida: creada -> en_curso <-> pausada -> finalizada. Solo una actividad abierta por activo.';

-- Constraint: una sola actividad abierta por activo (creada/en_curso/pausada)
create unique index uq_operacion_actividades_activo_abierta
  on public.operacion_actividades (activo_id)
  where estado in ('creada', 'en_curso', 'pausada');

create index idx_operacion_actividades_activo  on public.operacion_actividades (activo_id);
create index idx_operacion_actividades_estado  on public.operacion_actividades (estado);
create index idx_operacion_actividades_created on public.operacion_actividades (created_at desc);
create index idx_operacion_actividades_operador  on public.operacion_actividades (operador_id);
create index idx_operacion_actividades_centro    on public.operacion_actividades (centro_servicio_id);
create index idx_operacion_actividades_tipo_act  on public.operacion_actividades (tipo_actividad_id);
create index idx_operacion_actividades_cliente   on public.operacion_actividades (cliente_id);
create index idx_operacion_actividades_creado_por on public.operacion_actividades (creado_por);

create trigger trg_operacion_actividades_updated_at
  before update on public.operacion_actividades
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 1.3 Tabla operacion_eventos (bitácora)
-- ---------------------------------------------------------------------------
create table public.operacion_eventos (
  id              uuid primary key default gen_random_uuid(),
  actividad_id    uuid not null references public.operacion_actividades(id) on delete cascade,
  tipo_evento     text not null
                  check (tipo_evento in ('inicio', 'pausa', 'reanudacion', 'fin')),
  fecha_hora      timestamptz not null default now(),
  causal_id       uuid references public.causales_pausa(id) on delete restrict,
  observaciones   text,
  registrado_por  uuid not null references public.profiles(id),
  created_at      timestamptz not null default now()
);

alter table public.operacion_eventos enable row level security;

comment on table public.operacion_eventos is
  'Bitácora de eventos de una actividad operativa. causal_id y observaciones son obligatorios solo cuando tipo_evento = pausa.';

-- Constraint condicional: causal y observaciones obligatorias solo en pausa
alter table public.operacion_eventos
  add constraint operacion_eventos_pausa_obligatoria_check
  check (
    (tipo_evento = 'pausa' and causal_id is not null)
    or
    (tipo_evento <> 'pausa' and causal_id is null)
  );

alter table public.operacion_eventos
  add constraint operacion_eventos_pausa_obs_check
  check (
    (tipo_evento = 'pausa' and observaciones is not null and btrim(observaciones) <> '')
    or
    (tipo_evento <> 'pausa')
  );

create index idx_operacion_eventos_actividad on public.operacion_eventos (actividad_id, fecha_hora);
create index idx_operacion_eventos_causal on public.operacion_eventos (causal_id);
create index idx_operacion_eventos_registrado_por on public.operacion_eventos (registrado_por);

-- ---------------------------------------------------------------------------
-- RLS operacion_actividades
-- ---------------------------------------------------------------------------
create policy operacion_actividades_select_auth on public.operacion_actividades
  for select to authenticated
  using (public.has_permission('operaciones.actividades.ver'::text));

create policy operacion_actividades_insert_auth on public.operacion_actividades
  for insert to authenticated
  with check (public.has_permission('operaciones.actividades.crear'::text));

-- Cambio de estado generado por las acciones del cuadro de control (no por la UI
-- de edición de datos). Se concede a quien pueda iniciar/pausar/reanudar/finalizar.
create policy operacion_actividades_update_estado on public.operacion_actividades
  for update to authenticated
  using (
    public.has_permission('operaciones.actividades.iniciar'::text) or
    public.has_permission('operaciones.actividades.pausar'::text) or
    public.has_permission('operaciones.actividades.reanudar'::text) or
    public.has_permission('operaciones.actividades.finalizar'::text)
  )
  with check (
    public.has_permission('operaciones.actividades.iniciar'::text) or
    public.has_permission('operaciones.actividades.pausar'::text) or
    public.has_permission('operaciones.actividades.reanudar'::text) or
    public.has_permission('operaciones.actividades.finalizar'::text)
  );

-- ---------------------------------------------------------------------------
-- RLS operacion_eventos
-- ---------------------------------------------------------------------------
create policy operacion_eventos_select_auth on public.operacion_eventos
  for select to authenticated
  using (public.has_permission('operaciones.actividades.ver'::text));

create policy operacion_eventos_insert_auth on public.operacion_eventos
  for insert to authenticated
  with check (public.has_permission('operaciones.actividades.iniciar'::text) or
              public.has_permission('operaciones.actividades.pausar'::text) or
              public.has_permission('operaciones.actividades.reanudar'::text) or
              public.has_permission('operaciones.actividades.finalizar'::text));
