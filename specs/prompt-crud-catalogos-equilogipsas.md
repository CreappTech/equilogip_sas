# Prompt: CRUD de tablas maestras (catálogos) — Equilogipsas

## Contexto obligatorio

Antes de hacer cualquier cambio, leé:

```text
AGENTS.md
CONSTITUTION.md
ARCHITECTURE.md
```

Este trabajo debe respetar íntegramente esos documentos. En particular:

- No inventar tablas, columnas, componentes ni patrones que no existan (AGENTS.md §5).
- Reutilizar componentes, hooks, queries y patrones ya existentes en el proyecto antes de crear nuevos (AGENTS.md §6).
- Toda modificación de base de datos se hace mediante migración versionada, revisando antes migraciones, tablas relacionadas, FKs, índices, RLS y convenciones de naming existentes (AGENTS.md §7).
- No usar Prisma. No introducir un ORM (CONSTITUTION.md §3, §10 de ARCHITECTURE.md).
- No usar Supabase Admin/service role desde el cliente. Distinguir correctamente Browser client / Server client / Admin client (AGENTS.md §8).
- No usar `snake_case` inconsistente: seguir el naming ya usado en el proyecto (ARCHITECTURE.md §9).
- RLS obligatorio en toda tabla nueva con información de negocio. Nunca desactivar RLS para "resolver" un error (AGENTS.md §11, CONSTITUTION.md §5).
- No mezclar UI + queries + mutations + validación + lógica de negocio en un mismo componente (AGENTS.md §14).
- Mobile-first en toda interfaz nueva (CONSTITUTION.md §13, AGENTS.md §13).
- No usar mock data ni datos hardcodeados salvo que sea parte explícita de la funcionalidad (AGENTS.md §15).
- Todo listado debe contemplar `loading / empty / error / success`. Todo formulario debe contemplar `idle / submitting / success / error`, sin permitir doble envío (AGENTS.md §16, §12).
- Historial: preferir borrado lógico (`estado: activo/inactivo`) en vez de eliminación física cuando la trazabilidad importe (CONSTITUTION.md §9).
- Usar React Hook Form + Zod para todos los formularios, tal como ya está adoptado en el proyecto (CONSTITUTION.md §3, §12; ARCHITECTURE.md §12).
- Tarea pequeña y acotada: esta tarea es **solo catálogos**, no tocar módulos de negocio (activos, mantenimiento, finanzas, etc.) ni sus formularios todavía (AGENTS.md §3, §26).

---

## Objetivo de esta tarea

Crear el **CRUD completo** (backend + UI mínima de administración) de las siguientes tablas maestras/catálogo, que van a servir de referencia (FK) al resto de los módulos del sistema. **No** desarrollar todavía los formularios de negocio que las consumen (vehículos, empleados, mantenimiento, ingresos, gastos, etc.) — eso es una tarea posterior y fuera de alcance aquí.

### Catálogos a crear

**Activos**
- `tipos_activo`
- `marcas`
- `modelos` (FK → `marcas`)
- `categorias_activo`
- `estados_activo`
- `unidades_medida`

**Empleados**
- `cargos`
- `departamentos` (si el negocio lo requiere; confirmar antes de crear — ver "Antes de implementar")
- `tipos_documento_identidad`

**Mantenimiento**
- `tipos_mantenimiento`
- `proveedores` (tabla compartida entre mantenimiento y finanzas — crear una sola vez)
- `tipos_repuesto_servicio`

**Actividades**
- `tipos_actividad`

**Finanzas**
- `categorias_ingreso`
- `categorias_gasto`
- `clientes`

**Horas y liquidaciones**
- `conceptos_liquidacion`
- `tipos_hora`

**Autorización** (si aún no existen — verificar primero)
- `roles`
- `permisos`
- `roles_permisos`
- `usuarios_roles`

> Nota: `proveedores` aparece en dos dominios (mantenimiento y finanzas). Crear una única tabla y reutilizarla — no duplicar (AGENTS.md §6, CONSTITUTION.md §2.2 por analogía de "evitar duplicar lógica").

---

## Antes de implementar (obligatorio)

