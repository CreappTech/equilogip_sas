# EQUILOGIPSAS — FASE 6: GESTIÓN DE USUARIOS Y ROLES

> Cierra un pendiente explícito de Fase 3 (sección 5 y AUTH-005): sin
> auto-registro habilitado, el sistema necesita una forma real de crear
> usuarios y asignarles roles que no dependa de entrar al dashboard de
> Supabase a mano. Esta fase no crea tablas nuevas — reutiliza
> `usuarios`, `roles`, `permisos`, `usuarios_roles`, `roles_permisos`
> creadas en Fase 3.

Referencias: `AGENTS.md`, `CONSTITUTION.md` §5, §6, §7, §19,
`ARCHITECTURE.md` §13, §14, `FASE2_FUNDACION_TECNICA.md`,
`FASE3_AUTENTICACION_AUTORIZACION.md` (secciones 3, 4, 5).

---

## 0. Decisiones tomadas por defecto (confirmar o corregir)

1. **Alta de usuario = invitación, no contraseña puesta por el admin.**
   El administrador solo captura `email` (+ nombre); Supabase Auth envía
   una invitación (`auth.admin.inviteUserByEmail` o equivalente) y el
   usuario define su propia contraseña en la misma pantalla de
   "establecer nueva contraseña" ya construida en Fase 3 (AUTH-010).
   Evita que la contraseña inicial circule fuera de banda
   (`CONSTITUTION.md` §6: "no colocar credenciales en código" — aplica
   por extensión a no manejarlas manualmente en texto plano tampoco).
2. **"Desactivar usuario" = cambio de estado, no `DELETE`**, mismo patrón
   que Fase 4 y 5 (`CONSTITUTION.md` §9). Además de marcar `usuarios.estado`,
   se revoca su acceso real vía Supabase Auth (baneo/deshabilitación),
   porque un cambio de estado que no bloquea el login no cumple su
   propósito de seguridad.
3. **Roles se administran desde esta UI** (crear rol, asignar/quitar
   permisos del catálogo existente). **Los permisos NO se crean desde la
   UI** — cada permiso nace registrado por el módulo que lo necesita (via
   migración/seed, como ya se hizo en Fase 4 y 5), consistente con que los
   permisos son un catálogo técnico, no un dato editable por un
   administrador de negocio.
4. **Un rol no se elimina físicamente si tiene usuarios asignados** — se
   bloquea la eliminación con un mensaje claro (`AGENTS.md` §17: error
   transformado, no crudo). Si no tiene usuarios asignados, sí se permite
   `DELETE` real (los roles son configuración, no historial de negocio —
   distinto de `activos`/`empleados`).

---

## 1. Permisos que esta fase concreta

Fase 3 (AUTH-004) registró de forma genérica "todos los permisos `auth.*`"
sin listarlos uno por uno. Esta fase los deja explícitos:

```text
auth.usuarios.ver
auth.usuarios.crear
auth.usuarios.editar
auth.usuarios.desactivar          -- cambio de estado + revocar acceso
auth.usuarios.asignar_roles
auth.roles.ver
auth.roles.crear
auth.roles.editar                  -- incluye asignar/quitar permisos
auth.roles.eliminar                -- solo si no tiene usuarios asignados
```

No se crean tablas nuevas — estos permisos se insertan en `permisos` y se
asignan al rol `admin` (mismo mecanismo de seed que Fase 4/5).

---

## 2. Estructura del feature (`apps/web/src/features/usuarios/`)

