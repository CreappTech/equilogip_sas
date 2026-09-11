# EQUILOGIPSAS — AGENTS

> Este documento reemplaza a los dos `AGENTS.md` previos del proyecto (el de
> gobernanza de Equilogipsas y el inventario de UI heredado del template
> TailAdmin `free-nextjs-admin-dashboard`). Es la **única** fuente de verdad
> de comportamiento del agente a partir de ahora. Ver historial de la fusión
> en `AUDITORIA_FUSION_AGENTES.md`.

## 0. Propósito

Este archivo define cómo deben trabajar los agentes de IA dentro del
repositorio de Equilogipsas: un sistema empresarial construido con Next.js
+ Supabase, cuya capa de UI parte de la base de componentes del template
TailAdmin.

Todos los agentes deben leer este archivo antes de modificar código.

También deben leer, cuando la tarea lo requiera:

```text
CONSTITUTION.md
ARCHITECTURE.md
```

---

# 1. Regla principal

**No modificar código antes de entender el contexto necesario para la tarea.**

```text
Leer
↓
Inspeccionar
↓
Entender
↓
Planificar
↓
Implementar
↓
Validar
```

No comenzar directamente escribiendo código.

---

# 2. Alcance

Cada tarea debe tener un alcance definido. El agente debe modificar
únicamente lo necesario para cumplir la tarea.

No aprovechar una tarea para:

- refactorizar todo el proyecto.
- cambiar arquitectura.
- actualizar dependencias innecesariamente.
- modificar módulos no relacionados.
- renombrar archivos sin necesidad.
- rediseñar funcionalidades existentes.
- migrar estructura de carpetas "de paso" (ver §4.3 — es una decisión
  aparte, nunca un efecto colateral de otra tarea).

---

# 3. Antes de implementar

El agente debe inspeccionar, cuando corresponda:

```text
package.json
estructura de carpetas (apps/web/src/app, apps/web/src/components, apps/web/src/features)
AGENTS.md (este archivo)
CONSTITUTION.md
ARCHITECTURE.md
feature relacionada
componentes reutilizables (sección 4.4)
Supabase
migraciones
```

---

# 4. Inventario de UI heredado de TailAdmin

Esta sección reemplaza al antiguo `AGENTS.md` de TailAdmin. El template
sigue siendo la base real de la capa de presentación del proyecto — nada de
esto es aspiracional, es lo que existe hoy en el repo — pero **cuatro
supuestos del documento original ya no son válidos** en Equilogipsas y se
corrigen explícitamente en 4.1–4.3 y 4.5.

## 4.1 Stack base (sin cambios respecto al template original)

- **Next.js** `^16.1.6` — App Router (`apps/web/src/app`), Turbopack por defecto en
  `dev` y `build`.
- **React** `^19.2.0` / **react-dom** `^19.2.0`.
- **TypeScript** `^5.9.3`, `strict: true`. Todo código nuevo es `.tsx`/`.ts`.
- **Tailwind CSS** `^4.1.17` vía `@tailwindcss/postcss` + `@tailwindcss/forms`.
  El theme (colores, breakpoints, tipografía) vive en `apps/web/src/app/globals.css`
  mediante el bloque `@theme` de Tailwind v4. **No crear** `tailwind.config.js`
  nuevo — sigue sin ser el patrón de este proyecto.
- Alias de importación: `@/*` → `./apps/web/src/*`.
- Fuente: `Outfit` vía `next/font/google`, aplicada en `apps/web/src/app/layout.tsx`.

## 4.2 Librerías instaladas y aprobadas

