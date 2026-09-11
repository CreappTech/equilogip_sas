-- Configuración parametrizable de la jornada laboral.
-- Singleton por tenant (una sola fila por tenant).
-- No hardcodea horarios nocturnos: se ajusta desde la UI.

create table public.configuracion_jornada (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null unique references public.tenants(id) on delete cascade,
  hora_inicio_nocturna     time not null default '21:00',
  hora_fin_nocturna        time not null default '06:00',
  horas_jornada_ordinaria  numeric(4,2) not null default 8.00
                           constraint config_jornada_horas_positivas check (horas_jornada_ordinaria > 0),
  created_at               timestamp with time zone not null default now(),
  updated_at               timestamp with time zone not null default now()
);

alter table public.configuracion_jornada enable row level security;

create policy "config_jornada_select"
  on public.configuracion_jornada for select to authenticated
  using (tenant_id = public.auth_tenant_id());

create policy "config_jornada_update"
  on public.configuracion_jornada for update to authenticated
  using (
    tenant_id = public.auth_tenant_id()
    and public.has_permission('jornada.configuracion.editar'::text)
  )
  with check (
    tenant_id = public.auth_tenant_id()
    and public.has_permission('jornada.configuracion.editar'::text)
  );

-- Insertar fila por defecto para cada tenant existente.
insert into public.configuracion_jornada (tenant_id)
select id from public.tenants
on conflict do nothing;

-- Trigger para updated_at.
create trigger configuracion_jornada_updated_at
  before update on public.configuracion_jornada
  for each row execute function public.set_updated_at();
