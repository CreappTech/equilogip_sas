# SPEC — Módulo de Operación de Equipos y Actas de Prestación de Servicios

Basado en `CONSTITUTION.md`, `ARCHITECTURE.md` y `AGENTS.md` de Equilogipsas.

## 0. Contexto y limitación de este spec

Este spec fue validado en Fase 0 contra el estado real del repositorio
(schema de Supabase, `features/`, migraciones). Las tablas `activos`,
`empleados`, `clientes`, `centros_servicio`, `tipos_actividad`, `roles`,
`permisos`, `roles_permisos` y `profiles` **ya existen** y se reutilizan.
Si algo de lo aquí propuesto ya existe con otro nombre, se reutiliza tal
cual (regla AGENTS.md §5 y §6).

---

## 1. Alcance funcional (resumen del requerimiento)

1. Rol nuevo: **Coordinador de Operaciones**.
2. Formulario que crea una **actividad operativa**: operador, centro de
   servicio, tipo de actividad, equipo, cliente (opcional).
3. Cuadro de control con ciclo de vida:
   `creada → Iniciar (▶) → en_curso → Pausar (⏸, con causal) → pausada → Reanudar (▶) → en_curso → ... → Finalizar (⏹) → finalizada`.
4. Cálculo de tiempo trabajado y tiempo de limitación (paradas/novedades).
5. Reportes: cuánto trabajó el equipo, qué novedades hubo.
6. Acta de prestación de servicios semanal (cliente + equipo) con:
   - Tabla A: fecha, hora inicio, hora fin, horas trabajadas.
   - Tabla B: fecha, tipo de novedad, duración de la novedad.

---

## 2. Decisiones resueltas (Fase 0) ✅

| # | Pregunta | Resolución |
|---|---|---|
| D1 | ¿La "actividad operativa" con play/pausa es la misma entidad `ACTIVIDADES` de ARCHITECTURE.md §7? | Entidad **nueva**: `operacion_actividades`. No existe tabla transaccional equivalente. El catálogo `tipos_actividad` ya existe y se reutiliza. |
| D2 | ¿Existe ya tabla `clientes`? | **Sí**, catálogo tenant-scoped existente. No crear. |
| D3 | ¿Un equipo tiene un único cliente vigente o puede rotar? | Relación **por actividad** (cada `operacion_actividades` referencia opcionalmente un `cliente_id`). No asignación fija. |
| D4 | ¿El acta se entrega en PDF, Word o HTML imprimible? | Se define en Fase 7 al momento de implementar. |
| D5 | ¿Puede haber dos actividades abiertas simultáneas sobre el mismo equipo? | **No.** Constraint de integridad en BD. |
| D6 | ¿De dónde salen "los datos de la empresa" del acta? | Se asume que debe existir/crearse una configuración `empresa_config` si no existe ya. |

---

## 3. Modelo de datos

### 3.1 Tablas existentes que se reutilizan

| Tabla existente | Uso en este módulo | Notas |
|---|---|---|
| `empleados` | Operador de la actividad | FK `operacion_actividades.operador_id` → `empleados.id` |
| `activos` (+ `vehiculos`/`maquinas`/`equipos`) | Equipo que realiza la actividad | FK `operacion_actividades.activo_id` → `activos.id` |
| `centros_servicio` | Centro de servicio donde se ejecuta | FK `operacion_actividades.centro_servicio_id` → `centros_servicio.id` |
| `tipos_actividad` | Tipo de actividad a realizar | FK `operacion_actividades.tipo_actividad_id` → `tipos_actividad.id` |
| `clientes` | Cliente asociado (opcional) | FK `operacion_actividades.cliente_id` → `clientes.id` |
| `profiles` | Quien crea/registra | FK `creado_por` / `registrado_por` → `profiles.id` |

> **Nota:** La tabla `turnos` existente es un catálogo de tipos de turno
> (diurno/nocturno). Es independiente de `operacion_actividades`.

### 3.2 Tablas nuevas a crear

**Catálogo nuevo:**
- `causales_pausa`
  `id, nombre, descripcion, activo`
  - Seed: Falla mecánica, Falta de material, Condiciones climáticas, Descanso / Almuerzo, Cambio de turno, Mantenimiento programado, Otra.

