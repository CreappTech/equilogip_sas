# EQUILOGIPSAS — FASE 1: ARQUITECTURA

> Alcance de esta fase: **solo andamiaje**. No se crean tablas de negocio,
> no se implementan features, no se escriben queries reales. El objetivo es
> dejar la estructura de carpetas, convenciones y configuración base listas
> para que la Fase 2 (módulos de negocio) empiece sobre una base ya
> decidida, sin discutir estructura a mitad de la implementación.

Referencias: `AGENTS.md`, `CONSTITUTION.md`, `ARCHITECTURE.md`.

---

## 0. Decisión que esta fase introduce (requiere confirmación antes de ejecutar)

`ARCHITECTURE.md` §5 (vigente) define un modelo híbrido dentro de **una sola
app** Next.js: `app/`, `components/`, `features/`. Esta fase propone
**envolver eso en un monorepo**:

```text
equilogipsas/
├── apps/
│   └── web/              # la app Next.js actual (TailAdmin + Equilogipsas)
├── packages/              # código compartido, reutilizable fuera de apps/web
├── supabase/               # única fuente de verdad de base de datos
└── skills/                 # skills de agentes (convenciones, playbooks)
```

Esto **no descarta** la estructura interna de `apps/web` (`app/`,
`components/`, `features/` siguen existiendo, pero ahora *dentro de*
`apps/web/src/`) — lo que cambia es que aparece un nivel raíz nuevo y
paquetes compartidos. Por regla de `CONSTITUTION.md` §18 y `AGENTS.md` §18,
esto es un cambio estructural: la ARQ-014 de este documento actualiza
`ARCHITECTURE.md` §5 formalmente una vez confirmado.

**Mapeo de dominios a confirmar** (ver ARQ-011):

| Dominio nuevo propuesto | Dominios existentes que absorbería | Estado |
|---|---|---|
| `talento-humano` | `empleados`, `horas`, `liquidaciones` | Propuesto — confirmar |
| `produccion` | `activos`, `mantenimiento`, `actividades` | Propuesto — confirmar |
| `sst` | *(nuevo, no existía)* — Seguridad y Salud en el Trabajo | Nuevo dominio — falta definirlo en `CONSTITUTION.md` |
| `finanzas` | `finanzas` (sin cambio) | Igual que antes |
| `reportes`, `dashboard` | sin cambio, transversales | Igual que antes |

Si se confirma este mapeo, `CONSTITUTION.md` §1 y `ARCHITECTURE.md` §5.1
deben actualizarse (tarea ARQ-011/ARQ-014). Si no se confirma, las tareas de
esta fase que crean carpetas de dominio (ARQ-011) se ejecutan con los
nombres de dominio ya vigentes (`activos`, `empleados`, etc.) en vez de los
tres nuevos.

---

## 1. Estructura raíz del monorepo

```text
equilogipsas/
├── apps/
│   └── web/
├── packages/
│   ├── ui/                 # design system compartido (futuro; hoy solo scaffold)
│   ├── types/               # tipos compartidos (Database types de Supabase, DTOs)
│   └── config/               # tsconfig base, eslint base, prettier
├── supabase/
│   ├── migrations/
│   ├── functions/
│   ├── seed.sql
│   └── config.toml
├── skills/
│   └── (una carpeta por skill/convención de agente)
├── package.json             # workspace root
├── pnpm-workspace.yaml
└── AGENTS.md / CONSTITUTION.md / ARCHITECTURE.md
```

---

## 2. Frontend (`apps/web/src/`)

Sin cambios respecto a lo ya decidido en `ARCHITECTURE.md` §5.1, solo se
mueve un nivel adentro de `apps/web/`:

```text
apps/web/src/
├── app/          # rutas y layouts (Next.js App Router) — no cambia
├── components/   # UI puramente visual, heredada de TailAdmin — no cambia
├── features/     # lógica de dominio (queries, actions, schemas Zod)
├── lib/           # clientes Supabase (browser/server/admin), utils
├── hooks/         # hooks de negocio que no pertenecen a un solo feature
└── types/         # tipos específicos de la app web (no compartidos)
```

