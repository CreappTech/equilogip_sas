# COMPONENTS.md — Inventario de componentes canónicos

> Fuente de la regla de "componente único" (AGENTS.md §33): antes de escribir
> markup de UI ad-hoc, revisar este inventario. Si el componente existe, usarlo
> tal cual o extenderlo vía props. Si no existe, evaluar promoverlo a
> `apps/web/src/components/` antes de crearlo dentro de una feature.
>
> Referencia técnica: tarea FND-001/002 de `FASE2_FUNDACION_TECNICA.md`.

## ui/

| Componente | Ruta | Propósito |
|---|---|---|
| `Button` | `components/ui/button/Button.tsx` | Botón canónico (`primary`/`outline`, `sm`/`md`, `startIcon`/`endIcon`, usa `twMerge`) |
| `Badge` | `components/ui/badge/Badge.tsx` | Etiqueta de estado/color (`BadgeColor` exportado) |
| `Alert` | `components/ui/alert/Alert.tsx` | Alerta inline (success/error/warning/info) |
| `Avatar` | `components/ui/avatar/Avatar.tsx` | Avatar de usuario |
| `Dropdown` | `components/ui/dropdown/Dropdown.tsx` | Menú desplegable (con `DropdownItem`) |
| `Modal` + `useModal` | `components/ui/modal/index.tsx` | Modal base + hook de apertura |
| `ConfirmDialog` | `components/ui/modal/ConfirmDialog.tsx` | Diálogo de confirmación destructiva/warning (sobre Modal + Button) |
| `Table` (`TableHeader/Body/Row/Cell`) | `components/ui/table/index.tsx` | Tabla base compound (TableCell acepta `colSpan`) |
| `DataTable<T>` | `components/ui/data-table/DataTable.tsx` | Tabla de datos con loading/empty/error/paginación (usa `Pagination` + states) |
| `EmptyState` | `components/ui/states/EmptyState.tsx` | Estado vacío (título/descripción/acción) |
| `LoadingState` | `components/ui/states/LoadingState.tsx` | Estado de carga (spinner + label) |
| `ErrorState` | `components/ui/states/ErrorState.tsx` | Estado de error con retry (usa `Button`) |
| `Tabs` | `components/ui/tabs/Tabs.tsx` | Pestañas controladas/autónomas (borde inferior) |
| `Drawer` | `components/ui/drawer/Drawer.tsx` | Panel lateral (right/left, título, footer, esc + fondo) |
| `ToastProvider` + `useToast` | `components/ui/toast/ToastProvider.tsx` | Notificaciones (success/error/warning/info vía `Alert`). Montado en `app/layout.tsx` |

## form/

| Componente | Ruta | Propósito |
|---|---|---|
| `Form` | `components/form/Form.tsx` | Wrapper `<form>` (preventDefault + onSubmit) |
| `Label` | `components/form/Label.tsx` | Etiqueta de campo |
| `FormField` | `components/form/FormField.tsx` | Campo completo: Label + children + error/hint (con `*` requerido) |
| `InputField` | `components/form/input/InputField.tsx` | Input textual (text/number/email/password/date/time; `min`/`max` aceptan número) |
| `TextArea` | `components/form/input/TextArea.tsx` | Área de texto |
| `Checkbox` | `components/form/input/Checkbox.tsx` | Checkbox con label |
| `Radio` | `components/form/input/Radio.tsx` | Radio group |
| `Select` | `components/form/Select.tsx` | Select nativo (options, placeholder) |
| `MultiSelect` | `components/form/MultiSelect.tsx` | Select múltiple (template) |
| `Combobox` | `components/form/Combobox.tsx` | Select con búsqueda por texto (búsqueda + lista) |
| `SearchInput` | `components/form/SearchInput.tsx` | Input de búsqueda con debounce (usa `InputField`) |
| `Switch` | `components/form/switch/Switch.tsx` | Toggle (template) |

## common/

| Componente | Ruta | Propósito |
|---|---|---|
| `PageHeader` | `components/common/PageHeader.tsx` | Encabezado de página (título/descripción/acciones) |
| `PageBreadcrumb` | `components/common/PageBreadCrumb.tsx` | Breadcrumb Inicio > página (incluye su propio h2) |
| `StatusBadge` | `components/common/StatusBadge.tsx` | `Badge` por estado (activo/mantenimiento/inactivo/retirado, mapeo configurable) |
| `ComponentCard` | `components/common/ComponentCard.tsx` | Tarjeta sección con header (título/desc/headerRight) |
| `ThemeToggleButton` | `components/common/ThemeToggleButton.tsx` | Toggle dark/light |
| `ChartTab` | `components/common/ChartTab.tsx` | Pestañas de gráficos (template) |
| `GridShape` | `components/common/GridShape.tsx` | Decoración de fondo |

## Hooks y lógica cliente

| Hook | Ruta | Propósito |
|---|---|---|
| `useModal` | `components/ui/modal/index.tsx` | Estado de apertura de `Modal` |
| `useGoBack` | `hooks/` | Navegación hacia atrás |
| `useAppForm` | `lib/forms/useAppForm.ts` | `useForm` + `zodResolver` (mode `onTouched`) tipado por schema |
| `useResourceList<T>` | `lib/data/use-resource-list.ts` | Listado con loading/error/refresh |
| `useResourceDetail<T>` | `lib/data/use-resource-detail.ts` | Detalle (data/setData/refresh) |
| `useResourceMutation<Args>` | `lib/data/use-resource-mutation.ts` | Mutación con status idle/submitting/success/error + `getErrorMessage` |
| `getErrorMessage` | `lib/data/error-message.ts` | Normaliza errores (PostgrestError/Error) a mensajes de usuario |

## Contextos / Providers

- `ThemeProvider` (`context/ThemeContext`)
- `SidebarProvider` (`context/SidebarContext`)
- `PermissionsProvider` + `usePermissions` (`lib/auth/permissions-provider.tsx`)
- `ToastProvider` (`components/ui/toast/ToastProvider.tsx`)

## Iconos

`apps/web/src/icons/*.svg` re-exportados vía `@svgr/webpack` en `apps/web/src/icons/index.tsx`.
Ícono nuevo → agregar `.svg` y exportarlo ahí.

## Convención de formularios de negocio

`useAppForm(schema)` (validación zod) + `Form` + `FormField` + `input/*`
como capa visual. Estados: `loading | validation | error | success`, sin
doble envío, todo vía `useResourceMutation`. Descartado el patrón de
"validación manual con `useState`".

## Pendiente de migrar

- `date-picker.tsx` (template vendored): **no instalado**. Usar
  `<Input type="date">` nativo vía `FormField`. Ver FASE2_FUNDACION_TECNICA.

## Ejemplos

- `app/examples/forms/page.tsx` — patrón de formulario (FormField + useAppForm + useResourceMutation + toast).
- `app/examples/data-table/page.tsx` — patrón de listado (DataTable + useResourceList + SearchInput + StatusBadge). Datos de ejemplo heredados, no productivos.