# EQUILOGIPSAS — FASE 4: PRIMER MÓDULO DE NEGOCIO — ACTIVOS

> Primera prueba real de todo lo construido en Fases 1-3: si este módulo
> necesita reinventar UI, manejo de datos o permisos, esas fases no
> cumplieron su objetivo. Todo lo que sigue reutiliza `DataTable`,
> `FormField`, `Toast`, `useAppForm`, `useResource*` (Fase 2) y
> `hasPermission()`/`usePermissions()` (Fase 3) sin excepción.

Referencias: `AGENTS.md`, `CONSTITUTION.md` §2.2, §9, §10,
`ARCHITECTURE.md` §6, §7, §14, `FASE2_FUNDACION_TECNICA.md`,
`FASE3_AUTENTICACION_AUTORIZACION.md`.

---

## 0. Decisiones tomadas por defecto (confirmar o corregir)

1. **Dominio elegido: `activos`** (no `produccion`, que era el nombre
   propuesto sin confirmar en `FASE1_ARQUITECTURA.md`). Uso el nombre ya
   vigente en `CONSTITUTION.md`/`ARCHITECTURE.md` porque el mapeo de
   dominios de Fase 1 nunca se confirmó. Si se confirma `produccion` como
   nombre de carpeta/feature, es un rename de `features/activos/` →
   `features/produccion/activos/`, sin tocar el modelo de datos.
2. **Eliminación de activos = cambio de estado, no `DELETE`.**
   `CONSTITUTION.md` §9 prohíbe borrar físicamente registros importantes
   cuando afecta trazabilidad. Un vehículo/máquina/equipo dado de baja
   pasa a estado `retirado`, nunca se borra la fila. El permiso
   `activos.*.eliminar` en realidad ejecuta este cambio de estado.