**Entidades operativas:**
- `operacion_actividades`
  ```
  id              uuid PK
  activo_id       uuid FK → activos.id NOT NULL
  operador_id     uuid FK → empleados.id NOT NULL
  centro_servicio_id uuid FK → centros_servicio.id NOT NULL
  tipo_actividad_id  uuid FK → tipos_actividad.id NOT NULL
  cliente_id      uuid FK → clientes.id NULLABLE
  estado          text NOT NULL DEFAULT 'creada'
                  CHECK (estado IN ('creada','en_curso','pausada','finalizada'))
  creado_por      uuid FK → profiles.id NOT NULL
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()
  ```
  - **Constraint:** un solo actividad abierta por activo:
    `UNIQUE (activo_id) WHERE estado IN ('creada','en_curso','pausada')`

- `operacion_eventos` (bitácora)
  ```
  id              uuid PK
  actividad_id    uuid FK → operacion_actividades.id NOT NULL
  tipo_evento     text NOT NULL
                  CHECK (tipo_evento IN ('inicio','pausa','reanudacion','fin'))
  fecha_hora      timestamptz NOT NULL DEFAULT now()
  causal_id       uuid FK → causales_pausa.id NULLABLE
  observaciones   text NULLABLE
  registrado_por  uuid FK → profiles.id NOT NULL
  ```
  - **Regla:** `causal_id` y `observaciones` obligatorios únicamente si
    `tipo_evento = 'pausa'` (constraint condicional en BD).

**Opcional para histórico del acta:**
- `actas_servicio`
  `id, numero, periodo_inicio, periodo_fin, cliente_id, equipo_id, actividad_id, generado_por, fecha_generacion, snapshot jsonb`

### 3.3 Cálculos derivados (vista SQL única)

Vista o función SQL `vw_operacion_actividades_resumen` (fuente única,
sin duplicar fórmula en frontend — CONSTITUTION.md §10, AGENTS.md §19):

- **Horas trabajadas** = suma de intervalos `inicio→pausa` + `reanudación→fin`.
- **Duración de novedad** = intervalo `pausa→reanudación` (o `pausa→fin` si no hubo reanudación).
- **Tiempo total** = desde `inicio` hasta `fin`.

Ejemplo:
```
Inicio 08:05 → Pausa 09:30 (falla mecánica) → Reanudar 10:25 → Pausa 13:00 (almuerzo) → Reanudar 14:00 → Fin 17:00

Trabajado:  08:05→09:30 (85min) + 10:25→13:00 (155min) + 14:00→17:00 (180min) = 7h 20min
Limitado:   09:30→10:25 (55min) + 13:00→14:00 (60min) = 1h 55min
Total:      08:05→17:00 = 8h 55min
```

---

## 4. Ciclo de vida de una Actividad

### 4.1 Estados

```
creada → en_curso → pausada → en_curso → ... → finalizada
                  ↗ (reanudar)
```

| Estado | Descripción |
|---|---|
| `creada` | Actividad creada, aún no iniciada. |
| `en_curso` | Operador trabajando. |
| `pausada` | Actividad detenida por una causal (novedad/limitación). |
| `finalizada` | Actividad terminada. Estado terminal. |

### 4.2 Acciones disponibles por estado

| Estado | Botones visibles | Acción server |
|---|---|---|
| `creada` | ▶ **Iniciar** | `registrarInicio(actividadId)` → `en_curso` |
| `en_curso` | ⏸ **Pausar**, ⏹ **Finalizar** | `registrarPausa(...)` → `pausada` / `registrarFin(...)` → `finalizada` |
| `pausada` | ▶ **Reanudar** | `registrarReanudacion(actividadId)` → `en_curso` |
| `finalizada` | (solo lectura) | Resumen con totales calculados |

### 4.3 Ejemplo completo

| # | Hora | Acción | Estado resultante | Evento registrado |
|---|---|---|---|---|
| 1 | — | **Crear actividad** | `creada` | Se selecciona operador, equipo, centro, tipo, cliente |
| 2 | 08:05 | **Iniciar** (▶) | `en_curso` | `tipo_evento='inicio'`, `fecha_hora=08:05` |
| 3 | 09:30 | **Pausar** (⏸) — llanta dañada | `pausada` | `tipo_evento='pausa'`, `causal='Falla mecánica'`, `obs='Se dañó llanta, 55min cambio'` |
| 4 | 10:25 | **Reanudar** (▶) | `en_curso` | `tipo_evento='reanudacion'`, `fecha_hora=10:25` |
| 5 | 13:00 | **Pausar** (⏸) — almuerzo | `pausada` | `tipo_evento='pausa'`, `causal='Descanso / Almuerzo'`, `obs='Almuerzo operario'` |
| 6 | 14:00 | **Reanudar** (▶) | `en_curso` | `tipo_evento='reanudacion'`, `fecha_hora=14:00` |
| 7 | 17:00 | **Finalizar** (⏹) | `finalizada` | `tipo_evento='fin'`, `fecha_hora=17:00` |