`packages/types` vs `apps/web/src/types`: lo que se comparte con un futuro
cliente móvil o con `supabase/functions` va en `packages/types`; lo que es
exclusivo de la web (props de componentes, tipos de UI) se queda en
`apps/web/src/types`.

---

## 3. Backend / Supabase (`supabase/`)

```text
supabase/
├── migrations/
│   └── <timestamp>_<descripcion_snake_case>.sql
├── functions/
│   └── <nombre-funcion>/
│       └── index.ts
├── seed.sql          # datos de desarrollo, nunca datos reales
└── config.toml
```

- **database**: toda tabla nace en una migración versionada en
  `migrations/`. Ninguna tabla se crea manualmente desde el dashboard de
  Supabase sin su migración equivalente (`AGENTS.md` §7).
- **RLS**: cada migración que crea una tabla de negocio debe incluir, en el
  mismo archivo o en uno inmediatamente siguiente, sus políticas RLS. No
  queda ninguna tabla de negocio sin política antes de cerrarse la tarea
  que la crea.
- **functions**: Edge Functions en Deno, una carpeta por función. Se usan
  solo cuando la lógica no puede vivir como query/RPC normal (webhooks,
  integraciones externas, cron jobs).
- **queries**: no viven en `supabase/`. Las queries desde la app viven en
  `apps/web/src/features/{dominio}/queries/` (o `packages/` si se
  comparten). `supabase/` es solo la fuente de verdad del esquema.

---

## 4. Convenciones

### 4.1 Estructura interna de un feature

```text
features/{dominio}/
├── queries/       # lecturas a Supabase
├── actions/        # mutaciones (create/update/delete), server actions
├── schemas/         # Zod schemas de validación
├── types/            # tipos del dominio
└── hooks/             # hooks de React específicos del dominio (si aplica)
```

Ningún feature contiene componentes visuales genéricos — esos van en
`apps/web/src/components/`.

### 4.2 Naming

- Carpetas y archivos de dominio: `snake_case` en base de datos,
  `kebab-case` en carpetas de features, `PascalCase` en componentes React.
- Migraciones: `<timestamp>_<verbo>_<entidad>.sql`, ej.
  `20260904120000_create_empleados.sql`.

### 4.3 Skills (`skills/`)

Una carpeta por skill/convención reutilizable por agentes (ej.
`skills/supabase-migration/`, `skills/feature-scaffold/`). Cada una con su
propio `SKILL.md` describiendo cuándo se activa y qué produce. No crear una
skill nueva si una existente ya cubre el caso (`AGENTS.md` §29).

---

## 5. Tareas atómicas

Cada tarea es intencionalmente pequeña (una carpeta, una config, una regla)
según `AGENTS.md` §26. Ninguna crea tablas de negocio ni lógica de dominio.