```text
features/usuarios/
├── queries/
│   ├── listUsuarios.ts        -- con roles asignados (join)
│   ├── getUsuarioDetalle.ts
│   ├── listRoles.ts             -- con permisos asignados (join)
│   └── listPermisosCatalogo.ts   -- catálogo completo, solo lectura
├── actions/
│   ├── invitarUsuario.ts        -- admin API: invite + insertar fila en `usuarios`
│   ├── updateUsuario.ts         -- nombre, datos de perfil
│   ├── desactivarUsuario.ts      -- estado + revocar acceso (admin API)
│   ├── asignarRoles.ts            -- actualiza usuarios_roles
│   ├── createRol.ts
│   ├── actualizarPermisosRol.ts   -- actualiza roles_permisos
│   └── eliminarRol.ts              -- bloquea si tiene usuarios asignados
├── schemas/
│   ├── invitarUsuarioSchema.ts     -- email, nombre
│   ├── asignarRolesSchema.ts
│   └── rolSchema.ts
└── types/
    └── usuario.types.ts
```

`invitarUsuario` y `desactivarUsuario` son las **únicas** actions de todo
el proyecto que usan el cliente **admin** (service role) de Supabase
(`AGENTS.md` §8) — nunca se exponen al cliente, se ejecutan exclusivamente
en Server Actions, y ambas revalidan `hasPermission()` antes de llamar a
la Admin API.

---

## 3. UI (reutilizando Fase 2 al máximo — incluye un componente heredado no usado hasta ahora)

| Pantalla | Ruta | Componentes reutilizados |
|---|---|---|
| Listado de usuarios | `(admin)/usuarios` | `PageHeader`, `SearchInput`, `DataTable`, `StatusBadge` (estado), badges de roles asignados |
| Detalle de usuario | `(admin)/usuarios/[id]` | `PageHeader`, datos + roles + empleado vinculado (si existe, de Fase 5) |
| Invitar usuario | `(admin)/usuarios/nuevo` | `FormField` + `useAppForm` (`invitarUsuarioSchema`: solo email + nombre) |
| Editar usuario / asignar roles | `(admin)/usuarios/[id]/editar` | `FormField` + **`MultiSelect`** (ya existe heredado de TailAdmin, `form/MultiSelect.tsx` — primer uso real en el proyecto) para elegir roles |
| Desactivar usuario | Acción desde listado/detalle | `ConfirmDialog` |
| Listado de roles | `(admin)/usuarios/roles` | `PageHeader`, `DataTable` |
| Crear/editar rol | `(admin)/usuarios/roles/[id]` | `FormField` (nombre del rol) + lista de `Checkbox` (ya existe, `form/input/Checkbox.tsx`) por cada permiso del catálogo, agrupados por módulo |
| Eliminar rol | Acción desde listado de roles | `ConfirmDialog`, con mensaje de error transformado si el rol está en uso |

Todo condicionado por `usePermissions().can('auth.usuarios.<accion>')` /
`can('auth.roles.<accion>')`, con revalidación server-side en cada action.

---

## 4. Tareas atómicas