3. **Jerarquía activo → vehículo/máquina/equipo se modela por
   especialización de tabla** (una tabla base `activos` + una tabla por
   tipo con FK 1:1 a `activos.id`), siguiendo literalmente
   `CONSTITUTION.md` §2.2 ("propiedades comunes → activo, propiedades
   específicas → entidad especializada"). No se usa una tabla única con
   columnas nulleables por tipo ni JSONB — se prioriza integridad
   referencial y RLS por tipo, consistente con `CONSTITUTION.md` §8.

---

## 1. Modelo de datos

```text
activos                        (tabla base, común a los 3 tipos)
├── id (uuid, PK)
├── tipo ('vehiculo' | 'maquina' | 'equipo')  -- discriminador
├── codigo_interno (unique)
├── nombre
├── estado ('activo' | 'inactivo' | 'retirado')
├── fecha_adquisicion
├── created_at / updated_at
│
├── vehiculos          (1:1 con activos, solo si tipo = 'vehiculo')
│   ├── activo_id (PK, FK → activos.id)
│   ├── placa
│   ├── marca / modelo / anio
│   └── ...campos específicos de vehículo
│
├── maquinas           (1:1 con activos, solo si tipo = 'maquina')
│   ├── activo_id (PK, FK → activos.id)
│   └── ...campos específicos de máquina
│
└── equipos            (1:1 con activos, solo si tipo = 'equipo')
    ├── activo_id (PK, FK → activos.id)
    └── ...campos específicos de equipo
```

`activos.id` queda como el punto de referencia estable para todo lo que
se conecte después (`mantenimiento`, `ingresos`, `gastos`, `actividades`,
`horas de operación` — `ARCHITECTURE.md` §7), aunque esos dominios no se
construyen en esta fase.

### Permisos que registra este módulo (convención `modulo.recurso.accion`)

```text
activos.activos.ver          -- ver el listado unificado (los 3 tipos)
activos.vehiculos.ver / .crear / .editar / .eliminar
activos.maquinas.ver  / .crear / .editar / .eliminar
activos.equipos.ver   / .crear / .editar / .eliminar
```

`.eliminar` en cada caso corresponde al cambio de estado a `retirado`
(punto 0.2), no a un `DELETE` real.

---

## 2. Estructura del feature (`apps/web/src/features/activos/`)

Siguiendo la convención fijada en `ARCHITECTURE.md` §5.1 / §11:

```text
features/activos/
├── queries/
│   ├── listActivos.ts        -- lista unificada (tabla base, para DataTable)
│   ├── getActivoDetalle.ts    -- activo + su tabla especializada según tipo
│   ├── listVehiculos.ts       -- si se necesita vista filtrada por tipo
│   ├── listMaquinas.ts
│   └── listEquipos.ts
├── actions/
│   ├── createVehiculo.ts / createMaquina.ts / createEquipo.ts
│   ├── updateVehiculo.ts / updateMaquina.ts / updateEquipo.ts
│   └── retirarActivo.ts       -- cambia estado a 'retirado' (no DELETE)
├── schemas/
│   ├── activoBaseSchema.ts    -- campos comunes (Zod)
│   ├── vehiculoSchema.ts       -- extiende activoBaseSchema
│   ├── maquinaSchema.ts
│   └── equipoSchema.ts
├── types/
│   └── activo.types.ts
└── hooks/
    └── useActivosList.ts / useActivoDetalle.ts  (sobre useResource* de Fase 2)
```

---

## 3. UI (reutilizando Fase 2 y Fase 3, sin componentes nuevos)

| Pantalla | Ruta | Componentes reutilizados |
|---|---|---|
| Listado unificado | `(admin)/activos` | `PageHeader`, `SearchInput`, `DataTable`, `StatusBadge` (estado), filtro por `tipo` |
| Detalle de activo | `(admin)/activos/[id]` | `PageHeader`, `Tabs` (datos generales / específicos del tipo / futuro: mantenimiento), `StatusBadge` |
| Alta de activo | `(admin)/activos/nuevo` | Paso 1: selección de `tipo` (`Combobox` o `Tabs`); Paso 2: `FormField` + `useAppForm` con el schema correspondiente al tipo elegido |
| Edición de activo | `(admin)/activos/[id]/editar` | Igual que alta, precargado |
| Retiro de activo | Acción desde listado/detalle | `ConfirmDialog` (Fase 2) antes de ejecutar `retirarActivo` |

Todas las pantallas condicionan botones de crear/editar/retirar con
`usePermissions().can('activos.<tipo>.<accion>')` (Fase 3), y cada
`action` server-side vuelve a validar con `hasPermission()` antes de
escribir — nunca se confía solo en que el botón esté oculto
(`CONSTITUTION.md` §5).

---

## 4. Tareas atómicas

| ID | Tarea | Entregable | Depende de |
|---|---|---|---|
| ACT-001 | Confirmar decisiones de la sección 0 | Aprobación registrada | — |
| ACT-002 | Migración: tabla base `activos` (con `estado`, `tipo`, campos comunes) + RLS (lectura con `activos.activos.ver`, escritura restringida por tipo) | Migración SQL | ACT-001 |
| ACT-003 | Migración: tabla `vehiculos` (1:1 a `activos`) + RLS con `activos.vehiculos.*` | Migración SQL | ACT-002 |
| ACT-004 | Migración: tabla `maquinas` (1:1 a `activos`) + RLS con `activos.maquinas.*` | Migración SQL | ACT-002 |
| ACT-005 | Migración: tabla `equipos` (1:1 a `activos`) + RLS con `activos.equipos.*` | Migración SQL | ACT-002 |
| ACT-006 | Seed: registrar los 13 permisos de la sección 1 en `permisos`, y asignarlos todos al rol `admin` (`roles_permisos`) | `seed.sql` actualizado | ACT-002 a ACT-005, `FASE3` AUTH-004 |
| ACT-007 | Crear schemas Zod (`activoBaseSchema` + uno por tipo, con `.extend()`) | `features/activos/schemas/*` | ACT-001 |
| ACT-008 | Crear queries (`listActivos`, `getActivoDetalle`, listados por tipo) sobre `useResourceList`/`useResourceDetail` de Fase 2 | `features/activos/queries/*` | ACT-002 a ACT-005 |
| ACT-009 | Crear actions de creación/edición por tipo, validando con el schema Zod correspondiente y `hasPermission()` server-side | `features/activos/actions/create*.ts`, `update*.ts` | ACT-006, ACT-007 |
| ACT-010 | Crear action `retirarActivo` (cambia `estado` a `retirado`, nunca `DELETE`) | `features/activos/actions/retirarActivo.ts` | ACT-006 |
| ACT-011 | Construir página de listado unificado con `DataTable` + `SearchInput` + `StatusBadge` + filtro por tipo | Página `(admin)/activos/page.tsx` | ACT-008 |
| ACT-012 | Construir página de detalle con `Tabs` para datos generales vs. específicos del tipo | Página `(admin)/activos/[id]/page.tsx` | ACT-008 |
| ACT-013 | Construir flujo de alta (selección de tipo + formulario dinámico con `FormField`/`useAppForm`) | Página `(admin)/activos/nuevo/page.tsx` | ACT-009 |
| ACT-014 | Construir flujo de edición (mismo formulario, precargado) | Página `(admin)/activos/[id]/editar/page.tsx` | ACT-009 |
| ACT-015 | Conectar `ConfirmDialog` al botón de retiro en listado y detalle | Botón + diálogo funcional | ACT-010, ACT-011, ACT-012 |
| ACT-016 | Condicionar visibilidad de acciones (crear/editar/retirar) con `usePermissions().can(...)` en las 4 páginas | UI actualizada | ACT-006, `FASE3` AUTH-011 |
| ACT-017 | Actualizar `AGENTS.md` (marcar `activos` como primer feature real, ya no ejemplo) y `ARCHITECTURE.md` §6/§7 con el esquema final de tablas | Documentos actualizados | ACT-002 a ACT-016 |
| ACT-018 | Validación de cierre: `lint`/`typecheck`/`build` en `PASS`, prueba manual de RLS (usuario sin permiso no puede crear/editar/retirar; usuario `admin` sí), prueba de que "eliminar" nunca borra la fila | Reporte de validación | ACT-002 a ACT-017 |

---

## 5. Criterio de salida de la Fase 4

- Existen `activos`, `vehiculos`, `maquinas`, `equipos` en producción con
  RLS activo y probado.
- El listado, detalle, alta, edición y retiro de activos funcionan de
  punta a punta usando **exclusivamente** componentes y hooks ya
  construidos en Fase 2 y Fase 3 — cero componentes nuevos en esta fase.
- Ningún registro de activo se elimina físicamente; el retiro es un
  cambio de estado auditable.
- Los permisos `activos.*` están registrados con la convención
  `modulo.recurso.accion` y funcionan tanto en RLS como en la UI
  (`usePermissions`) y en las actions (`hasPermission` server-side).
- `activos.id` queda disponible como referencia estable para los
  dominios que se conecten en fases siguientes (mantenimiento, finanzas,
  actividades).

## 6. Siguiente fase (fuera de alcance de este documento)

Fase 5 — candidatos, a decidir según prioridad de negocio: (a)
`mantenimiento`, que ya tiene una relación directa y esperada con
`activos.id` (`ARCHITECTURE.md` §7, §11); o (b) `empleados`, para dejar
lista la otra mitad del modelo relacional (`empleados` ↔ `actividades` ↔
`horas` ↔ `liquidaciones`) antes de que `mantenimiento` necesite asociar
mano de obra a un empleado real. Recomiendo `empleados` primero por esa
dependencia, pero es una decisión de negocio, no técnica — queda abierta
para la próxima instrucción.