| ID | Tarea | Entregable | Depende de |
|---|---|---|---|
| ARQ-001 | Confirmar decisión de monorepo y mapeo de dominios (sección 0) | Aprobación registrada (comentario/commit) | — |
| ARQ-002 | Crear estructura raíz vacía (`apps/`, `packages/`, `supabase/`, `skills/`) con un `README.md` mínimo en cada una explicando su propósito | 4 carpetas + 4 README | ARQ-001 |
| ARQ-003 | Mover el proyecto Next.js actual a `apps/web/` sin modificar lógica interna (solo mover archivos y ajustar paths relativos que se rompan) | `apps/web/` funcional, `next dev` corre igual que antes | ARQ-002 |
| ARQ-004 | Configurar `pnpm-workspace.yaml` y `package.json` raíz con scripts (`dev`, `build`, `lint`, `typecheck`) que apunten a `apps/web` | Workspace root funcional, `pnpm install` desde la raíz | ARQ-003 |
| ARQ-005 | Crear `packages/config` con `tsconfig.base.json` y config base de ESLint; `apps/web` extiende de ahí | `packages/config` con 2 archivos, `apps/web` los referencia | ARQ-004 |
| ARQ-006 | Crear `packages/types` (vacío salvo `package.json` + `index.ts` placeholder) — se llena en Fase 2 con los `Database` types generados de Supabase | `packages/types` scaffold | ARQ-004 |
| ARQ-007 | Crear `packages/ui` (vacío salvo scaffold) — **no mover componentes todavía**, solo dejar el paquete listo para una futura extracción si se decide | `packages/ui` scaffold | ARQ-004 |
| ARQ-008 | Inicializar `supabase/` (`supabase init` o equivalente): `migrations/`, `functions/`, `seed.sql`, `config.toml` | Carpeta `supabase/` funcional, `supabase start` corre local | ARQ-002 |
| ARQ-009 | Documentar convención de naming de migraciones y de políticas RLS en `supabase/README.md` (sección 3 de este spec, formalizada) | `supabase/README.md` | ARQ-008 |
| ARQ-010 | Crear `apps/web/src/features/` vacío, con un `README.md` que documente la estructura interna de un feature (sección 4.1) | `features/README.md` | ARQ-003 |
| ARQ-011 | Crear las carpetas de dominio vacías dentro de `features/` según el mapeo confirmado en ARQ-001 (ej. `produccion/`, `talento-humano/`, `sst/`, `finanzas/`, `reportes/`, `dashboard/`), cada una solo con un `.gitkeep` o `README.md` de una línea | N carpetas vacías | ARQ-001, ARQ-010 |
| ARQ-012 | Crear `apps/web/src/lib/supabase/` con los 3 clientes (browser, server, admin) como scaffolds vacíos/mínimos, sin lógica de negocio todavía | 3 archivos scaffold | ARQ-003, ARQ-008 |
| ARQ-013 | Crear `.env.example` en la raíz del monorepo (no en `apps/web`, para que aplique a `supabase/functions` también) con las variables de `AGENTS.md` §4.5 | `.env.example` | ARQ-008 |
| ARQ-014 | Actualizar `ARCHITECTURE.md` §5 para reflejar el monorepo (reemplazar el diagrama de una sola app por el de sección 1-2 de este documento) | `ARCHITECTURE.md` actualizado | ARQ-001 a ARQ-013 |
| ARQ-015 | Actualizar `AGENTS.md` §4.3 y rutas mencionadas en todo el documento (`src/...` → `apps/web/src/...`) | `AGENTS.md` actualizado | ARQ-014 |
| ARQ-016 | Si se confirmó el mapeo de dominios (ARQ-001), actualizar `CONSTITUTION.md` §1 y la tabla de dominios, agregando la definición mínima del dominio nuevo `sst` (qué cubre, por qué es un dominio y no una sub-sección de otro) | `CONSTITUTION.md` actualizado | ARQ-001 |
| ARQ-017 | Crear `skills/README.md` documentando la convención de skills (sección 4.3) — sin crear skills concretas todavía | `skills/README.md` | ARQ-002 |
| ARQ-018 | Ejecutar validación de cierre de fase: `lint`, `typecheck`, `build` desde la raíz del monorepo sobre `apps/web` migrado, confirmar que no se rompió nada | Reporte con `PASS/FAIL` de cada validación | ARQ-003 a ARQ-013 |

---

## 6. Criterio de salida de la Fase 1

La fase se da por cerrada cuando:

- El monorepo compila y corre igual que antes de la migración (`ARQ-018`
  en `PASS`).
- `ARCHITECTURE.md`, `AGENTS.md` y (si aplica) `CONSTITUTION.md` reflejan
  la estructura real, no una aspiracional (regla de estos documentos: son
  inventario factual, no deseo).
- Ninguna tabla de negocio, RLS de negocio, ni componente de feature fue
  creado todavía — eso es explícitamente Fase 2.
- El mapeo de dominios de la sección 0 quedó confirmado o revertido, no
  ambiguo.

## 7. Siguiente fase (fuera de alcance de este documento)

Fase 2 — Módulos de negocio: primera entidad real (probablemente
`empleados` o `activos` según el dominio que se priorice), su migración,
su RLS, su feature completo (`queries/actions/schemas`) y su UI conectada,
como la primera tarea atómica de negocio siguiendo este mismo formato de
tabla.
