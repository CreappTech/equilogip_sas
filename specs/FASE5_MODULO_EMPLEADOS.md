p# EQUILOGIPSAS — FASE 5: MÓDULO EMPLEADOS

> Segundo módulo de negocio real. Reutiliza exactamente el mismo patrón
> validado en Fase 4 (`DataTable`, `FormField`, `Toast`, `useAppForm`,
> `useResource*`, `hasPermission()`/`usePermissions()`) y cierra un pendiente
> que quedó explícitamente diferido desde Fase 3: la relación real entre
> `usuarios` y `empleados`.

Referencias: `AGENTS.md`, `CONSTITUTION.md` §2.3, §9, §12,
`ARCHITECTURE.md` §7, `FASE3_AUTENTICACION_AUTORIZACION.md` (sección 3),
`FASE4_MODULO_ACTIVOS.md`.

---

## 0. Decisiones tomadas por defecto (confirmar o corregir)

1. **Alcance acotado a la entidad `empleados` en sí**, no a todo el
   clúster "talento humano". `horas trabajadas` y `liquidaciones`
   (`CONSTITUTION.md` §12) quedan fuera de esta fase — son dominios propios
   con su propia complejidad (tarifas, conceptos, períodos) y mezclarlos
   aquí violaría `AGENTS.md` §26 (tareas/fases pequeñas, una entidad a la
   vez). `empleados.id` queda listo como referencia estable para cuando se
   construyan.
2. **`empleados` es una entidad simple, sin especialización por tipo**
   (a diferencia de `activos`). No hay "tipos de empleado" en la
   Constitución, así que no se replica el patrón tabla-base +
   tablas-especializadas de Fase 4 — sería sobreingeniería no pedida
   (`CONSTITUTION.md` §15).
3. **Eliminar = cambio de estado, no `DELETE`** (mismo patrón que Fase 4,
   por la misma regla de `CONSTITUTION.md` §9: un empleado retirado sigue
   apareciendo en historial de actividades/horas pasadas).
4. **Vínculo `usuarios` ↔ `empleados` se completa en esta fase**, no en la
   de auth: en Fase 3, `usuarios.fk_empleado_id` se creó nullable pero sin
   la restricción de llave foránea (porque `empleados` no existía todavía).
   Esta fase agrega esa restricción y el flujo de UI para vincular un
   usuario existente a un empleado — sin hacerlo obligatorio en ninguna
   dirección (`CONSTITUTION.md` §2.3).

---

## 1. Modelo de datos

```text
empleados
├── id (uuid, PK)
├── nombres / apellidos  (o nombre_completo, según convención ya usada en el proyecto)
├── documento_identidad (unique)
├── fecha_nacimiento
├── fecha_ingreso
├── cargo
├── estado ('activo' | 'inactivo' | 'retirado')
├── telefono / email_contacto
├── created_at / updated_at

usuarios                              (ya existe desde Fase 3)
├── ...
└── fk_empleado_id  →  ALTER: agregar FOREIGN KEY hacia empleados.id
                        (nullable, ON DELETE SET NULL — nunca se borra un
                        empleado físicamente, pero por consistencia se
                        deja la cláusula)
```

Relación: 0 o 1 `empleado` ↔ 0 o 1 `usuario`. Ninguna de las dos tablas
asume que la otra existe.

### Permisos que registra este módulo

```text
empleados.empleados.ver
empleados.empleados.crear
empleados.empleados.editar
empleados.empleados.eliminar        -- ejecuta cambio de estado a 'retirado'
empleados.empleados.vincular_usuario -- asociar/desasociar un usuario existente
```

---

## 2. Estructura del feature (`apps/web/src/features/empleados/`)

```text
features/empleados/
├── queries/
│   ├── listEmpleados.ts
│   └── getEmpleadoDetalle.ts    -- incluye el usuario vinculado, si existe
├── actions/
│   ├── createEmpleado.ts
│   ├── updateEmpleado.ts
│   ├── retirarEmpleado.ts        -- cambia estado a 'retirado', no DELETE
│   └── vincularUsuario.ts         -- asocia/desasocia usuarios.fk_empleado_id
├── schemas/
│   └── empleadoSchema.ts          -- Zod
├── types/
│   └── empleado.types.ts
└── hooks/
    └── useEmpleadosList.ts / useEmpleadoDetalle.ts (sobre useResource* de Fase 2)
```

---

## 3. UI (sin componentes nuevos — todo reutilizado de Fase 2/3)

| Pantalla | Ruta | Componentes reutilizados |
|---|---|---|
| Listado | `(admin)/empleados` | `PageHeader`, `SearchInput`, `DataTable`, `StatusBadge` (estado) |
| Detalle | `(admin)/empleados/[id]` | `PageHeader`, muestra datos + usuario vinculado (o `EmptyState` si no tiene) |
| Alta | `(admin)/empleados/nuevo` | `FormField` + `useAppForm` con `empleadoSchema` |
| Edición | `(admin)/empleados/[id]/editar` | Igual que alta, precargado; incluye `Combobox` para vincular/desvincular un usuario existente sin cuenta asignada |
| Retiro | Acción desde listado/detalle | `ConfirmDialog` antes de ejecutar `retirarEmpleado` |

