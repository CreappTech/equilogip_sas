# EQUILOGIPSAS — ARCHITECTURE

## 1. Objetivo

Definir la arquitectura técnica de Equilogipsas.

La arquitectura debe permitir construir inicialmente una aplicación web y posteriormente incorporar:

- aplicación móvil.
- APIs.
- inteligencia artificial.
- reportes avanzados.
- analítica.

---

# 2. Arquitectura general

```text
┌──────────────────────────────┐
│          CLIENTES            │
├──────────────────────────────┤
│ Web                          │
│ Futura APK                   │
└──────────────┬───────────────┘
               │
               ↓
┌──────────────────────────────┐
│        APPLICATION           │
├──────────────────────────────┤
│ Next.js 16 (App Router)      │
│ React 19                     │
│ Server Components            │
│ Server Actions / API         │
│ UI base: TailAdmin           │ ← ver §5.1
└──────────────┬───────────────┘
               │
               ↓
┌──────────────────────────────┐
│          DOMAIN               │
├──────────────────────────────┤
│ Activos                      │
│ Empleados                    │
│ Mantenimiento                │
│ Actividades                  │
│ Finanzas                     │
│ Horas                        │
│ Liquidaciones                │
└──────────────┬───────────────┘
               │
               ↓
┌──────────────────────────────┐
│          SUPABASE            │
├──────────────────────────────┤
│ PostgreSQL                   │
│ Auth                         │
│ RLS                          │
│ Storage                      │
│ Functions                    │
└──────────────────────────────┘
```

---

# 3. Capas

La aplicación debe mantener separación entre:

```text
UI
↓
Application
↓
Domain
↓
Data
```

No colocar lógica de negocio compleja directamente en componentes React.

---

# 4. Frontend

Next.js será responsable de:

- routing.
- rendering.
- layouts.
- navegación.
- formularios.
- interacción.
- visualización.
- experiencia de usuario.

React será responsable de los componentes interactivos.

---

# 5. Organización por features — decisión de estructura (monorepo)

> **Estado: decidido.** El proyecto utiliza un **monorepo** con la app
> web en `apps/web/`. La estructura interna sigue el modelo híbrido
> con `app/`, `components/`, `features/`. Ver el detalle completo del
> inventario heredado en `AGENTS.md` §4.

## 5.1 Modelo adoptado: monorepo híbrido

```text
equilogipsas/
├── apps/
│   └── web/                    # la app Next.js actual (TailAdmin + Equilogipsas)
│       └── src/
│           ├── app/             # rutas y layouts (Next.js App Router)
│           │   ├── (admin)/      # Layout con sidebar+header — NO CAMBIA
│           │   └── (full-width-pages)/  # auth, error — NO CAMBIA
│           │
│           ├── components/       # UI puramente visual y reutilizable
│           │   ├── ui/            # Button, Modal, Badge, Table, Alert...
│           │   ├── form/          # Form, Label, InputField, Select...
│           │   ├── common/        # ComponentCard, PageBreadCrumb...
│           │   └── ecommerce/, charts/, etc.  # Widgets heredados del template
│           │                          # NO CAMBIA — sigue siendo la referencia
│           │                          # obligatoria antes de crear UI nueva
│           │
│           ├── features/         # Lógica de dominio — CAPA NUEVA
│           │   ├── activos/
│           │   ├── empleados/
│           │   ├── mantenimiento/
│           │   ├── actividades/
│           │   ├── finanzas/
│           │   ├── horas/
│           │   ├── liquidaciones/
│           │   ├── reportes/
│           │   └── dashboard/
│           │       └── cada feature contiene:
│           │           queries/actions (Supabase),
│           │           schemas (Zod), tipos, hooks de negocio.
│           │           NO contiene componentes visuales genéricos — esos
│           │           siguen viviendo en apps/web/src/components/*.
│           │
│           ├── context/          # ThemeContext, SidebarContext — NO CAMBIA
│           ├── hooks/            # useModal, useGoBack + hooks de negocio
│           │                      # nuevos si no pertenecen a una feature
│           │                      # específica
│           ├── icons/            # NO CAMBIA
│           └── lib/              # Clientes Supabase (browser/server/admin),
│                                   # utilidades transversales
│
├── packages/                    # código compartido, reutilizable fuera de apps/web
│   ├── ui/                      # design system compartido (futuro; hoy scaffold)
│   ├── types/                    # tipos compartidos (Database types de Supabase, DTOs)
│   └── config/                  # tsconfig base, eslint base, prettier
│
├── supabase/                    # única fuente de verdad de base de datos
│   ├── migrations/
│   ├── functions/
│   ├── seed.sql
│   └── config.toml
│
└── skills/                      # skills de agentes (convenciones, playbooks)
```