| Librería | Uso | Estado |
|---|---|---|
| `apexcharts` + `react-apexcharts` | Gráficos (bar, line) | Heredada del template |
| `@fullcalendar/*` | Calendario | Heredada del template |
| `@react-jvectormap/*` | Mapa de países | Heredada del template |
| `flatpickr` | Selector de fechas | Heredada del template |
| `swiper` | Carruseles | Heredada del template |
| `react-dnd` + `react-dnd-html5-backend` | Drag & drop | Heredada del template |
| `react-dropzone` | Subida de archivos | Heredada del template |
| `tailwind-merge` | Combinación de clases | Heredada del template |
| `@svgr/webpack` (dev) | Import de `.svg` como componentes | Heredada del template |
| **`react-hook-form`** | Formularios de negocio | **Aprobada — obligatoria** (CONSTITUTION §3, §12) |
| **`zod`** | Validación de esquemas | **Aprobada — obligatoria** (CONSTITUTION §3, §12) |
| **`@supabase/supabase-js`** (+ `@supabase/ssr` u equivalente) | Cliente Supabase (browser/server) | **Aprobada — obligatoria** (CONSTITUTION §4, §6, EQUILOGIPSAS §8) |

> Corrección respecto al documento original de TailAdmin: ya **no** es
> cierto que "React Hook Form, Zod y cualquier cliente HTTP/BD no están
> instalados ni deben usarse sin aprobación". Las tres filas en negrita
> están aprobadas por la Constitución del proyecto — el agente no necesita
> volver a pedir consentimiento para usarlas. Cualquier librería **fuera**
> de esta tabla sigue requiriendo consentimiento explícito antes de instalar
> (ver §11).

## 4.3 Estructura de carpetas — estado actual y decisión de organización

Estructura real heredada del template (vigente hoy, ruteo y componentes
visuales viven aquí y **no se mueven** sin una tarea dedicada):

```
apps/web/src/
├── app/
│   ├── (auth)/                   # Rutas publicas (login, reset-password)
│   │   ├── layout.tsx
│   │   ├── login/
│   │   └── reset-password/
│   ├── actions/                  # Server Actions reutilizables (auth.ts)
│   ├── usuarios/                 # Gestion de usuarios (auth module)
│   ├── layout.tsx               # Root layout (ThemeProvider, PermissionsProvider)
│   ├── globals.css
│   └── page.tsx                 # Home (admin panel)
├── components/                  # UI y widgets de sección (ver 4.4)
├── components/                  # UI y widgets de sección (ver 4.4)
├── context/
├── features/                    # Lógica de dominio (queries, actions, schemas Zod, tipos, hooks)
│   ├── activos/
│   ├── empleados/
│   ├── mantenimiento/
│   ├── actividades/
│   ├── finanzas/
│   ├── horas/
│   ├── liquidaciones/
│   ├── reportes/
│   └── dashboard/
├── hooks/
├── icons/
└── layout/
```

**Decisión de organización adoptada** (ver ARCHITECTURE.md §5 para el
detalle y el porqué): modelo **híbrido dentro del monorepo**.

```text
apps/web/src/app/*              → rutas y layouts (Next.js App Router). No cambia.
apps/web/src/components/*       → UI puramente visual/reutilizable. No cambia.
apps/web/src/features/{dominio}/→ lógica de dominio nueva: queries, actions,
                                  schemas Zod, tipos, hooks de negocio.
                                  (activos, empleados, mantenimiento, finanzas,
                                  horas, liquidaciones, reportes, dashboard)
```

Regla: código de negocio (llamadas a Supabase, validación con Zod, reglas
de cálculo financiero) va en `apps/web/src/features/{dominio}/`. Código de
presentación pura (botones, tablas, modales, layout) se queda o se crea en
`apps/web/src/components/*`, tal como ya funciona hoy. No migrar código existente de
`components/` a `features/` como parte de otra tarea — es una tarea propia
si se decide hacerla.

## 4.4 Componentes reutilizables (`apps/web/src/components/ui/`, `apps/web/src/components/form/`, `apps/web/src/components/common/`)

Antes de crear un componente nuevo, revisar el inventario completo en
`COMPONENTS.md` y si ya existe uno equivalente:

- `ui/`: `button/Button.tsx`, `badge/Badge.tsx` (exporta `BadgeColor`),
  `alert/Alert.tsx`, `avatar/Avatar.tsx`, `dropdown/Dropdown.tsx`,
  `modal/index.tsx` (+ hook `useModal`), `modal/ConfirmDialog.tsx`
  (diálogo de confirmación destructiva/warning, construido sobre `Modal` +
  `Button`), `table/index.tsx` (TableCell acepta `colSpan`),
  `data-table/DataTable.tsx` (tabla con loading/empty/error/paginación),
  `states/` (`EmptyState`, `LoadingState`, `ErrorState`), `tabs/Tabs.tsx`,
  `drawer/Drawer.tsx` (panel lateral), `toast/ToastProvider.tsx`
  (+ `useToast`, montado en `app/layout.tsx`), `images/*`, `video/*`.
- `form/`: `Form.tsx`, `Label.tsx`, `FormField.tsx` (label + error/hint),
  `Select.tsx`, `MultiSelect.tsx`, `Combobox.tsx` (select con búsqueda),
  `SearchInput.tsx` (búsqueda con debounce), `switch/Switch.tsx`,
  `input/InputField.tsx` (`min`/`max` aceptan número), `input/Checkbox.tsx`,
  `input/Radio.tsx`, `input/TextArea.tsx`, `input/FileInput.tsx`.
  `date-picker.tsx` NO está instalado → usar `<Input type="date">` nativo.
- `common/`: `PageHeader.tsx` (título + acciones), `ComponentCard.tsx`,
  `StatusBadge.tsx` (Badge por estado), `PageBreadCrumb.tsx`,
  `ThemeToggleButton.tsx`, `ChartTab.tsx`, `GridShape.tsx`.
- Hooks de UI: `useModal()`, `useGoBack()`.
- Hooks de datos: `useAppForm()` (`lib/forms/useAppForm.ts` — `useForm` +
  `zodResolver`), `useResourceList()` / `useResourceDetail()` /
  `useResourceMutation()` (`lib/data/use-resource-*.ts`), `getErrorMessage()`
  (`lib/data/error-message.ts`).
- Context: `ThemeProvider` (dark/light, persistido en `localStorage` — esto
  es UI, no dato de negocio, se mantiene como está), `SidebarProvider`,
  `PermissionsProvider` + `usePermissions`.
- Iconos: `apps/web/src/icons/*.svg` re-exportados vía `@svgr/webpack` en
  `apps/web/src/icons/index.tsx`. Ícono nuevo → agregar `.svg` + exportar ahí.

**A partir de ahora, formularios de negocio nuevos se construyen así**:
`useAppForm(schema)` (react-hook-form + zodResolver) + `Form.tsx` +
`FormField.tsx` + `input/*` como capa visual, con estados
`idle | submitting | success | error` vía `useResourceMutation` (sin doble
envío) y feedback con `useToast`. El patrón antiguo de "validación manual
con `useState`" (ejemplo obsoleto del `AGENTS.md` original) queda descartado
para cualquier formulario que persista datos de negocio en Supabase.

## 4.5 Variables de entorno

