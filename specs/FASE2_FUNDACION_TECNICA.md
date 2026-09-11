# EQUILOGIPSAS — FASE 2: FUNDACIÓN TÉCNICA

> Alcance de esta fase: **componentes, patrones y convenciones reutilizables
> únicos**. Todavía no se crean tablas de negocio reales (se mantiene el
> límite fijado en Fase 1). Los patrones de datos se validan con una
> entidad de ejemplo no-negocio, nunca con datos que aparenten ser reales
> (`AGENTS.md` §15).

Referencias: `AGENTS.md`, `CONSTITUTION.md`, `ARCHITECTURE.md`,
`FASE1_ARQUITECTURA.md`.

---

## 0. Principio rector: la regla del componente único

> No se le pide al agente "crea un botón". Se construye `Button` una vez;
> todo lo demás usa `<Button />`. Lo mismo aplica a `DataTable`,
> `FormField`, `Modal`, `Drawer`, `PageHeader`, `SearchInput`,
> `StatusBadge`, etc.

Esta regla se agrega formalmente a `AGENTS.md` como nueva sección (tarea
FND-000):

```text
§33. Regla del componente único

Ningún agente debe escribir markup de UI ad-hoc para un caso puntual
(botones, tablas, formularios, estados vacíos, diálogos de confirmación)
si ya existe un componente canónico para ese propósito en
apps/web/src/components/. Antes de escribir <button className="...">
o una tabla <table> a mano dentro de una feature, se debe:

1. Revisar el inventario de AGENTS.md §4.4 y esta Fase 2.
2. Si existe el componente → usarlo tal cual, o extenderlo vía props si
   le falta una variante (nunca duplicarlo).
3. Si no existe → antes de crearlo dentro de una feature, evaluar si el
   caso es realmente único o si conviene promoverlo a
   apps/web/src/components/ como componente reutilizable. Por defecto,
   se promueve: un componente usado en una sola feature hoy probablemente
   se necesite en otra mañana (Sidebar, Header, tablas, formularios se
   repiten en todos los dominios de Equilogipsas).
4. Nunca crear una segunda versión de un componente que ya cumple el
   mismo propósito, aunque el nuevo caso tenga una variante visual
   distinta — se resuelve con props/variantes, no con un componente
   paralelo.
```

---

## 1. Dónde viven estos componentes

Siguiendo `CONSTITUTION.md` §15 (no sobre-abstraer prematuramente):
**todos estos componentes se construyen en `apps/web/src/components/`**,
no en `packages/ui`. `packages/ui` (creado vacío en Fase 1, ARQ-007) se
mantiene vacío hasta que exista un segundo consumidor real (app móvil u
otro cliente) — mover código ahí antes de necesitarlo sería la
sobreingeniería que la Constitución pide evitar. Esta decisión queda
registrada aquí y es reversible sin ser un cambio arquitectónico mayor,
ya que es una simple relocalización de carpeta cuando llegue el momento.

---

## 2. Auditoría de inventario solicitado vs. real