### 4.4 Cuadro de control por estado

**Estado `creada`:**
```
┌─────────────────────────────────────────────────┐
│  Actividad — Ford Ranger ABC-001                 │
│  Operador: Juan Pérez                            │
│  Centro: Zona Norte  |  Tipo: Perforación        │
│  Cliente: Constructora XYZ                       │
│                                                 │
│  Estado: [ 🟡 Creada ]                          │
│                                                 │
│  ┌─────────────────────────────────────────┐     │
│  │         ▶  INICIAR ACTIVIDAD           │     │
│  └─────────────────────────────────────────┘     │
│                                                 │
│  Bitácora: (vacía)                              │
└─────────────────────────────────────────────────┘
```

**Estado `en_curso`:**
```
┌─────────────────────────────────────────────────┐
│  Actividad — Ford Ranger ABC-001                 │
│                                                 │
│  Estado: [ 🟢 En Curso ]                        │
│  Iniciada: 08:05 — hace 1h 25min                │
│                                                 │
│  ┌───────────────┐  ┌───────────────────────┐   │
│  │  ⏸ PAUSAR    │  │  ⏹ FINALIZAR         │   │
│  └───────────────┘  └───────────────────────┘   │
│                                                 │
│  Bitácora:                                      │
│  ┌──────────┬──────────┬───────────┐            │
│  │ Hora     │ Evento   │ Detalle   │            │
│  ├──────────┼──────────┼───────────┤            │
│  │ 08:05    │ Inicio   │ —         │            │
│  └──────────┴──────────┴───────────┘            │
└─────────────────────────────────────────────────┘
```

**Estado `pausada`:**
```
┌─────────────────────────────────────────────────┐
│  Actividad — Ford Ranger ABC-001                 │
│                                                 │
│  Estado: [ 🔴 Pausada ]                         │
│  Pausa actual: Falla mecánica — 55min            │
│                                                 │
│  ┌─────────────────────────────────────────┐     │
│  │         ▶  REANUDAR ACTIVIDAD          │     │
│  └─────────────────────────────────────────┘     │
│                                                 │
│  Bitácora:                                      │
│  ┌──────────┬────────────┬──────────────────┐   │
│  │ Hora     │ Evento     │ Detalle          │   │
│  ├──────────┼────────────┼──────────────────┤   │
│  │ 08:05    │ Inicio     │ —                │   │
│  │ 09:30    │ ⏸ Pausa    │ Falla mecánica   │   │
│  │          │            │ "Se dañó llanta" │   │
│  └──────────┴────────────┴──────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Estado `finalizada`:**
```
┌─────────────────────────────────────────────────┐
│  Actividad — Ford Ranger ABC-001                 │
│                                                 │
│  Estado: [ ⚫ Finalizada ]                      │
│                                                 │
│  ┌───────────────────────────────────────────┐   │
│  │  RESUMEN                                 │   │
│  │  Trabajado:  7h 20min                     │   │
│  │  Limitado:   1h 55min (2 novedades)      │   │
│  │  Total:      8h 55min                     │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
│  Bitácora completa:                             │
│  ┌──────────┬────────────┬──────────────────┐   │
│  │ Hora     │ Evento     │ Detalle          │   │
│  ├──────────┼────────────┼──────────────────┤   │
│  │ 08:05    │ Inicio     │ —                │   │
│  │ 09:30    │ ⏸ Pausa    │ Falla mecánica   │   │
│  │ 10:25    │ ▶ Reanudar │ —                │   │
│  │ 13:00    │ ⏸ Pausa    │ Almuerzo         │   │
│  │ 14:00    │ ▶ Reanudar │ —                │   │
│  │ 17:00    │ ⏹ Fin      │ —                │   │
│  └──────────┴────────────┴──────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 5. Permisos nuevos (convención `modulo.recurso.accion`, ARCHITECTURE.md §14)

```
operaciones.actividades.crear
operaciones.actividades.ver
operaciones.actividades.iniciar
operaciones.actividades.pausar
operaciones.actividades.reanudar
operaciones.actividades.finalizar
operaciones.actas.generar
operaciones.actas.ver
```

Rol `coordinador_operaciones` recibe estos ocho permisos.

---

## 6. Formulario de creación de actividad

### 6.1 Campos

| # | Campo | Tipo UI | Fuente | Obligatorio |
|---|---|---|---|---|
| 1 | **Operador** | `Combobox` (búsqueda) | FK → `empleados` (activo) | ✅ |
| 2 | **Centro de servicio** | `Select` | FK → `centros_servicio` | ✅ |
| 3 | **Tipo de actividad** | `Select` | FK → `tipos_actividad` | ✅ |
| 4 | **Equipo** | `Combobox` (búsqueda) | FK → `activos` (activo), muestra `codigo - nombre` | ✅ |
| 5 | **Cliente** | `Select` | FK → `clientes` | ❌ Opcional |

