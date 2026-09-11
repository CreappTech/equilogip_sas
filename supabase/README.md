# supabase/

Única fuente de verdad de la base de datos.

## Estructura

```
supabase/
├── migrations/
│   └── <timestamp>_<verbo>_<entidad>.sql
├── functions/
│   └── <nombre-funcion>/
│       └── index.ts
├── seed.sql          # datos de desarrollo, nunca datos reales
└── config.toml
```

## Convenciones

### Migraciones

- **Formato de nombre**: `<timestamp>_<verbo>_<entidad>.sql`
  - Ejemplo: `20260904120000_create_empleados.sql`
  - El timestamp usa formato `YYYYMMDDHHMMSS`
  - El verbo describe la acción: `create`, `alter`, `drop`, `add`, `update`
  - La entidad es en `snake_case` y coincide con el nombre de la tabla

- **Contenido de la migración**:
  - Una migración debe ser atómica (un solo cambio lógico)
  - Comentarios SQL con `--` para explicar secciones
  - Usar `IF NOT EXISTS` cuando sea posible para idempotencia

- **Reglas críticas**:
  - Toda tabla de negocio debe tener su migración versionada
  - Nunca modificar manualmente producción sin una migración equivalente (`AGENTS.md` §7)
  - Toda migración que crea tabla de negocio debe incluir sus políticas RLS

### RLS (Row Level Security)

- **Ubicación**: Mismo archivo de migración o en uno inmediatamente siguiente
- **Regla**: Ninguna tabla de negocio queda sin política RLS antes de cerrar la tarea
- **Verificación**:
  - Acceso autorizado permitido
  - Acceso no autorizado denegado
- **No desactivar RLS** para "solucionar" un error (`AGENTS.md` §12)

### Edge Functions

- **Cuándo usar**: Solo cuando la lógica no puede vivir como query/RPC normal
  - Webhooks externos
  - Integraciones con servicios externos
  - Cron jobs programados

- **Estructura**: Una carpeta por función con `index.ts`
- **Runtime**: Deno
- **Autenticación**: Verificar JWT en cada función (por defecto)

### Queries (NO viven aquí)

Las queries desde la app viven en:
- `apps/web/src/features/{dominio}/queries/` (uso exclusivo de la app web)
- `packages/` (si se comparten entre apps)

`supabase/` es solo la fuente de verdad del esquema.

### Seed

- `seed.sql` contiene **solo datos de desarrollo**
- Nunca incluir datos reales de producción
- Se ejecuta después de las migraciones
- Inserta permisos y roles del sistema `auth.*` con sus relaciones
- Idempotente (`on conflict do nothing`)

## Crear el primer usuario administrador

El sistema no tiene auto-registro. Para crear el primer admin:

### 1. Crear el tenant y el usuario en Supabase Studio

Ir a `Authentication > Users > Add user` con método `Email` y contraseña
temporal. Supabase creará un registro en `auth.users`.

### 2. Crear la fila en `profiles`

En SQL Editor, ejecutar (sustituir los UUIDs y datos):

```sql
-- 1) Crear el tenant si no existe
insert into public.tenants (id, nombre, nit, direccion, telefono, email, activo)
values ('00000000-0000-0000-0000-000000000001', 'Mi Empresa', '900000000-1', 'Calle 1', '3000000000', 'admin@miempresa.com', true)
on conflict (id) do nothing;

-- 2) Crear el profile vinculado al usuario de auth
insert into public.profiles (
  id, tenant_id, numero_documento, nombres, apellidos,
  rol, email_login, activo, estado
) values (
  'AUTH_USER_UUID_AQUI',
  '00000000-0000-0000-0000-000000000001',
  '12345678', 'Admin', 'Principal',
  'superadmin', 'admin@miempresa.com', true, 'activo'
);
```

### 3. Asignar el rol AUTH_SUPER_ADMIN

```sql
insert into public.usuarios_roles (usuario_id, rol_id)
select 'AUTH_USER_UUID_AQUI', r.id
from public.roles r
where r.codigo = 'AUTH_SUPER_ADMIN';
```

### 4. Verificar

```sql
-- Debe retornar true y el codigo 'AUTH_SUPER_ADMIN'
select public.has_permission('auth.usuarios.crear') as puede_crear;
select * from public.auth_roles();
```

> Nota: `AUTH_USER_UUID_AQUI` se obtiene de
> `Authentication > Users > [usuario creado] > User UID`.

## Referencias

- `FASE1_ARQUITECTURA.md` §3 - Estructura de Supabase
- `AGENTS.md` §7 - Reglas para modificar base de datos
- `AGENTS.md` §12 - Reglas RLS
- `CONSTITUTION.md` §8 - Integridad de información