| Componente pedido | Estado real (AGENTS.md §4.4) | Acción en esta fase |
|---|---|---|
| Sidebar | Existe: `layout/AppSidebar.tsx` | Auditar y validar que cubre el caso de uso de todos los dominios; no recrear |
| Header | Existe: `layout/AppHeader.tsx` | Auditar, no recrear |
| Mobile navigation | Existe parcialmente: `layout/Backdrop.tsx` + comportamiento responsive de `AppSidebar` | Auditar si cubre navegación móvil completa; si falta un patrón (ej. bottom nav), documentarlo como gap explícito, no asumir que ya está resuelto |
| Breadcrumbs | Existe: `common/PageBreadCrumb.tsx` | Auditar, no recrear |
| Page header | **No existe** un compuesto dedicado (solo `ComponentCard` como wrapper genérico) | Crear `PageHeader` nuevo (título + breadcrumb + slot de acciones) |
| Button | Existe: `ui/button/Button.tsx` | Auditar variantes disponibles, no recrear |
| Input | Existe: `form/input/InputField.tsx` | Auditar, no recrear |
| Select | Existe: `form/Select.tsx`, `form/MultiSelect.tsx` | Auditar, no recrear |
| Combobox | **No existe** (Select no cubre búsqueda + selección) | Crear nuevo |
| Date picker | Existe: `form/date-picker.tsx` (flatpickr) | Auditar, no recrear |
| Modal | Existe: `ui/modal/index.tsx` + hook `useModal` | Auditar, no recrear |
| Drawer | **No existe** como componente genérico | Crear nuevo |
| Tabs | Existe `common/ChartTab.tsx` pero es específico de gráficos | Crear `Tabs` genérico; evaluar si `ChartTab` puede refactorizarse para usarlo internamente (tarea aparte, no bloqueante) |
| Card | Existe: `common/ComponentCard.tsx` | Auditar, no recrear |
| Badge | Existe: `ui/badge/Badge.tsx` | Auditar, no recrear |
| Table (primitivas) | Existe: `ui/table/index.tsx`, `tables/BasicTableOne.tsx` | Auditar, no recrear |
| Pagination | Existe: `tables/Pagination.tsx` | Auditar, no recrear |
| Empty state | **No existe** | Crear nuevo |
| Loading state | **No existe** (hay spinners puntuales, no un componente estándar) | Crear nuevo |
| Error state | **No existe** | Crear nuevo |
| Confirm dialog | No existe como componente genérico; hay ejemplo `example/ModalExample/ModalBasedAlerts.tsx` | Generalizar ese ejemplo en un `ConfirmDialog` reutilizable sobre `Modal`, no crear desde cero |
| DataTable (compuesto) | No existe — solo primitivas de tabla + Pagination por separado | Crear nuevo, componiendo `ui/table` + `Pagination` + Empty/Loading/Error state |
| FormField (compuesto) | No existe como compuesto — hoy `Label` + `InputField` se usan sueltos | Crear nuevo (envuelve Label + input + mensaje de error, conectado a RHF) |
| SearchInput | No existe | Crear nuevo (input + debounce, usado en listados) |
| StatusBadge | No existe (solo `Badge` genérico) | Crear nuevo sobre `Badge`, con mapeo semántico estado→color (activo/inactivo/pendiente/etc.) |
| Toast | No existe (hay `Alert` con variantes success/error/warning/info) | Construir sistema de notificación temporal adaptando `Alert` + un `ToastProvider` con contexto, tal como ya estaba anotado como adaptación pendiente en el inventario original |

---

## 3. Patrones de formularios

Estandarizar sobre `react-hook-form` + `zod` (ya aprobados, `AGENTS.md`
§4.2):

```text
useAppForm<T>(schema: ZodSchema<T>)
  → wrapper delgado sobre useForm + zodResolver, con defaults del
    proyecto (modo de validación, mensajes de error consistentes).

<FormField name="..." label="...">
  → une Label + InputField/Select/DatePicker + mensaje de error de RHF,
    para que cada formulario de negocio no repita ese cableado.

Patrón de submit:
  idle → submitting → success/error
  - success → toast de confirmación + (redirect o reset, según caso)
  - error → toast de error con mensaje transformado (AGENTS.md §17,
    nunca el error crudo de Supabase)
  - deshabilitar submit mientras submitting (evita doble envío)
```

---

## 4. Patrones de datos (list / detail / create / update / delete)

Sin tablas de negocio todavía, estos patrones se construyen **genéricos**
(TypeScript generics) y se validan con una entidad de ejemplo explícitamente
marcada como no-negocio (ej. `__demo_items`, fuera de cualquier dominio
real, o directamente con datos en memoria/mock declarados como tales).

```text
useResourceList<T>(source)      → estado {loading, empty, error, data}
useResourceDetail<T>(id, source) → estado {loading, error, data}
useResourceMutation<T>(action)   → estado {idle, submitting, success, error}

DataTable<T>
  columnas tipadas + integra Pagination + Empty/Loading/Error state
  automáticamente según el estado de useResourceList.
```

Regla explícita: cuando en Fase 3+ se cree el primer dominio real
(`empleados`, `activos`, o el que se priorice), su `queries/`, `actions/`
y componente de listado **reutilizan estos hooks/DataTable**, no
reinventan su propio manejo de loading/empty/error — ese es justamente el
ahorro de tokens que motiva esta fase.

---

## 5. Tareas atómicas