### 6.2 Esquema Zod

```ts
export const actividadFormSchema = z.object({
  operador_id: z.string().uuid("Operador inválido."),
  centro_servicio_id: z.string().uuid("Centro de servicio inválido."),
  tipo_actividad_id: z.string().uuid("Tipo de actividad inválido."),
  activo_id: z.string().uuid("Equipo inválido."),
  cliente_id: z.string().uuid("Cliente inválido").optional().or(z.literal("")),
});
```

### 6.3 Server Action (`crearActividad`)

1. `requireUser()` — autenticación.
2. `autorizar("operaciones.actividades.crear")` — permiso.
3. `schema.safeParse(data)` — re-validación server.
4. Verificar que el activo no tenga actividad abierta (constraint `WHERE estado IN ('creada','en_curso','pausada')`).
5. `supabase.from("operacion_actividades").insert(...)`.
6. `revalidatePath("/operaciones")`.

### 6.4 Layout responsive

```
Desktop (sm+):                 Mobile:
┌──────────┬──────────┐       ┌────────────────────┐
│ Operador │          │       │ Operador            │
├──────────┤          │       ├────────────────────┤
│ Centro   │ Tipo Act │       │ Centro de Servicio  │
├──────────┤          │       ├────────────────────┤
│ Equipo   │          │       │ Tipo de Actividad   │
├──────────┴──────────┤       ├────────────────────┤
│ Cliente             │       │ Equipo              │
├─────────────────────┤       ├────────────────────┤
│ [ Crear Actividad ] │       │ Cliente             │
└─────────────────────┘       ├────────────────────┤
                              │ [ Crear Actividad ]│
                              └────────────────────┘
```

---

## 7. Modal de Pausa

```
┌─────────────────────────────────────────┐
│  Registrar Pausa                        │
│                                         │
│  Causal *                               │
│  ┌─────────────────────────────────┐    │
│  │ [Selecciona una causal...    ▼] │    │
│  │  • Falla mecánica               │    │
│  │  • Falta de material            │    │
│  │  • Condiciones climáticas       │    │
│  │  • Descanso / Almuerzo          │    │
│  │  • Cambio de turno              │    │
│  │  • Mantenimiento programado     │    │
│  │  • Otra                         │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Observaciones *                        │
│  ┌─────────────────────────────────┐    │
│  │ Describe la novedad...          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────────┐  ┌────────────────┐   │
│  │  Cancelar    │  │  Registrar     │   │
│  └──────────────┘  └────────────────┘   │
└─────────────────────────────────────────┘
```

Ambos campos obligatorios solo para pausas (constraint condicional en BD).

---

## 8. Tareas atómicas

### Fase 0 — Discovery ✅ COMPLETADA
- [x] 0.1 Inspeccionar schema Supabase real.
- [x] 0.2 Inspeccionar `features/` y componentes compartidos.
- [x] 0.3 Resolver decisiones D1–D6.
- [x] 0.4 Revisar patrón de roles/permisos existente.

### Fase 1 — Base de datos (una migración por ítem)
- [ ] 1.1 Migración `causales_pausa` (+ seed: falla mecánica, falta de material, clima, descanso/almuerzo, cambio de turno, mantenimiento, otra) + RLS de lectura.
- [ ] 1.2 Migración `operacion_actividades` con FKs a `activos`, `empleados`, `centros_servicio`, `tipos_actividad`, `clientes`; constraint "una sola actividad abierta por activo", RLS por permiso.
- [ ] 1.3 Migración `operacion_eventos` con FK a `operacion_actividades`/`causales_pausa`, constraint condicional de causal obligatorio solo en pausa, RLS.
- [ ] 1.4 Migración: rol `coordinador_operaciones` + los 8 permisos `operaciones.actividades.*` + `operaciones.actas.*` + asignación en `roles_permisos`.
- [ ] 1.5 (Si se confirma D6) Migración/tabla `empresa_config`.
- [ ] 1.6 (Opcional, si se confirma histórico) Migración `actas_servicio`.
- [ ] 1.7 Vista SQL `vw_operacion_actividades_resumen` para cálculo de horas trabajadas y duración de novedades.

