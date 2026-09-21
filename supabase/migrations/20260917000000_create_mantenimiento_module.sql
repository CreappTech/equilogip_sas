-- ============================================================================
-- Módulo de Mantenimiento e Inspección Preoperacional (FASE 6).
--
-- Modelo:
--   mantenimiento_categorias        las 5 categorías fijas del check preoperacional
--                                    (Electrónico, Mecánico, Hidráulico, Neumático,
--                                    Estructural) -> ejes del gráfico radar.
--   mantenimiento_preguntas         checkpoints con tipo_activo (vehiculo|maquina|ambos).
--   mantenimiento_rutinas           mantenimientos preventivos automáticos disparados
--                                    por umbral de kilometraje/horómetro al finalizar
--                                    una inspección.
--   mantenimiento_configuracion     fila única: tiempo mínimo estándar de inspección
--                                    (para alertar "inspección exprés").
--   mantenimiento_inspecciones      sesión de inspección de un operador (usuario
--                                    autenticado, profiles.id) sobre un activo.
--   mantenimiento_inspeccion_respuestas  respuesta por (inspeccion, pregunta).
--                                    "Malo" => justificación obligatoria.
--   mantenimiento_inspeccion_rutinas     rutinas disparadas al finalizar (alerta).
--   vw_mantenimiento_salud          puntajes por categoría por inspección (radar).
--
-- Puntaje del radar: Bueno suma +1, Malo resta -1, "No aplica" se excluye.
-- Porcentaje por categoría = max(0, buenos - malos) / (buenos + malos) * 100.
--
-- RLS: autorización por permiso (mantenimiento.*) + autolectura del operador
-- sobre sus propias inspecciones/borradores. Cero DELETE para respuestas.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Categorías (catálogo fijo + seed de las 5)
-- ---------------------------------------------------------------------------
create table public.mantenimiento_categorias (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  nombre      text not null,
  descripcion text,
  orden       integer not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.mantenimiento_categorias enable row level security;

comment on table public.mantenimiento_categorias is
  'Categorías del check preoperacional (ejes del radar). Se siembran las 5 fijas: electrónico, mecánico, hidráulico, neumático y estructural.';

insert into public.mantenimiento_categorias (codigo, nombre, descripcion, orden) values
  ('ELECTRONICO', 'Electrónico',    'Sistema eléctrico y electrónico (batería, luces, tablero, sensores, alarmas).',1),
  ('MECANICO',    'Mecánico',       'Componentes mecánicos (motor, transmisión, frenos, dirección, chasis).',            2),
  ('HIDRAULICO',  'Hidráulico',     'Sistema hidráulico (bomba, cilindros, mangueras, aceite hidráulico).',             3),
  ('NEUMATICO',   'Neumático',      'Sistema neumático y llantas (presión, aire, compresor, desgaste).',                4),
  ('ESTRUCTURAL', 'Estructural',    'Carrocería, estructura, guardas y elementos de seguridad estructural.',            5)
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Preguntas del check preoperacional
-- ---------------------------------------------------------------------------
create table public.mantenimiento_preguntas (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.mantenimiento_categorias(id) on delete restrict,
  tipo_activo  text not null check (tipo_activo in ('vehiculo', 'maquina', 'ambos')),
  texto        text not null,
  orden        integer not null default 0,
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.mantenimiento_preguntas enable row level security;

comment on table public.mantenimiento_preguntas is
  'Checkpoints del preoperacional. tipo_activo filtra qué preguntas aplican según el tipo del activo (vehiculo, maquina o ambos).';

create index idx_mantenimiento_preguntas_categoria on public.mantenimiento_preguntas (categoria_id);
create index idx_mantenimiento_preguntas_tipo     on public.mantenimiento_preguntas (tipo_activo);
create index idx_mantenimiento_preguntas_activo   on public.mantenimiento_preguntas (activo, orden);

create trigger trg_mantenimiento_preguntas_updated_at
  before update on public.mantenimiento_preguntas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Rutinas de mantenimiento preventivo (umbral por kilometraje/horómetro)
-- ---------------------------------------------------------------------------
create table public.mantenimiento_rutinas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  descripcion text,
  tipo_activo text not null check (tipo_activo in ('vehiculo', 'maquina', 'ambos')),
  subtipo     text,
  unidad      text not null check (unidad in ('kilometraje', 'horometro')),
  umbral      integer not null check (umbral > 0),
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.mantenimiento_rutinas enable row level security;

comment on table public.mantenimiento_rutinas is
  'Mantenimiento preventivo disparado automáticamente cuando la lectura (km/horómetro) de una inspección supera el umbral. subtipo restringe a un equipo si aplica; null = todos.';

create index idx_mantenimiento_rutinas_tipo   on public.mantenimiento_rutinas (tipo_activo, activo);
create index idx_mantenimiento_rutinas_umbral on public.mantenimiento_rutinas (unidad, umbral);

create trigger trg_mantenimiento_rutinas_updated_at
  before update on public.mantenimiento_rutinas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Configuración (fila única)
-- ---------------------------------------------------------------------------
create table public.mantenimiento_configuracion (
  id                     uuid primary key default gen_random_uuid(),
  tiempo_minimo_segundos integer not null default 120 check (tiempo_minimo_segundos > 0),
  updated_by             uuid references public.profiles(id) on delete set null,
  updated_at             timestamptz not null default now()
);

alter table public.mantenimiento_configuracion enable row level security;

comment on table public.mantenimiento_configuracion is
  'Configuración global del módulo. Fila única. tiempo_minimo_segundos: si una inspección se finaliza en menos tiempo se marca exprés.';

insert into public.mantenimiento_configuracion (id, tiempo_minimo_segundos)
values ('00000000-0000-4000-8000-000000000001', 120)
on conflict (id) do nothing;

create trigger trg_mantenimiento_configuracion_updated_at
  before update on public.mantenimiento_configuracion
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Inspecciones (entidad transaccional)
-- ---------------------------------------------------------------------------
create table public.mantenimiento_inspecciones (
  id                              uuid primary key default gen_random_uuid(),
  activo_id                       uuid not null references public.activos(id) on delete restrict,
  operador_id                     uuid not null references public.profiles(id) on delete restrict,
  lectura                         integer not null check (lectura >= 0),
  lectura_unidad                  text not null check (lectura_unidad in ('kilometraje', 'horometro')),
  nivel_combustible               text not null check (nivel_combustible in ('VACIO', '1/4', '1/2', '3/4', 'LLENO')),
  nivel_aceite                    text not null check (nivel_aceite in ('MIN', 'MEDIO', 'MAX')),
  estado                          text not null default 'borrador' check (estado in ('borrador', 'completada')),
  iniciada_en                     timestamptz not null default now(),
  finalizada_en                   timestamptz,
  tiempo_segundos                 integer,
  es_express                      boolean not null default false,
  tiempo_minimo_segundos_aplicado integer,
  puntajes                        jsonb not null default '{}',
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

alter table public.mantenimiento_inspecciones enable row level security;

comment on table public.mantenimiento_inspecciones is
  'Inspección preoperacional de un operador (perfil) sobre un activo. Ciclo: borrador -> completada. puntajes = {CODIGO_CATEGORIA: {bueno, malo, no_aplica, aplica, puntaje, porcentaje}}.';

-- Un único borrador por operador: el flujo reanuda o descarta el anterior.
create unique index uq_mantenimiento_inspecciones_operador_borrador
  on public.mantenimiento_inspecciones (operador_id)
  where estado = 'borrador';

create index idx_mantenimiento_inspecciones_activo   on public.mantenimiento_inspecciones (activo_id);
create index idx_mantenimiento_inspecciones_estado   on public.mantenimiento_inspecciones (estado);
create index idx_mantenimiento_inspecciones_created  on public.mantenimiento_inspecciones (created_at desc);

create trigger trg_mantenimiento_inspecciones_updated_at
  before update on public.mantenimiento_inspecciones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Respuestas por pregunta
-- ---------------------------------------------------------------------------
create table public.mantenimiento_inspeccion_respuestas (
  id            uuid primary key default gen_random_uuid(),
  inspeccion_id uuid not null references public.mantenimiento_inspecciones(id) on delete cascade,
  pregunta_id   uuid not null references public.mantenimiento_preguntas(id) on delete restrict,
  respuesta     text not null check (respuesta in ('bueno', 'malo', 'no_aplica')),
  justificacion text,
  foto_path     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.mantenimiento_inspeccion_respuestas enable row level security;

comment on table public.mantenimiento_inspeccion_respuestas is
  'Respuesta del operador a cada pregunta. Malo => justificación obligatoria (texto y/o foto). Sin DELETE.';

create unique index uq_mantenimiento_respuesta_pregunta
  on public.mantenimiento_inspeccion_respuestas (inspeccion_id, pregunta_id);

create index idx_mantenimiento_respuestas_pregunta on public.mantenimiento_inspeccion_respuestas (pregunta_id);

alter table public.mantenimiento_inspeccion_respuestas
  add constraint mantenimiento_respuesta_malo_justificacion_check
  check (
    (respuesta = 'malo' and justificacion is not null and btrim(justificacion) <> '')
    or
    (respuesta <> 'malo')
  );

create trigger trg_mantenimiento_respuestas_updated_at
  before update on public.mantenimiento_inspeccion_respuestas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Rutinas disparadas por inspección (alerta de preventivo)
-- ---------------------------------------------------------------------------
create table public.mantenimiento_inspeccion_rutinas (
  inspeccion_id   uuid not null references public.mantenimiento_inspecciones(id) on delete cascade,
  rutina_id       uuid not null references public.mantenimiento_rutinas(id) on delete restrict,
  umbral_superado boolean not null default true,
  created_at      timestamptz not null default now(),
  primary key (inspeccion_id, rutina_id)
);

alter table public.mantenimiento_inspeccion_rutinas enable row level security;

comment on table public.mantenimiento_inspeccion_rutinas is
  'Rutinas de mantenimiento disparadas al finalizar una inspección (lectura >= umbral). Solo se inserta desde la acción de finalización (service role).';

-- ---------------------------------------------------------------------------
-- 8. Vista de salud por categoría (radar) — invoker = respeta RLS
-- ---------------------------------------------------------------------------
create or replace view public.vw_mantenimiento_salud
with (security_invoker = true) as
select
  r.inspeccion_id,
  i.activo_id,
  c.codigo                                                                  as categoria_codigo,
  c.nombre                                                                  as categoria_nombre,
  count(*) filter (where r.respuesta = 'bueno')                             as bueno,
  count(*) filter (where r.respuesta = 'malo')                              as malo,
  count(*) filter (where r.respuesta = 'no_aplica')                         as no_aplica,
  count(*) filter (where r.respuesta in ('bueno', 'malo'))                  as aplica,
  count(*) filter (where r.respuesta = 'bueno')
    - count(*) filter (where r.respuesta = 'malo')                          as puntaje,
  case
    when count(*) filter (where r.respuesta in ('bueno', 'malo')) > 0 then
      round(
        greatest(0,
          count(*) filter (where r.respuesta = 'bueno')
            - count(*) filter (where r.respuesta = 'malo')
        )::numeric
        / count(*) filter (where r.respuesta in ('bueno', 'malo'))
        * 100
      )
    else null
  end                                                                       as porcentaje
from public.mantenimiento_inspeccion_respuestas r
join public.mantenimiento_inspecciones i on i.id = r.inspeccion_id
join public.mantenimiento_preguntas  p on p.id = r.pregunta_id
join public.mantenimiento_categorias c on c.id = p.categoria_id
group by r.inspeccion_id, i.activo_id, c.codigo, c.nombre;

comment on view public.vw_mantenimiento_salud is
  'Puntajes por categoría (radar) por inspección. Nulo = sin respuestas que apliquen.';

-- ---------------------------------------------------------------------------
-- 9. Permisos del módulo (convención modulo.recurso.accion)
-- ---------------------------------------------------------------------------
insert into public.permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado)
values
  ('a1b2c3d4-0010-4000-8000-000000000000', 'Ver categorías',           'mantenimiento.categorias.ver',          'Ver las categorías del check preoperacional',              'mantenimiento', 'categorias',    'ver',       'activo'),
  ('a1b2c3d4-0010-4000-8000-000000000001', 'Crear categorías',         'mantenimiento.categorias.crear',        'Crear una categoría de check',                             'mantenimiento', 'categorias',    'crear',     'activo'),
  ('a1b2c3d4-0010-4000-8000-000000000002', 'Editar categorías',        'mantenimiento.categorias.editar',       'Editar una categoría',                                     'mantenimiento', 'categorias',    'editar',    'activo'),
  ('a1b2c3d4-0010-4000-8000-000000000003', 'Eliminar categorías',      'mantenimiento.categorias.eliminar',     'Retirar una categoría (no DELETE)',                        'mantenimiento', 'categorias',    'eliminar',  'activo'),
  ('a1b2c3d4-0011-4000-8000-000000000000', 'Ver preguntas',            'mantenimiento.preguntas.ver',           'Ver preguntas del check preoperacional',                   'mantenimiento', 'preguntas',     'ver',       'activo'),
  ('a1b2c3d4-0011-4000-8000-000000000001', 'Crear preguntas',          'mantenimiento.preguntas.crear',         'Crear una pregunta del check',                             'mantenimiento', 'preguntas',     'crear',     'activo'),
  ('a1b2c3d4-0011-4000-8000-000000000002', 'Editar preguntas',         'mantenimiento.preguntas.editar',        'Editar una pregunta',                                      'mantenimiento', 'preguntas',     'editar',    'activo'),
  ('a1b2c3d4-0011-4000-8000-000000000003', 'Eliminar preguntas',       'mantenimiento.preguntas.eliminar',      'Retirar una pregunta (no DELETE)',                         'mantenimiento', 'preguntas',     'eliminar',  'activo'),
  ('a1b2c3d4-0012-4000-8000-000000000000', 'Ver rutinas',              'mantenimiento.rutinas.ver',             'Ver rutinas de mantenimiento preventivo',                  'mantenimiento', 'rutinas',       'ver',       'activo'),
  ('a1b2c3d4-0012-4000-8000-000000000001', 'Crear rutinas',            'mantenimiento.rutinas.crear',           'Crear una rutina preventiva por umbral',                   'mantenimiento', 'rutinas',       'crear',     'activo'),
  ('a1b2c3d4-0012-4000-8000-000000000002', 'Editar rutinas',           'mantenimiento.rutinas.editar',          'Editar una rutina preventiva',                             'mantenimiento', 'rutinas',       'editar',    'activo'),
  ('a1b2c3d4-0012-4000-8000-000000000003', 'Eliminar rutinas',         'mantenimiento.rutinas.eliminar',        'Retirar una rutina (no DELETE)',                           'mantenimiento', 'rutinas',       'eliminar',  'activo'),
  ('a1b2c3d4-0020-4000-8000-000000000000', 'Ver inspecciones',         'mantenimiento.inspecciones.ver',        'Ver el listado y detalle de inspecciones preoperacionales','mantenimiento', 'inspecciones',  'ver',       'activo'),
  ('a1b2c3d4-0020-4000-8000-000000000001', 'Crear inspecciones',       'mantenimiento.inspecciones.crear',      'Iniciar y diligenciar una inspección preoperacional',      'mantenimiento', 'inspecciones',  'crear',     'activo'),
  ('a1b2c3d4-0030-4000-8000-000000000000', 'Ver configuración',        'mantenimiento.configuracion.ver',       'Ver la configuración del módulo de mantenimiento',         'mantenimiento', 'configuracion', 'ver',       'activo'),
  ('a1b2c3d4-0030-4000-8000-000000000001', 'Editar configuración',     'mantenimiento.configuracion.editar',    'Editar la configuración del módulo',                       'mantenimiento', 'configuracion', 'editar',    'activo')
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- 10. Rol de negocio: operador_mantenimiento
-- ---------------------------------------------------------------------------
insert into public.roles (codigo, nombre, descripcion, es_sistema, estado)
values ('operador_mantenimiento', 'Operador de Mantenimiento', 'Realiza inspecciones preoperacionales de equipos (check) desde su usuario', false, 'activo')
on conflict (codigo) do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'operador_mantenimiento'
  and p.codigo in (
    'mantenimiento.categorias.ver',
    'mantenimiento.preguntas.ver',
    'mantenimiento.inspecciones.ver',
    'mantenimiento.inspecciones.crear',
    'mantenimiento.configuracion.ver',
    'activos.activos.ver',
    'activos.vehiculos.ver',
    'activos.maquinas.ver',
    'activos.equipos.ver'
  )
on conflict do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_ADMIN'
  and p.codigo like 'mantenimiento.%'
on conflict do nothing;

insert into public.roles_permisos (rol_id, permiso_id)
select r.id, p.id
from public.roles r, public.permisos p
where r.codigo = 'AUTH_SUPER_ADMIN'
  and p.codigo like 'mantenimiento.%'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 11. RLS
-- ---------------------------------------------------------------------------
-- 11.1 Categorías
create policy mantenimiento_categorias_select on public.mantenimiento_categorias
  for select to authenticated
  using (public.has_permission('mantenimiento.categorias.ver'::text) or
         public.has_permission('mantenimiento.inspecciones.crear'::text));

create policy mantenimiento_categorias_insert on public.mantenimiento_categorias
  for insert to authenticated
  with check (public.has_permission('mantenimiento.categorias.crear'::text));

create policy mantenimiento_categorias_update on public.mantenimiento_categorias
  for update to authenticated
  using (public.has_permission('mantenimiento.categorias.editar'::text))
  with check (public.has_permission('mantenimiento.categorias.editar'::text));

create policy mantenimiento_categorias_delete on public.mantenimiento_categorias
  for delete to authenticated
  using (public.has_permission('mantenimiento.categorias.eliminar'::text));

-- 11.2 Preguntas
create policy mantenimiento_preguntas_select on public.mantenimiento_preguntas
  for select to authenticated
  using (public.has_permission('mantenimiento.preguntas.ver'::text) or
         public.has_permission('mantenimiento.inspecciones.crear'::text));

create policy mantenimiento_preguntas_insert on public.mantenimiento_preguntas
  for insert to authenticated
  with check (public.has_permission('mantenimiento.preguntas.crear'::text));

create policy mantenimiento_preguntas_update on public.mantenimiento_preguntas
  for update to authenticated
  using (public.has_permission('mantenimiento.preguntas.editar'::text))
  with check (public.has_permission('mantenimiento.preguntas.editar'::text));

create policy mantenimiento_preguntas_delete on public.mantenimiento_preguntas
  for delete to authenticated
  using (public.has_permission('mantenimiento.preguntas.eliminar'::text));

-- 11.3 Rutinas
create policy mantenimiento_rutinas_select on public.mantenimiento_rutinas
  for select to authenticated
  using (public.has_permission('mantenimiento.rutinas.ver'::text) or
         public.has_permission('mantenimiento.inspecciones.crear'::text));

create policy mantenimiento_rutinas_insert on public.mantenimiento_rutinas
  for insert to authenticated
  with check (public.has_permission('mantenimiento.rutinas.crear'::text));

create policy mantenimiento_rutinas_update on public.mantenimiento_rutinas
  for update to authenticated
  using (public.has_permission('mantenimiento.rutinas.editar'::text))
  with check (public.has_permission('mantenimiento.rutinas.editar'::text));

create policy mantenimiento_rutinas_delete on public.mantenimiento_rutinas
  for delete to authenticated
  using (public.has_permission('mantenimiento.rutinas.eliminar'::text));

-- 11.4 Configuración
create policy mantenimiento_configuracion_select on public.mantenimiento_configuracion
  for select to authenticated
  using (public.has_permission('mantenimiento.configuracion.ver'::text) or
         public.has_permission('mantenimiento.inspecciones.crear'::text));

create policy mantenimiento_configuracion_update on public.mantenimiento_configuracion
  for update to authenticated
  using (public.has_permission('mantenimiento.configuracion.editar'::text))
  with check (public.has_permission('mantenimiento.configuracion.editar'::text));

-- 11.5 Inspecciones: el operador lee/escribe lo suyo; los directivos leen todo.
create policy mantenimiento_inspecciones_select on public.mantenimiento_inspecciones
  for select to authenticated
  using (public.has_permission('mantenimiento.inspecciones.ver'::text) or
         operador_id = auth.uid());

create policy mantenimiento_inspecciones_insert on public.mantenimiento_inspecciones
  for insert to authenticated
  with check (public.has_permission('mantenimiento.inspecciones.crear'::text) and
              operador_id = auth.uid());

create policy mantenimiento_inspecciones_update on public.mantenimiento_inspecciones
  for update to authenticated
  using (operador_id = auth.uid() and estado = 'borrador')
  with check (operador_id = auth.uid() and estado = 'borrador');

-- 11.6 Respuestas: propiedad del borrador (no se tocan tras finalizar).
create policy mantenimiento_respuestas_select on public.mantenimiento_inspeccion_respuestas
  for select to authenticated
  using (
    public.has_permission('mantenimiento.inspecciones.ver'::text) or
    exists (select 1 from public.mantenimiento_inspecciones i
            where i.id = inspeccion_id and i.operador_id = auth.uid())
  );

create policy mantenimiento_respuestas_insert on public.mantenimiento_inspeccion_respuestas
  for insert to authenticated
  with check (
    exists (select 1 from public.mantenimiento_inspecciones i
            where i.id = inspeccion_id and i.operador_id = auth.uid() and i.estado = 'borrador')
  );

create policy mantenimiento_respuestas_update on public.mantenimiento_inspeccion_respuestas
  for update to authenticated
  using (
    exists (select 1 from public.mantenimiento_inspecciones i
            where i.id = inspeccion_id and i.operador_id = auth.uid() and i.estado = 'borrador')
  )
  with check (
    exists (select 1 from public.mantenimiento_inspecciones i
            where i.id = inspeccion_id and i.operador_id = auth.uid() and i.estado = 'borrador')
  );

-- 11.7 Rutinas disparadas: solo lecturas (escritura exclusiva de la acción de
-- finalización con service role / cliente admin).
create policy mantenimiento_inspeccion_rutinas_select on public.mantenimiento_inspeccion_rutinas
  for select to authenticated
  using (
    public.has_permission('mantenimiento.inspecciones.ver'::text) or
    exists (select 1 from public.mantenimiento_inspecciones i
            where i.id = inspeccion_id and i.operador_id = auth.uid())
  );

create policy mantenimiento_inspeccion_rutinas_insert on public.mantenimiento_inspeccion_rutinas
  for insert to authenticated
  with check (false);

-- 11.8 Vista salud: security_invoker => la RLS de las tablas subyacentes y los
-- grants por defecto del proyecto garantizan lectura coherente. Sin policies.

-- ---------------------------------------------------------------------------
-- 12. Storage para evidencias fotográficas (carpeta por usuario autenticado)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspeccion-evidencias', 'inspeccion-evidencias', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "inspeccion_evidencias_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'inspeccion-evidencias'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or public.has_permission('mantenimiento.inspecciones.ver'::text)));

create policy "inspeccion_evidencias_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inspeccion-evidencias'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "inspeccion_evidencias_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'inspeccion-evidencias'
         and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'inspeccion-evidencias'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "inspeccion_evidencias_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'inspeccion-evidencias'
         and (storage.foldername(name))[1] = auth.uid()::text);