Corrección respecto al documento original: **sí existe** configuración por
entorno, porque Supabase la requiere. Crear/mantener `.env.example` (sin
valores reales) con, como mínimo:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # solo servidor, nunca en cliente
```

Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al navegador ni commitear
`.env.local` con valores reales.

## 4.6 Assets estáticos

`public/images/{brand,cards,carousel,chat,country,error,grid-image,icons,
logo,product,shape,task,user,video-thumb}/`. Nuevos assets siguen esta
misma convención de subcarpetas por dominio.

## 4.7 Nota sobre `next.config.ts` (Turbopack vs Webpack)

Cualquier regla nueva de carga de assets se agrega en el bloque
`turbopack.rules`, no en la función `webpack()` (código heredado,
inofensivo, no se ejecuta con Turbopack pero no se elimina sin pedido
explícito del usuario).

## 4.8 Convenciones del módulo `auth` (Fase 3)

- **Códigos de permisos**: prefijo del módulo seguido de recurso y acción,
  con puntos como separador. Los códigos del propio módulo de auth son
  `auth.usuarios.*`, `auth.roles.*`. Los módulos futuros usarán su propio
  prefijo (ej. `activos.vehiculos.crear`, `finanzas.*`).
- **Códigos de roles del sistema**: prefijo `AUTH_` para distinguirlos de
  los códigos de roles de cualquier otro módulo. Ejemplos actuales:
  `AUTH_SUPER_ADMIN`, `AUTH_ADMIN`, `CONSULTA`.
- **Tabla de usuarios**: la tabla se llama `profiles` (1:1 con
  `auth.users`), no `usuarios`. El nombre `usuarios_roles` se reserva
  para la relación N:M entre profiles y roles. Esto es un detalle
  heredado del template y no se renombra por compatibilidad con el código
  existente.
- **Rol operativo del usuario**: existe un enum `user_role` en la columna
  `profiles.rol` con valores como `superadmin`, `administrador`, `operario`.
  Este campo es independiente del sistema N:M de roles y se usa para
  lógica de negocio (policies RLS rápidas por rol del perfil). El sistema
  de permisos N:M es el que se debe preferir para control granular
  (crear, editar, etc.).
- **`SignUpForm.tsx`**: existe como componente UI heredado del template,
  pero **no está conectado a ninguna ruta**. El proyecto no tiene
  auto-registro. Crear usuarios es una operación admin que vive en
  `app/usuarios/actions.ts`. Si en el futuro se decide habilitar
  auto-registro, será una tarea propia con su diseño específico.
- **Reset password**: el flujo vive en `app/(auth)/reset-password/` y
  usa `supabase.auth.resetPasswordForEmail` + `supabase.auth.updateUser`.
  Requiere que el email destino pertenezca a un usuario ya existente en
  `auth.users`.
- **Helper de permisos en SQL**: para RLS policies se usa
  `public.has_permission('auth.usuarios.crear'::text)` que soporta
  wildcards (`auth.*`, `auth.usuarios.*`). Internamente delega en
  `auth_permisos()` para que la evaluación sea STABLE. La función
  legacy `auth_tiene_permiso(text)` también existe y se mantiene para
  las RLS existentes; el código nuevo debe usar `has_permission`.

## 4.9 Nota sobre el group route `(admin)`

El documento de Fase 3 proponía crear `app/(admin)/` como group route
para las rutas administrativas (panel, usuarios, etc.). **Decisión
actual**: no se crea. Las rutas administrativas viven directamente en
`app/` y la protección se hace vía `apps/web/middleware.ts` con la
lógica actual de redirects. Cuando Fase 4 (u otra fase futura) añada
más rutas administrativas, se evaluará crear el group route como tarea
dedicada. Por ahora mover archivos rompería PRs abiertos sin valor
inmediato.

## 4.10 Convenciones del módulo `activos` (Fase 4)

- **Modelo por especialización de tabla**: `activos` + `vehiculos` /
  `maquinas` / `equipos` (1:1, FK a `activos.id`). Misión de este módulo:
  los datos comunes viven en `activos`; los específicos en la tabla
  especializada (ver ARCHITECTURE.md §6.1).
- **"Eliminar" nunca es DELETE**: es cambiar `estado` a `retirado`
  (acción `retirarActivo`). `retirado` es terminal y no editable; los
  formularios de edición solo ofrecen `activo | inactivo`. La inmutabilidad
  del `tipo` y la consistencia tipo↔especialidad se garantizan con
  triggers en la base, no solo en el código.
- **Códigos de permisos**: `activos.activos.{ver,crear,editar,eliminar}`
  (genéricos) y `activos.<vehiculos|maquinas|equipos>.<ver|crear|editar|eliminar>`
  (13 permisos, sembrados para `AUTH_SUPER_ADMIN` y `AUTH_ADMIN`). El código
  de la app usa `permisoActivo(tipo, accion)` del feature types; las actions
  siempre autorizan en servidor y RLS valida en la base.
- **Dónde vive cada pieza**: negocio en `apps/web/src/features/activos/`
  (`types/`, `schemas/`, `queries/`, `actions/`); UI en
  `apps/web/src/app/activos/` (listado, detalle, `nuevo`, `[id]/editar`).
  El formulario compartido `ActivoForm.tsx` se renderiza en servidor de
  la página y es cliente; se permiten `<Input type="date">` y
  `<Input type="number">` para `fecha_adquisicion`, `anio` y `lectura_inicial`.
- **`retirado` / `eliminar`**: la persona que retira necesita
  `activos.<tipo>.eliminar`; la UI lo oculta, pero RLS lo exige.
- **Formulario de flota (extensión Fase 4)**: replica la estructura de
  campos del módulo Flota de "equilogip" adaptada a este stack.
  - Tres categorías (`vehiculo|maquina|equipo`) + `subtipo` con los 6 tipos
    de equipo de equilogip (`MOTOCICLETA`, `AUTOMOVIL`, `MONTACARGAS`,
    `CARGADOR_FRONTAL`, `RETROEXCAVADORA`, `YALE_MANUAL`). El subtipo se
    valida por categoría con el trigger `trg_activos_verificar_subtipo`
    (vehículo ⇒ MOTO/AUTO; maquinaria ⇒ MONTACARGAS/CARGADOR/RETRO; equipo ⇒
    YALE), además de los schemas Zod por tipo.
  - Ciclo de vida (`estado`: `activo|inactivo`, `retirado` terminal) +
    `estado_operativo` (OPERATIVA/EN_MANTENIMIENTO/FUERA_DE_SERVICIO/ALQUILADA).
    ALQUILADA no se ofrece en el formulario; solo se asigna por flujo futuro
    de alquiler.
  - La ficha técnica (`activos.datos_tecnicos`, JSONB) y la información del
    fabricante (`activos.datos_fabricante`, JSONB) dependen del `subtipo`;
    el catálogo de campos vive en `features/activos/types/fichaTecnica.ts`
    (`CAMPOS_TECNICOS` / `CAMPOS_FABRICANTE`), sin duplicar la fuente.
  - `nombre` se deriva de `marca + modelo` (columna nullable; el formulario
    no lo pide). El listado/detalle usan `nombreActivo()` como fallback.
  - `serie` es columna canónica en `activos` (se eliminó de `maquinas` y
    `equipos`).
  - `origen` (`PROPIA|SUBARRENDADA`) + tabla compartida `proveedores`
    (RLS: lectura con `catalogos.proveedores.ver` / `activos.activos.ver`,
    escritura con `catalogos.proveedores.{crear,editar,eliminar}`).
    `proveedor_id` es obligatorio en server cuando `origen = SUBARRENDADA`
    y nulo cuando `origen = PROPIA` (constraint `activos_proveedor_check`).
  - Sede = FK `activos.centro_servicio_id` a `centros_servicio` (obligatoria
    en el formulario); la RLS de `centros_servicio` ya limita por tenant.
- **Pendiente conocido**: no hay UI de mantenimiento de proveedores (se
     siembran en `seed.sql`); ALQUILADA solo vía flujo futuro; YALE_MANUAL
     no tiene ficha técnica (igual que la fuente).

## 4.11 Convenciones del módulo `empleados` (Fase 5)

- **Entidad simple, sin especialización por tipo**: una sola tabla
  `empleados` (a diferencia de `activos`). `cargo` es FK `empleados.cargo_id`
  → `cargos.id`, obligatoria. `documento_identidad` es alfanumérico libre y
  UNIQUE. `fecha_ingreso` es obligatoria; `fecha_nacimiento`, `telefono` y
  `email_contacto` son opcionales.
- **Ciclo de vida** (`estado`: `activo|inactivo|retirado`), misma regla que
  activos (`CONSTITUTION.md` §9): "eliminar" nunca es DELETE — es cambiar
  `estado` a `retirado` (acción `retirarEmpleado`), terminal y no editable.
  No existe policy DELETE en `empleados`.
- **Vínculo usuarios ↔ empleados**: 1:N `profiles.fk_empleado_id` → `empleados
  .id` (`ON DELETE SET NULL`), UNIQUE. Es la columna que Fase 3 dejó nullable
  sin FK; ahora queda declarada y restringida. No es obligatoria en ninguna
  dirección (`CONSTITUTION.md` §2.3). Se gestiona en la página de edición del
  empleado (sección "Usuario del sistema").
- **Códigos de permisos**: `empleados.empleados.{ver,crear,editar,eliminar,
  vincular_usuario}` se siembran para `AUTH_ADMIN` y `AUTH_SUPER_ADMIN`;
  `CONSULTA` recibe solo `empleados.empleados.ver`. `eliminar` (retiro) está
  oculto en la UI pero RLS lo exige. `vincular_usuario` exige en servidor el
  doble permiso `empleados.empleados.vincular_usuario` **y** `auth.usuarios.editar`
  (la RLS de `profiles` no se debilita).
- **RLS**: `empleados` sin `tenant_id`. Policies de lectura/creación/edición
  vía `has_permission('empleados.empleados.{ver,crear,editar}')`; el retiro
  usa `has_permission('empleados.empleados.eliminar')`. Leer el catálogo
  `cargos` no exige permiso extra (policy `cargos_select_tenant` solo valida
  `tenant_id`).
- **Dónde vive cada pieza**: negocio en `apps/web/src/features/empleados/`
  (`types/`, `schemas/`, `queries/`, `actions/`); UI en `apps/web/src/app/
  empleados/` (listado, detalle, `nuevo`, `[id]/editar`). El formulario
  compartido `EmpleadoForm.tsx` se renderiza en servidor de la página y es
  cliente. El bloque de vinculación vive en `[id]/editar/EmpleadoEditarClient.tsx`
  (Combobox + acciones `vincularUsuario` con `profile_id: null` para
  desvincular).
- **Pendiente conocido**: no hay UI de mantenimiento de empleados como
  seleccionables en mantenimiento/horas (dominos futuros); historial laboral,
  contactos de emergencia y dotación no existen todavía (spec de Talento
  Humano fuera de alcance de esta fase).

---

# 5. No inventar

Si una entidad, componente, tabla, función o patrón no existe:

No asumir que existe. No inventar silenciosamente.

Determinar si:

1. debe crearse.
2. existe con otro nombre (revisar §4.4 antes de crear UI nueva).
3. debe reutilizarse.
4. requiere una decisión arquitectónica (ver ARCHITECTURE.md §24).

---

# 6. Reutilización

Antes de crear `componente | hook | query | helper | schema | service`,
buscar si ya existe uno equivalente en `apps/web/src/components/*` (UI) o
`apps/web/src/features/*` (lógica de dominio). La duplicación debe evitarse.

---

# 7. Base de datos

Antes de modificar la base de datos:

1. revisar migraciones existentes.
2. revisar tablas relacionadas.
3. revisar foreign keys.
4. revisar índices.
5. revisar RLS.
6. revisar triggers.
7. revisar convenciones de naming (`snake_case`, ver ARCHITECTURE.md §9).

Toda modificación debe realizarse mediante migración versionada en
`supabase/migrations/`.

---

# 8. Supabase

Utilizar el patrón de Supabase existente. No crear un nuevo cliente si ya
existe uno adecuado. Distinguir correctamente:

```text
Browser client
Server client
Admin/service role
```

Nunca exponer claves privilegiadas al navegador.

---

# 9. Prisma

Prohibido introducir Prisma. Si se encuentra código antiguo relacionado con
Prisma, no eliminarlo automáticamente: primero determinar si sigue siendo
utilizado y reportarlo.

---

# 10. Seguridad

Toda operación sensible debe verificar `usuario autenticado + permiso
correspondiente`. No confiar en botones ocultos, rutas ocultas o
componentes protegidos como mecanismo de autorización — la interfaz (esto
incluye toda la UI heredada de TailAdmin, sección 4) únicamente mejora la
experiencia; la autorización se ejecuta en servidor y/o base de datos.

---

# 11. Instalación de dependencias nuevas

Cualquier librería que **no** aparezca en la tabla de §4.2 requiere
consentimiento explícito del usuario antes de instalarse, siguiendo:

1. Nombrar qué falta y confirmar que no está en el proyecto.
2. No simular la funcionalidad con un mock permanente sin avisar.
3. Proponer la ruta más cercana con lo ya disponible, si existe.
4. Pedir consentimiento explícito antes de instalar, explicando qué se
   instalaría, por qué, y la alternativa sin instalar nada.
5. Si el usuario confirma salir del alcance actual, proceder y dejar
   constancia de que es una extensión del alcance original.

---

# 12. RLS

Toda nueva tabla con información de negocio debe analizarse para RLS.
Nunca desactivar RLS para "solucionar" un error. Si una política genera
problemas: diagnosticar → corregir la política → probar acceso autorizado →
probar acceso no autorizado.

---

# 13. Formularios

Usar `react-hook-form` + `zod` (ver §4.2 y §4.4) para todo formulario de
negocio. Todo formulario debe tener `loading | validation | error |
success` y no permitir doble envío.

---

# 14. UX

Toda funcionalidad nueva debe funcionar en `móvil | tablet | desktop`,
prioridad mobile-first. Evitar tablas imposibles de usar en móvil, botones
pequeños, formularios largos sin agrupar, modales que no funcionan en
pantallas pequeñas.

---

# 15. Datos

No usar datos falsos para ocultar problemas de integración. No dejar
`mock data` / valores hardcodeados en producción salvo excepción explícita.

**Nota específica sobre el origen TailAdmin**: los widgets heredados del
template (`RecentOrders`, `MonthlyTarget`, `CountryMap`, métricas del
dashboard, etc.) tienen datos hardcodeados **por herencia del template, no
como decisión de este proyecto**. Cada uno debe marcarse así al tocarlo:

```ts
// TODO(equilogipsas): reemplazar por datos reales de Supabase — tabla: <nombre>
```

y reportarse como pendiente en el informe final (§25) hasta que se conecte
a una fuente real. No se reportan como funcionalidad terminada mientras
sigan hardcodeados.

---

# 16. Estados de interfaz

Todo listado contempla `loading | empty | error | success`. Todo formulario
contempla `idle | submitting | success | error`.

---

# 17. Manejo de errores

Los errores internos no se muestran directamente al usuario. Transformar
`database error | validation error | authorization error | network error`
en mensajes adecuados. Nunca ocultar completamente el error al desarrollador
— debe existir información suficiente para diagnosticarlo.

---

# 18. Cambios de dominio

Si el modelo de datos actual no soporta correctamente el requerimiento: no
crear un workaround rápido. Detenerse y documentar `problema | causa |
impacto | propuesta`. Si el cambio es estructural (incluye cualquier cambio
a la decisión de organización de carpetas de §4.3), solicitar aprobación
antes de proceder.

---

# 19. Finanzas

Los cálculos financieros deben ser deterministas. No duplicar fórmulas de
`ingresos | gastos | costos | resultado` en diferentes componentes. La
lógica debe estar centralizada en `apps/web/src/features/finanzas/`.

---

# 20. Mantenimiento

Los registros de mantenimiento mantienen relaciones estructuradas con
`activo | tipo | actividad | fecha | proveedor | costos` cuando corresponda
al modelo de negocio. No tratar mantenimiento simplemente como texto.

---

# 21. Empleados

No confundir `usuario del sistema` con `empleado`. Un empleado puede existir
sin usuario.

---

# 22. Tests y validaciones

Antes de terminar una tarea, ejecutar las validaciones disponibles en el
proyecto. Como mínimo, cuando existan: `lint | typecheck | test | build`,
usando los comandos definidos en `package.json`. No inventar comandos.

El template TailAdmin heredado **no** trae tests configurados (sin Jest,
Vitest, Playwright). Mientras eso siga así, reportar explícitamente
`test: N/A (no configurado)` en el informe final — nunca omitir la línea ni
declarar `PASS` sin haber ejecutado nada.

---

# 23. Validación incremental

No esperar hasta el final para descubrir errores: `implementar → validar →
corregir` después de cada cambio relevante.

---

# 24. Archivos modificados

Al finalizar una tarea, informar: `Archivos creados | Archivos modificados |
Migraciones creadas | Tests creados`.

---

# 25. Informe final

Toda tarea termina con:

```text
## Implementado

...

## Archivos modificados

...

## Validaciones

lint: PASS/FAIL
typecheck: PASS/FAIL
test: PASS/FAIL/N/A
build: PASS/FAIL

## Problemas encontrados

...

## Pendientes

(incluye cualquier dato hardcodeado heredado de TailAdmin que siga
pendiente de conectar a Supabase, ver §15)
```

No declarar PASS cuando una validación haya fallado.

---

# 26. Trabajo por tareas

Las tareas deben ser pequeñas: `una entidad | una operación | un
componente | una migración | una regla`. Evitar tareas tipo "construir todo
el módulo".

---

# 27. Plan antes de código

Tareas complejas: `Discovery → Plan → Implementación`.
Tareas pequeñas y claras: `Inspección → Implementación → Validación`.
El agente elige el nivel adecuado sin generar documentación innecesaria.

---

# 28. Contexto y tokens

Minimizar el contexto utilizado. No leer indiscriminadamente todo el
repositorio. Leer únicamente: documentación global + archivos relevantes +
dependencias necesarias. No repetir información ya documentada.

---

# 29. Skills

Si existe una skill especializada para la tarea, utilizarla (database,
supabase, nextjs, security, quality, documentation). No usar una skill
únicamente por existir.

---

# 30. Git

Cambios pequeños y coherentes. Evitar mezclar `feature + refactor +
actualización de dependencias + formateo masivo` en un mismo cambio.

---

# 31. Regla de no regresión

Antes de finalizar, verificar que la funcionalidad existente relacionada
continúe funcionando. Una feature nueva no es correcta si rompe otra.

---

# 32. Regla final del agente

El objetivo no es escribir la mayor cantidad de código. El objetivo es
resolver correctamente la tarea con el menor cambio necesario, manteniendo
seguridad, integridad, simplicidad y mantenibilidad.

Cuando exista incertidumbre importante, detenerse y reportarla en lugar de
inventar una solución.

---

# 33. Regla del componente único

Ningún agente debe escribir markup de UI ad-hoc para un caso puntual
(botones, tablas, formularios, estados vacíos, diálogos de confirmación)
si ya existe un componente canónico para ese propósito en
`apps/web/src/components/`. Antes de escribir `<button className="...">`
o una tabla `<table>` a mano dentro de una feature, se debe:

1. Revisar el inventario de AGENTS.md §4.4 y `COMPONENTS.md`.
2. Si existe el componente → usarlo tal cual, o extenderlo vía props si
   le falta una variante (nunca duplicarlo).
3. Si no existe → antes de crearlo dentro de una feature, evaluar si el
   caso es realmente único o si conviene promoverlo a
   `apps/web/src/components/` como componente reutilizable. Por defecto,
   se promueve: un componente usado en una sola feature hoy probablemente
   se necesite en otra mañana (Sidebar, Header, tablas, formularios se
   repiten en todos los dominios de Equilogipsas).
4. Nunca crear una segunda versión de un componente que ya cumple el
   mismo propósito, aunque el nuevo caso tenga una variante visual
   distinta — se resuelve con props/variantes, no con un componente
   paralelo.
