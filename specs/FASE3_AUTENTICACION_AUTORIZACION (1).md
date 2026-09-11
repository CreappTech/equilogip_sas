# EQUILOGIPSAS — FASE 3: AUTENTICACIÓN Y AUTORIZACIÓN

> Alcance de esta fase: el sistema de `AUTH` completo — autenticación real
> con Supabase Auth, y el modelo de autorización (`usuarios`, `roles`,
> `permisos`, `usuarios_roles`, `roles_permisos`) con su `hasPermission()`.
> A diferencia de Fase 1 y 2, aquí **sí se crean tablas reales** — pero son
> tablas de infraestructura de acceso, no de negocio. Ningún módulo
> empresarial (`activos`, `empleados`, `finanzas`, etc.) se construye
> todavía: esta fase existe justamente para que todos ellos, después,
> reutilicen el mismo sistema en vez de reinventar auth por módulo.

Referencias: `AGENTS.md`, `CONSTITUTION.md` §2.3, §5, §6, §7,
`ARCHITECTURE.md` §13, §14, `FASE1_ARQUITECTURA.md`,
`FASE2_FUNDACION_TECNICA.md`.

---

## 0. Decisiones a confirmar antes de ejecutar

Estas no las decido yo solo por ser cambios de modelo de seguridad
(`CONSTITUTION.md` §18):

1. **¿Auto-registro (signup público) o solo altas por administrador?**
   Equilogipsas es un sistema interno de gestión de activos/empleados, no
   una app de consumo. Por defecto asumo **sin auto-registro**: los
   usuarios se crean desde un panel de administración (o invitación por
   email), y `SignUpForm.tsx` (heredado de TailAdmin) **no se conecta**
   como registro público hasta que se confirme lo contrario. Si se
   confirma que sí debe haber auto-registro, se ajusta AUTH-004.
2. **Proveedores de autenticación**: por defecto, solo **email + password**
   vía Supabase Auth. OAuth (Google, Microsoft, etc.) queda fuera de
   alcance salvo que se pida explícitamente.
3. **Recordatorio de modelo de datos** (no es una pregunta, es una regla ya
   fijada en `CONSTITUTION.md` §2.3 que esta fase debe respetar): la tabla
   `usuarios` que se crea aquí es la extensión de `auth.users` para login al
   sistema. **No es lo mismo que `empleados`** (tabla de un dominio de
   negocio futuro). Un empleado puede no tener usuario; un usuario puede no
   estar ligado a un registro de empleado (ej. un usuario externo o de
   soporte). La relación entre ambas tablas, cuando exista, será una FK
   opcional y nunca al revés.

---

## 1. Modelo de datos de autorización

Confirma y detalla lo ya definido en `ARCHITECTURE.md` §14:

```text
auth.users (Supabase, no se toca directamente)
      │ 1:1
      ▼
usuarios            (perfil de negocio: nombre, email, estado, fk opcional a empleados)
      │ N:M
      ▼
usuarios_roles  ──▶ roles            (ej. "admin", "supervisor", "operador")
                          │ N:M
                          ▼
                    roles_permisos ──▶ permisos   (convención: modulo.recurso.accion)
```

Convención de `permisos` (ya fijada en `ARCHITECTURE.md` §14, ejemplo):

```text
auth.usuarios.ver
auth.usuarios.crear
auth.roles.gestionar
activos.vehiculos.ver
activos.vehiculos.crear
...
```

Cada módulo de negocio futuro **registra sus propios permisos** con este
formato en `roles_permisos` — esta fase no inventa los permisos de negocio,
solo deja el mecanismo y los permisos propios del módulo de auth
(`auth.usuarios.*`, `auth.roles.*`, `auth.permisos.*`).

RLS de estas 5 tablas (regla general, `AGENTS.md` §12):

- `usuarios`: cada usuario puede leer/editar su propio registro; solo
  quien tenga `auth.usuarios.editar` puede modificar el de otro.
- `roles`, `permisos`, `roles_permisos`, `usuarios_roles`: solo lectura
  para usuarios autenticados si necesitan resolver sus propios permisos;
  escritura solo con `auth.roles.gestionar` / `auth.permisos.gestionar`.

---

## 2. Autenticación