### Fase 2 — Servicios de datos (`features/operaciones`)
- [ ] 2.1 `crearActividad` — valida que el activo no tenga actividad abierta.
- [ ] 2.2 `registrarInicio(actividadId)`.
- [ ] 2.3 `registrarPausa(actividadId, causalId, observaciones)`.
- [ ] 2.4 `registrarReanudacion(actividadId)`.
- [ ] 2.5 `registrarFin(actividadId)`.
- [ ] 2.6 `obtenerActividadActiva(actividadId)` con su bitácora, para el cuadro de control.
- [ ] 2.7 `listarActividades(filtros)` para reportes (equipo, centro de servicio, rango de fechas).
- [ ] 2.8 `obtenerDatosActa(clienteId, equipoId, periodo)` → tabla A y tabla B calculadas.

### Fase 3 — Autorización
- [ ] 3.1 Verificar permiso en servidor para cada acción (CONSTITUTION.md §5).
- [ ] 3.2 Políticas RLS para cada tabla nueva (acceso autorizado y no autorizado).

### Fase 4 — Formulario de creación de actividad
- [ ] 4.1 `NuevaActividadForm` (RHF + Zod): Combobox operador, Select centro, Select tipo, Combobox equipo, Select cliente.
- [ ] 4.2 Validación de equipo sin actividad abierta (mensaje claro si falla).
- [ ] 4.3 Estados idle/submitting/success/error, sin doble envío.
- [ ] 4.4 Página server: carga de FK options (empleados activos, centros, tipos, activos activos, clientes).

### Fase 5 — Cuadro de control
- [ ] 5.1 `ActividadControlCard` con vista según estado (creada/en_curso/pausada/finalizada).
- [ ] 5.2 Botón ▶ Iniciar → `registrarInicio`, muestra fecha/hora capturada.
- [ ] 5.3 Botón ⏸ Pausar → abre `PausaModal`.
- [ ] 5.4 `PausaModal` (RHF + Zod): causal (select de `causales_pausa`) y observaciones (textarea), ambos obligatorios.
- [ ] 5.5 Botón ▶ Reanudar (visible solo en estado pausada).
- [ ] 5.6 Botón ⏹ Finalizar → cierra actividad y muestra resumen (trabajado, limitado, total).
- [ ] 5.7 Estados loading/empty/error/success al cargar la actividad.
- [ ] 5.8 Verificación mobile-first: botones grandes, layout en columna, accessible en móvil.

### Fase 6 — Reportes
- [ ] 6.1 Reporte de horas trabajadas por equipo/periodo (consume la vista 1.7).
- [ ] 6.2 Reporte de novedades por equipo/periodo (causal, frecuencia, duración total).
- [ ] 6.3 Filtros por rango de fechas, equipo y centro de servicio.
- [ ] 6.4 Estados loading/empty/error/success en ambos reportes.

### Fase 7 — Acta de prestación de servicios
- [ ] 7.1 Definir plantilla: datos de la empresa (D6), datos del cliente, datos del equipo.
- [ ] 7.2 Tabla A: fecha, hora inicio, hora fin, horas trabajadas (por actividad del periodo).
- [ ] 7.3 Tabla B: fecha, tipo de novedad, duración de la novedad (por pausa del periodo).
- [ ] 7.4 UI de generación: selector de semana + cliente + equipo.
- [ ] 7.5 Generación del documento final (formato según D4).
- [ ] 7.6 (Si se confirma) Persistir en `actas_servicio` para histórico.
- [ ] 7.7 Verificar permiso `operaciones.actas.generar` en servidor.

### Fase 8 — Cierre
- [ ] 8.1 Ejecutar lint/typecheck/build/test.
- [ ] 8.2 Probar acceso autorizado y no autorizado de cada permiso nuevo.
- [ ] 8.3 Prueba de no regresión sobre módulos existentes.
- [ ] 8.4 Informe final (AGENTS.md §25).

---

## 9. Orden de ejecución

```
Fase 0 ✅ → Fase 1 → Fase 1.4 (permisos) → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8
```

## 10. Fuera de alcance

- Aplicación móvil (APK).
- Integración de IA.
- Facturación automática derivada del acta.

## 11. Glossario

| Término | Significado |
|---|---|
| **Actividad** | Sesión de trabajo de un operador con un equipo en un centro de servicio. Entidad transaccional principal. |
| **Pausa / Novedad / Limitación** | Detención de la actividad por una causal (falla, almuerzo, clima, etc.). Registrada como evento. |
| **Cuadro de control** | UI que muestra el estado actual de una actividad y permite iniciar/pausar/reanudar/finalizar. |
| **Bitácora** | Lista cronológica de eventos de una actividad (inicio, pausas, reanudaciones, fin). |
| **Acta de prestación de servicios** | Documento semanal con resumen de horas trabajadas y novedades por cliente/equipo. |