1. Revisar `supabase/migrations/` para confirmar qué catálogos **ya existen** y cuáles realmente faltan. No recrear nada existente.
2. Revisar la estructura de `features/` y `lib/` actual para identificar el patrón real de queries/actions/services ya establecido en el proyecto, y replicarlo — no inventar uno nuevo.
3. Para cada catálogo, decidir explícitamente si conviene:
   - una **tabla completa** (cuando el catálogo necesita atributos adicionales, o el usuario final debe poder gestionarlo desde la UI), o
   - un **enum de PostgreSQL** (cuando la lista es fija, corta y no requiere atributos adicionales ni gestión por UI).
   Dejar esta decisión documentada por catálogo en el informe final. Ante la duda, priorizar la solución más simple (CONSTITUTION.md §15).
4. Si algún nombre de catálogo genera dudas sobre si ya existe con otro nombre, o si corresponde a una decisión arquitectónica (por ejemplo `departamentos`, o si `clientes` debería ser una tabla separada o una vista de `proveedores`/`terceros`), **detenerse y preguntar** antes de crear (AGENTS.md §5, §18). No asumir.

---

## Qué debe incluir el CRUD de cada tabla

### Base de datos
- Migración versionada con: tabla, columnas tipadas correctamente, FKs explícitas, índices donde correspondan, columna de estado (`activo`/`inactivo`) en vez de borrado físico salvo que el catálogo no tenga relevancia histórica.
- RLS habilitado: lectura para usuarios autenticados (ajustar si el negocio requiere restricción adicional), escritura restringida a permisos de administración de catálogos (ej. `catalogos.<nombre>.crear`, `.editar`, `.eliminar`), siguiendo el modelo de permisos `modulo.recurso.accion` de ARCHITECTURE.md §14.
- Naming en `snake_case`, consistente con el resto de la base de datos.

### Capa de acceso a datos
- Query/action/service por catálogo, siguiendo el patrón `feature → query/action/service → Supabase` ya definido (ARCHITECTURE.md §11). No hacer llamadas Supabase directamente desde componentes.
- Distinguir claramente si la operación corre en cliente o servidor.

### UI mínima de administración
- Listado con `loading / empty / error / success`.
- Formulario de alta/edición con React Hook Form + Zod, estados `idle / submitting / success / error`, sin doble envío.
- Acción de desactivar (no eliminar físicamente) salvo que se confirme que el catálogo no tiene impacto en trazabilidad.
- Mobile-first: debe funcionar correctamente en móvil, tablet y desktop.
- Reutilizar componentes compartidos ya existentes en el proyecto (`Button`, `Input`, `Select`, `Table`/`DataTable`, `Modal`, `Badge`, `FormField`, `EmptyState`, `LoadingState`, `ErrorState`, etc.) en vez de crear versiones nuevas, salvo que no exista uno equivalente.

### Validación
- Zod schema por catálogo.
- Validación también en base de datos/servidor cuando la integridad lo requiera (no confiar solo en el frontend).

---

## Orden de trabajo sugerido

Procesar los catálogos de a uno o en grupos pequeños relacionados (no todo junto en un solo cambio masivo, por AGENTS.md §26 y §30):

1. Autorización (`roles`, `permisos`, `roles_permisos`, `usuarios_roles`) — si no existen, ya que el resto de catálogos depende de sus permisos para RLS.
2. Catálogos de Activos.
3. Catálogos de Empleados.
4. Catálogos de Mantenimiento (incluye `proveedores`).
5. Catálogos de Actividades.
6. Catálogos de Finanzas (reutilizar `proveedores`).
7. Catálogos de Horas y Liquidaciones.

Después de cada grupo: implementar → validar (`lint`, `typecheck`, `test`, `build` según existan en `package.json`) → corregir, antes de avanzar al siguiente (AGENTS.md §23).

---

## Fuera de alcance (explícitamente)

- Formularios de negocio que consumen estos catálogos (vehículos, máquinas, equipos, mantenimiento, ingresos, gastos, actividades, liquidaciones, etc.).
- Dashboard, reportes o KPIs.
- Cualquier lógica financiera derivada.

---

## Informe final requerido

Al terminar, entregar el informe en el formato definido en AGENTS.md §25:

```text
## Implementado
## Archivos modificados
## Migraciones creadas
## Validaciones
lint: PASS/FAIL
typecheck: PASS/FAIL
test: PASS/FAIL
build: PASS/FAIL
## Problemas encontrados
## Pendientes
```

Incluir además, por cada catálogo: si se creó como tabla o enum, y por qué.