| Pieza | Estado real hoy | Qué hace esta fase |
|---|---|---|
| Login (UI) | Existe `SignInForm.tsx` (solo UI, sin lógica — `AGENTS.md` §4) | Conectar `onSubmit` a `supabase.auth.signInWithPassword`, usando `useAppForm` + `FormField` + `Toast` de Fase 2 |
| Logout | No existe lógica; `UserDropdown` existe como UI | Agregar acción de logout (`supabase.auth.signOut()`) al ítem correspondiente de `UserDropdown`, con redirect a login |
| Session | No existe | Cliente de sesión SSR (`@supabase/ssr` o equivalente) + contexto de sesión en cliente para componentes que necesiten `useSession()` |
| Password recovery | **No existe ninguna UI** (no estaba en el inventario original) | Crear 2 páginas nuevas bajo `(full-width-pages)/(auth)/`: solicitar reset (email) y establecer nueva contraseña (token), usando los mismos patrones de Fase 2 |
| Middleware | No existe | `apps/web/middleware.ts`: refresca sesión en cada request, redirige no-autenticados fuera de `(admin)`, redirige autenticados fuera de `(auth)` |
| Protected routes | No existe el mecanismo (las rutas están accesibles hoy) | El middleware cubre el nivel de ruta; a nivel de Server Component/Action se valida sesión + permiso explícitamente (nunca confiar solo en el middleware, `CONSTITUTION.md` §5) |

---

## 3. Autorización

Tablas a crear (con su migración y RLS en el mismo cambio, `AGENTS.md` §7):

- `usuarios` — perfil de negocio ligado 1:1 a `auth.users` (por `id`),
  con `fk_empleado_id` **opcional y nullable** (no se llena en esta fase,
  se deja lista para cuando exista el dominio `empleados`).
- `roles` — catálogo de roles (`nombre`, `descripcion`).
- `permisos` — catálogo de permisos (`clave` en formato
  `modulo.recurso.accion`, `descripcion`).
- `usuarios_roles` — tabla puente N:M `usuario_id` ↔ `rol_id`.
- `roles_permisos` — tabla puente N:M `rol_id` ↔ `permiso_id`.

Seed inicial (en `supabase/seed.sql`, datos de bootstrap, no de negocio):

- Rol `admin` con todos los permisos `auth.*` creados en esta fase.
- **No** se crea un usuario real por migración/seed automático — Supabase
  Auth administra `auth.users` fuera de SQL puro. La creación del primer
  usuario admin es un paso manual documentado (vía dashboard de Supabase o
  `supabase.auth.admin.createUser`), y luego se vincula manualmente a la
  fila de `usuarios` + `usuarios_roles`.

---

## 4. `hasPermission()`

Se implementa en dos capas, no en una sola, porque debe funcionar tanto
dentro de RLS como en la aplicación:

```text
1. Función SQL (para usarse DENTRO de políticas RLS de tablas futuras):

   public.has_permission(permiso text) returns boolean
   -- SECURITY DEFINER, STABLE
   -- resuelve: auth.uid() → usuarios_roles → roles_permisos → permisos.clave

2. Capa de aplicación:

   Server:  hasPermission(supabase, permiso: string): Promise<boolean>
            → llama al RPC de arriba, para usar en Server Actions/Route
              Handlers antes de mutar datos.

   Cliente: PermissionsProvider (contexto) que carga TODOS los permisos
            del usuario actual una sola vez al iniciar sesión, y expone:
            const { can } = usePermissions();
            if (can('activos.vehiculos.crear')) { ... }
            → evita pedir el permiso al servidor en cada render.
```