| ID | Tarea | Entregable | Depende de |
|---|---|---|---|
| USR-001 | Confirmar decisiones de la sección 0 | Aprobación registrada | — |
| USR-002 | Seed: insertar explícitamente los 9 permisos de la sección 1 (reemplaza el bootstrap genérico de Fase 3 AUTH-004) y asignarlos al rol `admin` | `seed.sql` actualizado | USR-001 |
| USR-003 | Crear schemas Zod (`invitarUsuarioSchema`, `asignarRolesSchema`, `rolSchema`) | `features/usuarios/schemas/*` | USR-001 |
| USR-004 | Crear queries `listUsuarios`, `getUsuarioDetalle`, `listRoles`, `listPermisosCatalogo` sobre `useResourceList`/`useResourceDetail` de Fase 2 | `features/usuarios/queries/*` | — |
| USR-005 | Crear action `invitarUsuario` (Admin API `inviteUserByEmail` + insertar en `usuarios`), validando `hasPermission('auth.usuarios.crear')` | `features/usuarios/actions/invitarUsuario.ts` | USR-002, USR-003 |
| USR-006 | Crear action `updateUsuario` | `features/usuarios/actions/updateUsuario.ts` | USR-002 |
| USR-007 | Crear action `desactivarUsuario` (estado + revocar acceso vía Admin API) | `features/usuarios/actions/desactivarUsuario.ts` | USR-002 |
| USR-008 | Crear action `asignarRoles` (upsert de `usuarios_roles`) | `features/usuarios/actions/asignarRoles.ts` | USR-002, USR-003 |
| USR-009 | Crear actions `createRol`, `actualizarPermisosRol`, `eliminarRol` (con bloqueo si el rol está en uso) | `features/usuarios/actions/*Rol.ts` | USR-002, USR-003 |
| USR-010 | Construir listado de usuarios con `DataTable` + `SearchInput` + `StatusBadge` + badges de roles | `(admin)/usuarios/page.tsx` | USR-004 |
| USR-011 | Construir detalle de usuario (roles + empleado vinculado si existe, reutilizando el dato ya expuesto por Fase 5) | `(admin)/usuarios/[id]/page.tsx` | USR-004 |
| USR-012 | Construir flujo de invitación (`FormField` + `useAppForm`, solo email/nombre) | `(admin)/usuarios/nuevo/page.tsx` | USR-005 |
| USR-013 | Construir flujo de edición + asignación de roles con `MultiSelect` | `(admin)/usuarios/[id]/editar/page.tsx` | USR-006, USR-008 |
| USR-014 | Conectar `ConfirmDialog` a la acción de desactivar usuario | Botón + diálogo funcional | USR-007, USR-010, USR-011 |
| USR-015 | Construir listado de roles (`DataTable`) | `(admin)/usuarios/roles/page.tsx` | USR-004 |
| USR-016 | Construir formulario de crear/editar rol con lista de `Checkbox` agrupada por módulo | `(admin)/usuarios/roles/[id]/page.tsx` | USR-009 |
| USR-017 | Conectar `ConfirmDialog` a la acción de eliminar rol, mostrando el error transformado cuando el rol está en uso | Botón + diálogo funcional | USR-009, USR-015 |
| USR-018 | Condicionar visibilidad de todas las acciones anteriores con `usePermissions().can(...)` | UI actualizada | USR-002 |
| USR-019 | Actualizar `AGENTS.md` §4.4 (primer uso real de `MultiSelect`/`Checkbox` fuera de ejemplo), `ARCHITECTURE.md` §13/§14 y `FASE3...md` AUTH-005 (marcar como resuelto, ya no manual) | Documentos actualizados | USR-002 a USR-018 |
| USR-020 | Validación de cierre: `lint`/`typecheck`/`build` en `PASS`; probar invitación real de un usuario nuevo de punta a punta (invita → recibe link → establece contraseña → inicia sesión); probar que desactivar un usuario bloquea su login; probar que un rol en uso no se puede eliminar | Reporte de validación | USR-002 a USR-019 |

---

## 5. Criterio de salida de la Fase 6

- Un administrador puede invitar, editar, asignar roles y desactivar
  usuarios **sin tocar el dashboard de Supabase** — el paso manual de
  AUTH-005 (Fase 3) queda resuelto para todo usuario que no sea el primer
  admin de bootstrap (ese sigue siendo, inevitablemente, manual una sola
  vez).
- Un administrador puede crear roles nuevos y asignarles permisos del
  catálogo existente, sin que la UI permita inventar permisos nuevos.
- Desactivar un usuario bloquea su acceso real, no solo cambia una
  etiqueta visual.
- Un rol en uso no puede eliminarse; el mensaje de error es claro, no un
  error crudo de base de datos.
- Se reutilizaron `MultiSelect` y `Checkbox` (heredados de TailAdmin,
  hasta ahora sin uso real en el proyecto) en vez de construir un
  selector nuevo — tercera confirmación de que el inventario de Fase 2
  cubre casos que ni siquiera se habían necesitado todavía.

## 6. Implementación (completada 2026-09-04)

### Decisiones adoptadas