| ID | Tarea | Entregable | Depende de |
|---|---|---|---|
| FND-000 | Agregar §33 "Regla del componente único" a `AGENTS.md` (texto de sección 0) | `AGENTS.md` actualizado | — |
| FND-001 | Auditar `Sidebar`, `Header`, `Breadcrumbs`, `Button`, `Input`, `Select`, `Date picker`, `Modal`, `Card`, `Badge`, `Table`, `Pagination` existentes: documentar props actuales y qué variantes de negocio les faltan (si alguna) | Nota de auditoría por componente (puede ir en comentario JSDoc o en un `COMPONENTS.md`) | — |
| FND-002 | Auditar `mobile navigation` (`AppSidebar` + `Backdrop`): confirmar si cubre el caso de uso completo o falta un patrón adicional; documentar el gap si existe | Nota de auditoría, gap documentado si aplica | FND-001 |
| FND-003 | Crear `PageHeader` (título + breadcrumb vía `PageBreadCrumb` existente + slot de acciones) | `components/common/PageHeader.tsx` | FND-001 |
| FND-004 | Crear `Combobox` (búsqueda + selección, sin librería nueva — usar primitivas HTML + estado local, o evaluar si `Select`/`MultiSelect` existente puede extenderse antes de crear uno paralelo) | `components/form/Combobox.tsx` | FND-001 |
| FND-005 | Crear `Drawer` (panel lateral deslizante, reutilizando el patrón de overlay de `Modal`/`Backdrop` si aplica) | `components/ui/drawer/Drawer.tsx` | FND-001 |
| FND-006 | Crear `Tabs` genérico (evaluar reutilización interna de `ChartTab` como caso especial de `Tabs`, sin bloquear esta tarea si esa refactorización se difiere) | `components/ui/tabs/Tabs.tsx` | FND-001 |
| FND-007 | Crear `EmptyState`, `LoadingState`, `ErrorState` (tres componentes simples y consistentes visualmente entre sí) | 3 componentes en `components/ui/states/` | FND-001 |
| FND-008 | Generalizar `ConfirmDialog` a partir de `example/ModalExample/ModalBasedAlerts.tsx`, sobre el `Modal` existente | `components/ui/confirm-dialog/ConfirmDialog.tsx` | FND-001 |
| FND-009 | Construir sistema de `Toast`: adaptar `Alert` existente + `ToastProvider` (contexto) + hook `useToast()` | `components/ui/toast/*` | FND-001 |
| FND-010 | Construir `DataTable<T>` componiendo `ui/table` + `Pagination` + `EmptyState`/`LoadingState`/`ErrorState` (FND-007) | `components/ui/data-table/DataTable.tsx` | FND-001, FND-007 |
| FND-011 | Construir `FormField` (Label + input/select/date-picker + error de RHF) | `components/form/FormField.tsx` | FND-001 |
| FND-012 | Construir `SearchInput` (InputField + debounce) | `components/form/SearchInput.tsx` | FND-001 |
| FND-013 | Construir `StatusBadge` sobre `Badge`, con mapeo estado→variante centralizado (no repetir el mapeo por feature) | `components/common/StatusBadge.tsx` | FND-001 |
| FND-014 | Construir hook `useAppForm` (wrapper de `useForm` + `zodResolver`) | `lib/forms/useAppForm.ts` | — |
| FND-015 | Documentar y ejemplificar el patrón de submit (idle/submitting/success/error + toast) usando `useAppForm` + `FormField` + `Toast` en un formulario de ejemplo no-negocio | Ejemplo en `components/example/` o storybook-like page | FND-009, FND-011, FND-014 |
| FND-016 | Construir hooks genéricos `useResourceList`, `useResourceDetail`, `useResourceMutation` (tipados con generics, sin atarlos a ninguna tabla real) | `lib/data/useResource*.ts` | — |
| FND-017 | Validar `DataTable` + hooks de datos con una entidad de ejemplo explícitamente no-negocio (ver sección 4) | Página de ejemplo funcionando end-to-end (mock, no Supabase real) | FND-010, FND-016 |
| FND-018 | Actualizar `AGENTS.md` §4.4 con el inventario final de esta fase (componentes nuevos + confirmación de los auditados) para que quede como fuente de verdad vigente | `AGENTS.md` actualizado | FND-002 a FND-017 |
| FND-019 | Validación de cierre: `lint`, `typecheck`, `build` sobre `apps/web` con todos los componentes nuevos integrados | Reporte `PASS/FAIL` | FND-000 a FND-018 |

---

## 6. Criterio de salida de la Fase 2

- Cada componente de la lista original (layout + UI + compuestos) está
  **auditado y confirmado** (si ya existía) o **creado** (si no existía) —
  ninguno queda en estado ambiguo.
- `AGENTS.md` §4.4 y la nueva §33 reflejan el inventario real final, no el
  de TailAdmin sin actualizar.
- El patrón de formularios (`useAppForm` + `FormField` + `Toast`) y el
  patrón de datos (`useResource*` + `DataTable`) están **probados** con un
  caso no-negocio, no solo documentados en teoría.
- Ningún componente nuevo duplica a otro ya existente (verificado contra
  la tabla de auditoría de la sección 2).
- Sigue sin existir ninguna tabla de negocio real ni feature de dominio
  implementado — eso es Fase 3.

## 7. Siguiente fase (fuera de alcance de este documento)

Fase 3 — Primer módulo de negocio: se elige un dominio (según el mapeo
confirmado en Fase 1), se crea su primera migración + RLS real, y su
feature completo (`queries/actions/schemas`) conectado a los patrones de
`DataTable`, `FormField`, `Toast` y `useResource*` construidos en esta
fase — validando que efectivamente ahorran el trabajo repetido que
motivó esta Fase 2.
