# features/

Lógica de dominio de Equilogipsas: queries, actions, schemas Zod, tipos y hooks de negocio.

## Estructura interna de un feature

```text
features/{dominio}/
├── queries/       # lecturas a Supabase
├── actions/        # mutaciones (create/update/delete), server actions
├── schemas/         # Zod schemas de validación
├── types/            # tipos del dominio
└── hooks/             # hooks de React específicos del dominio (si aplica)
```

**Regla importante**: Ningún feature contiene componentes visuales genéricos. Esos van en `apps/web/src/components/`.

## Regla de ubicación (ARCHITECTURE.md §5.1)

- ¿El archivo llama a Supabase, valida con Zod, o contiene una regla de negocio (cálculo financiero, elegibilidad, permisos)? → `features/{dominio}/`
- ¿El archivo es solo presentación (recibe props, renderiza, no sabe de dónde vienen los datos)? → `components/`

## Dominios actuales (ARQ-011)

- `activos/` — Vehículos, máquinas, equipos
- `empleados/` — Gestión de personal
- `mantenimiento/` — Registros de mantenimiento de activos
- `finanzas/` — Ingresos, gastos, cálculos financieros
- `horas/` — Horas trabajadas
- `liquidaciones/` — Liquidaciones de empleados
- `reportes/` — Reportes y exportación
- `dashboard/` — KPIs y métricas agregadas

## Convenciones

- **Carpetas y archivos de dominio**: `snake_case` en base de datos, `kebab-case` en carpetas de features, `PascalCase` en componentes React
- **Schemas Zod**: Validación en cliente (formularios) y servidor (acciones)
- **Server Actions**: Toda mutación debe verificar permisos (`AGENTS.md` §10)
- **Queries**: Centralizadas aquí, no repetidas en componentes