**Regla de ubicación** (resuelve la ambigüedad "¿esto va en `components/`
o en `features/`?"):

- ¿El archivo llama a Supabase, valida con Zod, o contiene una regla de
  negocio (cálculo financiero, elegibilidad, permisos)? → `apps/web/src/features/{dominio}/`.
- ¿El archivo es solo presentación (recibe props, renderiza, no sabe de
  dónde vienen los datos)? → `apps/web/src/components/*`.
- Un componente de `apps/web/src/components/ecommerce/RecentOrders.tsx`
  puede seguir existiendo tal cual como shell visual; el feature
  `apps/web/src/features/finanzas/queries/getRecentOrders.ts` (o equivalente)
  es quien le provee los datos reales de Supabase reemplazando el arreglo
  hardcodeado. Ver `AGENTS.md` §15 para el tratamiento de esa migración.

## 5.2 Por qué esta decisión y no otra

Se evaluaron tres opciones (registradas en `AUDITORIA_FUSION_AGENTES.md`
§4): mantener la estructura del template sin cambios, migrar todo a
`features/` de inmediato, o el modelo híbrido de arriba. Se adoptó el
híbrido porque:

- No requiere reescribir ni mover el código de UI ya funcional heredado
  de TailAdmin (cumple la regla de cambio mínimo de `AGENTS.md` §2).
- Da un lugar claro y nuevo para la lógica de negocio real de Equilogipsas
  (Supabase, Zod, reglas financieras) sin mezclarla con componentes
  visuales, cumpliendo la separación de capas de §3.
- Es reversible/ampliable: si en el futuro se decide migrar componentes
  visuales también a `features/`, se hace como tarea explícita y acotada
  (`AGENTS.md` §18), no como parte de esta decisión.

Cualquier cambio a este modelo es un cambio arquitectónico y requiere
aprobación explícita (`CONSTITUTION.md` §18).

---

# 6. Activos

El dominio de activos es central.

## 6.1 Modelo implementado (Fase 4)

Jerarquía por especialización de tabla:

```text
activos                      (datos comunes: id uuid PK, tipo, subtipo (6 tipos de
 │                             equipo de flota), codigo_interno, nombre (derivado
 │                             de marca+modelo, nullable), estado (ciclo de vida),
 │                             estado_operativo, fecha_adquisicion, color,
 │                             numero_motor, lectura_inicial, serie, origen,
 │                             centro_servicio_id -> centros_servicio,
 │                             proveedor_id -> proveedores,
 │                             datos_tecnicos JSONB, datos_fabricante JSONB,
 │                             created_at, updated_at)
 ├── vehiculos               (1:1 — FK activos.id; placa obligatoria; marca/modelo/anio)
 ├── maquinas                (1:1 — FK activos.id; marca/modelo/anio)
 └── equipos                 (1:1 — FK activos.id; marca/modelo/anio)
```

Reglas del dominio:

- `tipo` es inmutable (`vehiculo | maquina | equipo`); intentar
  cambiarlo lanza un error vía trigger en la propia base.
- La especialidad debe coincidir con el tipo (trigger de consistencia).
- `subtipo` debe ser consistente con la categoría (trigger
  `trg_activos_verificar_subtipo`: vehículo ⇒ MOTOCICLETA/AUTOMOVIL,
  maquinaria ⇒ MONTACARGAS/CARGADOR_FRONTAL/RETROEXCAVADORA, equipo ⇒
  YALE_MANUAL). El formulario de flota replica la estructura de campos del
  módulo Flota de "equilogip"; la ficha técnica y la información del
  fabricante se guardan como JSONB (catálogo de campos en
  `features/activos/types/fichaTecnica.ts`).
- **"Eliminar" un activo = cambiar estado a `retirado`** (nunca DELETE).
  `retirado` es terminal: un activo retirado ya no puede editarse
  (lo garantizan las policies de RLS).
- Editar datos no permite fijar `retirado`; eso solo lo hace la acción
  de retiro, que requiere `activos.<tipo>.eliminar`.
- Si `origen = SUBARRENDADA`, `proveedor_id` es obligatorio y nulo cuando
  `origen = PROPIA` (constraint `activos_proveedor_check`).

Permisos (`AGENTS.md` §4.8 y §4.10): `activos.activos.*` (genéricos para
selección/filtros) y `activos.<vehiculos|maquinas|equipos>.{ver,crear,editar,eliminar}`
(13 códigos en total, sembrados en `AUTH_SUPER_ADMIN` y `AUTH_ADMIN`).

Código de dominio: `apps/web/src/features/activos/` (types, schemas,
queries, actions). UI en `apps/web/src/app/activos/`. Las acciones de
crear/actualizar devuelven `ResultadoActivo` y usan compensación si falla
la especialidad, para no dejar un activo huérfano.

---

# 6.2 Empleados (Fase 5)

Entidad simple, sin especialización por tipo:

```text
empleados                    (id uuid PK, nombres, apellidos,
  │                            documento_identidad UNIQUE (alfanumérico libre),
  │                            fecha_nacimiento?, fecha_ingreso · NOT NULL,
  │                            cargo_id → cargos.id · obligatoria,
  │                            estado (activo|inactivo|retirado · DEFAULT activo),
  │                            telefono?, email_contacto?,
  │                            created_at, updated_at)
  │
  └── profiles.fk_empleado_id  (1:N, UNIQUE, ON DELETE SET NULL,
                                 vínculo opcional usuarios ↔ empleados)
```

Reglas del dominio:

- `cargo` es FK obligatoria al catálogo `cargos` (tabla maestra creada en
  el módulo de catálogos). Leer `cargos` no exige permiso extra: su policy
  SELECT valida solo `tenant_id`.
- **"Eliminar" un empleado = cambiar estado a `retirado`** (nunca DELETE;
  no existe policy DELETE). `retirado` es terminal: detalle y edición
  redirigen y la acción de edición lo bloquea en servidor.
- El vínculo con `profiles` completa la columna que Fase 3 dejó nullable
  sin FK: ahora `profiles.fk_empleado_id NOT NULL` (FK) UNIQUE, opcional en
  ambas direcciones. Requiere el doble permiso servidor
  `empleados.empleados.vincular_usuario` **y** `auth.usuarios.editar`.

Permisos (`AGENTS.md` §4.11): `empleados.empleados.{ver,crear,editar,eliminar,
vincular_usuario}` (5 códigos; `AUTH_ADMIN` y `AUTH_SUPER_ADMIN` reciben los 5,
`CONSULTA` solo `ver`). RLS: policies por `has_permission`, retiro con
`eliminar`. Sin `tenant_id` en la tabla.

Código de dominio: `apps/web/src/features/empleados/` (types, schemas,
queries, actions). UI en `apps/web/src/app/empleados/` (listado, `nuevo`,
`[id]` detalle, `[id]/editar` con bloque "Usuario del sistema").

---

# 7. Relaciones principales

El modelo conceptual inicial:

```text
ACTIVO
 │
 ├── MANTENIMIENTO
 │
 ├── INGRESOS
 │
 ├── GASTOS
 │
 ├── ACTIVIDADES
 │
 └── HORAS DE OPERACIÓN
```

Empleados:

```text
EMPLEADO
 │
 ├── ACTIVIDADES
 ├── HORAS TRABAJADAS
 └── LIQUIDACIONES
```

Finanzas:

```text
INGRESO ──────┐
              ├── ACTIVIDAD / ACTIVO
GASTO ────────┘
```

---

# 8. Base de datos

Supabase PostgreSQL será la fuente de verdad.

Las migraciones deben mantenerse versionadas.

Ejemplo:

```text
supabase/
└── migrations/
```

Nunca modificar manualmente producción sin una migración equivalente.

---

# 9. Naming de base de datos

Usar nombres consistentes.

Preferir:

```text
snake_case
```

Ejemplo:

```text
empleados
vehiculos
maquinas
equipos
mantenimientos
mantenimientos_detalle
ingresos
gastos
actividades
horas_trabajadas
liquidaciones
```

Los nombres deben ser descriptivos.

---

# 10. Supabase

Utilizar:

```text
Supabase Auth
Supabase PostgreSQL
Supabase RLS
Supabase Storage
```

cuando corresponda.

No utilizar Prisma.

No crear una capa ORM innecesaria.

Clientes Supabase (browser / server / admin) viven en `apps/web/src/lib/` — no crear
un cliente nuevo si ya existe uno adecuado (`AGENTS.md` §8).

---

# 11. Acceso a datos

El acceso a datos debe centralizarse según las convenciones del proyecto.

Evitar consultas SQL repetidas directamente dentro de componentes.

Preferir:

```text
feature (apps/web/src/features/{dominio}/)
↓
query/action/service
↓
Supabase
```

Ver §5.1 para dónde vive cada pieza exactamente.

---

# 12. Validación

Los formularios utilizarán:

```text
React Hook Form
+
Zod
```

ya instaladas y aprobadas — ver `AGENTS.md` §4.2. La capa visual del
formulario (`Form.tsx`, `InputField.tsx`, etc.) viene de
`apps/web/src/components/form/`; el schema de Zod y el submit handler viven en
`apps/web/src/features/{dominio}/`.

La validación debe existir también del lado servidor cuando la operación lo requiera.

---

# 13. Autenticación

```text
Supabase Auth
        ↓
auth.users
        ↓
usuarios
```

El registro de usuario de negocio no debe sustituir `auth.users`.

Los componentes visuales `SignInForm`/`SignUpForm` heredados de TailAdmin
son el punto de partida de UI; la lógica real de sesión se conecta siguiendo
esta sección (ver también `CONSTITUTION.md` §3.1).

---

# 14. Autorización

Modelo:

```text
usuario
   ↓
usuarios_roles
   ↓
roles
   ↓
roles_permisos
   ↓
permisos
```

Los permisos seguirán una convención:

```text
modulo.recurso.accion
```

Ejemplo:

```text
activos.vehiculos.ver
activos.vehiculos.crear
activos.vehiculos.editar
mantenimiento.registros.ver
mantenimiento.registros.crear
finanzas.gastos.ver
finanzas.gastos.crear
```

---

# 15. Seguridad

La seguridad debe existir en varias capas:

```text
Browser
↓
Next.js
↓
Server
↓
Supabase
↓
RLS
```

Ocultar una opción de navegación no equivale a autorización.

---

# 16. Dominio financiero

El sistema debe permitir relacionar:

```text
Ingreso
Gasto
Activo
Actividad
Empleado
Proveedor
Cliente
Período
```

Esto permitirá posteriormente construir:

```text
Ingreso total
Gasto total
Costo operativo
Resultado
Margen
```

---

# 17. Dashboard

El dashboard consume información agregada.

No debe contener lógica compleja de negocio dentro de los componentes visuales.

Conceptualmente:

```text
Database
↓
Queries / Views / Functions  (apps/web/src/features/dashboard/)
↓
KPIs
↓
Dashboard (apps/web/src/components/ecommerce/*, apps/web/src/app/(admin)/page.tsx)
```

Los widgets visuales del dashboard heredados de TailAdmin (Metrics,
MonthlyTarget, RecentOrders, CountryMap, etc.) permanecen como capa de
presentación; dejan de recibir datos hardcodeados a medida que
`features/dashboard/` provea los reales (ver `AGENTS.md` §15).

Los indicadores deben tener una definición clara.

---

# 18. Reportes

Los reportes deben utilizar la misma fuente de datos que el dashboard.

No mantener cálculos independientes que produzcan resultados diferentes.

Debe existir una única definición para indicadores importantes.

---

# 19. Auditoría

Las operaciones críticas deben poder auditarse.

Especialmente:

```text
Usuarios
Roles
Permisos
Activos
Mantenimiento
Ingresos
Gastos
Liquidaciones
```

---

# 20. Archivos

Los documentos o evidencias asociados a operaciones deben utilizar Supabase Storage cuando corresponda.

La base de datos debe almacenar referencias, no archivos binarios directamente.

---

# 21. Preparación para APK

La aplicación web no debe contener lógica empresarial imposible de reutilizar.

La futura aplicación móvil deberá consumir:

```text
Supabase
o
API/servicios
```

según la arquitectura futura.

No duplicar reglas de negocio entre web y móvil. La separación de §5.1
(lógica en `features/`, presentación en `components/`) existe en parte
para facilitar esto: `features/` es reutilizable fuera de los componentes
visuales web-específicos.

---

# 22. Preparación para IA

La arquitectura debe permitir posteriormente:

```text
AI
 ↓
Application / AI Service
 ↓
Queries controladas
 ↓
Domain
 ↓
Database
```

La IA no debe ejecutar SQL arbitrario directamente sobre producción.

---

# 23. Principio de evolución

La arquitectura debe permitir añadir:

```text
nuevo módulo
```

sin modificar radicalmente:

```text
autenticación
autorización
UI foundation
database foundation
```

Los módulos deben ser relativamente independientes.

---

# 24. Regla para nuevos módulos

Antes de crear un nuevo módulo:

1. identificar entidades existentes reutilizables.
2. identificar componentes reutilizables (`AGENTS.md` §4.4).
3. identificar permisos existentes.
4. identificar relaciones existentes.
5. evitar duplicación.
6. definir primero el modelo de dominio (en `apps/web/src/features/{dominio}/`).
7. implementar después la interfaz (en `apps/web/src/components/*` o `apps/web/src/app/*`).

---

# 25. Regla de dependencia

Evitar dependencias circulares entre features.

Preferir:

```text
shared (apps/web/src/components/, apps/web/src/lib/)
   ↑
domain (apps/web/src/features/)
   ↑
pages (apps/web/src/app/)
```

y no:

```text
feature A ↔ feature B ↔ feature C
```

sin una razón arquitectónica clara.

---

# 26. Evolución tecnológica

La arquitectura actual está optimizada para:

```text
Web (sobre base TailAdmin)
+
Supabase
```

La arquitectura futura podrá evolucionar hacia:

```text
Web
+
Mobile
+
AI
+
Analytics
```

sin reconstruir el dominio central.