Regla para módulos futuros: ningún módulo de negocio implementa su propia
verificación de permisos ad-hoc — todos usan esta función/hook
(`ARCHITECTURE.md` §14, `CONSTITUTION.md` §7: "no crear columnas como
`puede_editar_vehiculos`").

---

## 5. Reutilización de patrones de Fase 2

- Login, password recovery: `useAppForm` + `FormField` + `Toast`.
- Futura pantalla de administración de usuarios/roles (no en esta fase,
  pero se deja preparado el terreno): `DataTable` + `SearchInput` +
  `StatusBadge` (para estado activo/inactivo del usuario) +
  `ConfirmDialog` (para revocar un rol).
- Ningún formulario ni listado de esta fase reinventa loading/empty/error
  — usa los estados ya construidos en Fase 2.

---

## 6. Tareas atómicas

| ID | Tarea | Entregable | Depende de |
|---|---|---|---|
| AUTH-000 | Confirmar decisiones de la sección 0 (auto-registro, proveedores) | Aprobación registrada | — |
| AUTH-001 | Migración: crear tabla `usuarios` (perfil ligado a `auth.users`, `fk_empleado_id` nullable) + RLS | Migración SQL | AUTH-000 |
| AUTH-002 | Migración: crear `roles`, `permisos`, `usuarios_roles`, `roles_permisos` + RLS de cada una | Migración SQL | AUTH-001 |
| AUTH-003 | Función SQL `public.has_permission(permiso text)` | Migración SQL con la función | AUTH-002 |
| AUTH-004 | Seed: rol `admin` + permisos `auth.usuarios.*`, `auth.roles.*`, `auth.permisos.*` en `supabase/seed.sql` | `seed.sql` actualizado | AUTH-002 |
| AUTH-005 | Documentar el paso manual de creación del primer usuario admin (vinculación `auth.users` ↔ `usuarios` ↔ `usuarios_roles`) | Sección en `supabase/README.md` | AUTH-004 |
| AUTH-006 | Configurar clientes Supabase de sesión SSR en `apps/web/src/lib/supabase/` (completar los scaffolds de Fase 1, ARQ-012) | Clientes browser/server funcionales con manejo de cookies de sesión | AUTH-001 |
| AUTH-007 | Crear `apps/web/middleware.ts`: refresco de sesión + redirect no-autenticado fuera de `(admin)` + redirect autenticado fuera de `(auth)` | `middleware.ts` | AUTH-006 |
| AUTH-008 | Conectar `SignInForm.tsx` a `signInWithPassword`, usando `useAppForm`/`FormField`/`Toast` de Fase 2 | `SignInForm.tsx` funcional | AUTH-006 |
| AUTH-009 | Agregar acción de logout al `UserDropdown` existente (`signOut` + redirect) | `UserDropdown.tsx` actualizado | AUTH-006 |
| AUTH-010 | Crear páginas de recuperación de contraseña (solicitar reset + establecer nueva) bajo `(full-width-pages)/(auth)/` | 2 páginas nuevas + formularios con los patrones de Fase 2 | AUTH-006 |
| AUTH-011 | Crear `PermissionsProvider` + hook `usePermissions()` (carga permisos del usuario al iniciar sesión) | `lib/auth/permissions-provider.tsx` | AUTH-003, AUTH-006 |
| AUTH-012 | Crear helper de servidor `hasPermission(supabase, permiso)` para Server Actions/Route Handlers | `lib/auth/has-permission.ts` | AUTH-003 |
| AUTH-013 | Decidir y dejar por escrito **qué pasa con `SignUpForm.tsx`** según AUTH-000: si no hay auto-registro, documentar explícitamente que ese componente queda sin conectar (o se retira de la navegación pública) hasta que se decida lo contrario | Nota en `AGENTS.md` §4 o comentario en el componente | AUTH-000 |
| AUTH-014 | Actualizar `AGENTS.md` §4 y `CONSTITUTION.md` §6/§7 con el estado real final (tablas creadas, función `has_permission`, convención de permisos ya en uso) | Documentos actualizados | AUTH-001 a AUTH-013 |
| AUTH-015 | Validación de cierre: probar login, logout, recuperación de contraseña, acceso denegado a `(admin)` sin sesión, y `hasPermission()` con un permiso inexistente vs. uno asignado al rol `admin` | Reporte de pruebas manuales + `lint`/`typecheck`/`build` en `PASS` | AUTH-001 a AUTH-013 |

---

## 7. Criterio de salida de la Fase 3

- Un usuario puede iniciar sesión, cerrar sesión y recuperar su
  contraseña usando Supabase Auth real, no UI decorativa.
- Ninguna ruta de `(admin)` es accesible sin sesión (verificado tanto por
  middleware como por al menos un chequeo a nivel de Server Component).
- `hasPermission()` funciona en ambas capas (SQL y aplicación) y ningún
  módulo de negocio necesitará escribir su propia lógica de permisos.
- Las tablas de autorización tienen RLS activo y probado (acceso
  autorizado y no autorizado, `AGENTS.md` §12).
- `usuarios` y `empleados` siguen siendo conceptualmente distintas — no se
  fusionaron ni se usó una como sustituto de la otra.

## 8. Siguiente fase (fuera de alcance de este documento)

Fase 4 — Primer módulo de negocio real: se elige el dominio a priorizar
(según el mapeo de `FASE1_ARQUITECTURA.md` sección 0), se registran sus
permisos siguiendo la convención `modulo.recurso.accion` en
`roles_permisos`, y su feature completo se construye reutilizando
`DataTable`, `FormField`, `Toast`, `useResource*` (Fase 2) y
`usePermissions()`/`hasPermission()` (Fase 3) — validando de punta a punta
que ningún módulo empresarial necesita reinventar UI, datos ni seguridad.