Visibilidad de acciones condicionada por `usePermissions().can('empleados.empleados.<accion>')`;
cada `action` revalida con `hasPermission()` server-side antes de escribir.

---

## 4. Tareas atómicas

| ID | Tarea | Entregable | Depende de |
|---|---|---|---|
| EMP-001 | Confirmar decisiones de la sección 0 | Aprobación registrada | — |
| EMP-002 | Migración: tabla `empleados` + RLS (lectura con `empleados.empleados.ver`, escritura con `.crear`/`.editar`) | Migración SQL | EMP-001 |
| EMP-003 | Migración: agregar `FOREIGN KEY` a `usuarios.fk_empleado_id` → `empleados.id` (pendiente desde Fase 3) | Migración SQL (`ALTER TABLE`) | EMP-002 |
| EMP-004 | Seed: registrar los 5 permisos de la sección 1 en `permisos`, asignarlos al rol `admin` | `seed.sql` actualizado | EMP-002 |
| EMP-005 | Crear `empleadoSchema` (Zod) | `features/empleados/schemas/empleadoSchema.ts` | EMP-001 |
| EMP-006 | Crear queries `listEmpleados`, `getEmpleadoDetalle` (con `usuario` vinculado si existe) sobre `useResourceList`/`useResourceDetail` de Fase 2 | `features/empleados/queries/*` | EMP-002, EMP-003 |
| EMP-007 | Crear actions `createEmpleado`, `updateEmpleado`, validando con `empleadoSchema` y `hasPermission()` | `features/empleados/actions/create*.ts`, `update*.ts` | EMP-004, EMP-005 |
| EMP-008 | Crear action `retirarEmpleado` (cambia `estado` a `retirado`, nunca `DELETE`) | `features/empleados/actions/retirarEmpleado.ts` | EMP-004 |
| EMP-009 | Crear action `vincularUsuario` (asocia/desasocia `usuarios.fk_empleado_id`, valida que el usuario no esté ya vinculado a otro empleado) | `features/empleados/actions/vincularUsuario.ts` | EMP-003, EMP-004 |
| EMP-010 | Construir página de listado con `DataTable` + `SearchInput` + `StatusBadge` | `(admin)/empleados/page.tsx` | EMP-006 |
| EMP-011 | Construir página de detalle (datos + usuario vinculado o `EmptyState`) | `(admin)/empleados/[id]/page.tsx` | EMP-006 |
| EMP-012 | Construir flujo de alta con `FormField`/`useAppForm` | `(admin)/empleados/nuevo/page.tsx` | EMP-007 |
| EMP-013 | Construir flujo de edición, incluyendo el `Combobox` de vinculación de usuario | `(admin)/empleados/[id]/editar/page.tsx` | EMP-007, EMP-009 |
| EMP-014 | Conectar `ConfirmDialog` al botón de retiro en listado y detalle | Botón + diálogo funcional | EMP-008, EMP-010, EMP-011 |
| EMP-015 | Condicionar visibilidad de acciones con `usePermissions().can(...)` en las 4 páginas | UI actualizada | EMP-004, `FASE3` AUTH-011 |
| EMP-016 | Actualizar `AGENTS.md`, `ARCHITECTURE.md` §7 y `CONSTITUTION.md` §2.3/§12 con el esquema final y la relación `usuarios`↔`empleados` ya implementada | Documentos actualizados | EMP-002 a EMP-015 |
| EMP-017 | Validación de cierre: `lint`/`typecheck`/`build` en `PASS`; prueba manual de RLS (autorizado/no autorizado); verificar que retirar un empleado no borra la fila; verificar que vincular/desvincular usuario funciona en ambas direcciones sin forzar la relación | Reporte de validación | EMP-002 a EMP-016 |

---

## 5. Criterio de salida de la Fase 5

- `empleados` existe con RLS activo y probado, con el mismo estándar de
  calidad que `activos` (Fase 4).
- Listado, detalle, alta, edición y retiro funcionan de punta a punta sin
  ningún componente nuevo — segunda confirmación (después de Fase 4) de
  que la Fase 2 realmente ahorra el trabajo repetido que la motivó.
- `usuarios.fk_empleado_id` tiene su restricción de llave foránea real, y
  el flujo de vinculación/desvinculación funciona sin asumir que todo
  empleado tiene usuario ni que todo usuario tiene empleado.
- Ningún registro de empleado se elimina físicamente; el retiro es un
  cambio de estado auditable, igual que en `activos`.
- `empleados.id` queda disponible como referencia estable para
  `actividades`, `horas trabajadas` y `liquidaciones` en fases futuras.

## 6. Siguiente fase (fuera de alcance de este documento)

Fase 6 — candidatos: (a) `mantenimiento`, que ahora sí puede asociar tanto
`activos.id` (Fase 4) como `empleados.id` (Fase 5) a cada registro de
mano de obra (`CONSTITUTION.md` §11); o (b) `actividades`, que
`ARCHITECTURE.md` §7 ubica como el nexo entre empleados, activos e
ingresos/gastos, y que `horas trabajadas` va a necesitar antes de poder
existir. Igual que en el cierre de Fase 4, esta es una decisión de
prioridad de negocio — la dejo abierta para la próxima instrucción, con
una inclinación hacia `mantenimiento` por ser el dominio que ya tiene
ambas dependencias (`activos` y `empleados`) resueltas primero.
