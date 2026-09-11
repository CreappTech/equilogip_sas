# packages/

Paquetes compartidos, reutilizables fuera de `apps/web` (futuro cliente móvil, supabase/functions, scripts).

- `config/` — Configuraciones base: `tsconfig.base.json`, eslint base, prettier.
- `types/` — Tipos compartidos: Database types generados de Supabase, DTOs.
- `ui/` — Design system compartido. Hoy solo scaffold; los componentes viven en `apps/web/src/components/`.