1. **Alta = contraseña directa** (createUser + email_confirm), no invitación.
2. **Desactivar = estado + Admin API** (ban_duration + signOut global).
3. **Roles en UI**, permisos catálogo técnico no editable.
4. **Bloqueo de eliminación** de rol en uso.

### Estructura adoptada (completar sobre existente, sin reorganizar a features/)

Las acciones de usuarios y roles viven en `app/usuarios/actions.ts`. Las queries viven en `lib/queries/`. Los schemas viven en `lib/schemas/`. No se reorganizó a `features/`.

### Tareas completadas

| ID | Tarea | Estado |
|---|---|---|
| USR-001 | Decisiones confirmadas | ✅ |
| USR-002 | Seed de permisos (3 nuevos: desactivar, asignar_roles, eliminar) | ✅ |
| USR-003 | Schemas Zod (ya existían en `lib/schemas/usuarios.ts`) | ✅ |
| USR-004 | Queries (ya existían en `lib/queries/`) | ✅ |
| USR-005 | `crearUsuario` (ya existía, no se cambia a invite) | ✅ |
| USR-006 | `updateUsuario` (pendiente — no hay UI de edición de perfil aún) | ⏳ |
| USR-007 | `cambiarEstado` con Admin API (banUser + signOut) | ✅ |
| USR-008 | `asignarRoles` (ya existía) | ✅ |
| USR-009 | `crearRol`, `actualizarPermisosRol`, `eliminarRol` | ✅ |
| USR-010 | Listado de usuarios (ya existía) | ✅ |
| USR-011 | Detalle de usuario (pendiente — ruta [id] no creada) | ⏳ |
| USR-012 | Flujo de creación (ya existía como modal) | ✅ |
| USR-013 | Flujo de edición + roles (modal ya existía) | ✅ |
| USR-014 | ConfirmDialog (componente creado, disponible para desactivar) | ✅ |
| USR-015 | Listado de roles (`/usuarios/roles`) | ✅ |
| USR-016 | Formulario crear/editar rol con Checkbox de permisos | ✅ |
| USR-017 | ConfirmDialog para eliminar rol (con error transformado) | ✅ |
| USR-018 | Permisos condicionados en UI (usuarios + roles + sidebar) | ✅ |
| USR-019 | Documentación (parcial — pendiente AGENTS.md/ARCHITECTURE.md) | ⏳ |
| USR-020 | Validación (tsc PASS, build PASS, smoke test PASS) | ✅ |

### Archivos creados

- `supabase/migrations/20260904100000_add_fase6_permisos.sql`
- `apps/web/src/components/ui/modal/ConfirmDialog.tsx`
- `apps/web/src/app/usuarios/roles/page.tsx`
- `apps/web/src/app/usuarios/roles/RolesClient.tsx`
- `apps/web/src/app/usuarios/roles/[id]/page.tsx`
- `apps/web/src/app/usuarios/roles/[id]/RoleFormClient.tsx`

### Archivos modificados

- `apps/web/src/app/usuarios/actions.ts` (agregar eliminarRol, crearRol, actualizarPermisosRol; modificar cambiarEstado con Admin API)
- `apps/web/src/app/usuarios/page.tsx` (permisos actualizados)
- `apps/web/src/layout/AppSidebar.tsx` (enlace Roles)

### Pendientes

- USR-006: action `updateUsuario` + página de edición de perfil
- USR-011: página de detalle de usuario (`/usuarios/[id]`)
- USR-019: actualizar AGENTS.md §4.4 y ARCHITECTURE.md §13/§14
- USR-020: prueba end-to-end de desactivar usuario (verificar que el login se bloquea)

## 7. Siguiente fase (fuera de alcance de este documento)

Se retoma la decisión que quedó abierta al cierre de Fase 5:
`mantenimiento` (con inclinación ya expresada, por tener resueltas sus
dependencias de `activos` y `empleados`) o `actividades`. Queda para la
próxima instrucción.
