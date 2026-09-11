# SPEC — Grupo "Jornada de Trabajo" (Planeación, Asistencia y Resumen de Nómina)

Basado en `CONSTITUTION.md`, `ARCHITECTURE.md`, `AGENTS.md` de Equilogipsas,
y en la estructura de sidebar/layout heredada del template TailAdmin
(`AppSidebar.tsx`, `src/icons/index.tsx`, route groups `src/app/(admin)/...`).

## 0. Nota importante detectada

El usuario reporta que en módulos anteriores **se creó la lógica pero nunca
se agregó la entrada en el sidebar**, por lo que quedaron inaccesibles desde
la UI. Este spec incluye una fase explícita para:
1. Dejar funcional el sidebar del módulo anterior (Operación de Equipos).
2. Crear el nuevo grupo y sus 3 módulos, ya con entrada de navegación desde
   el inicio de cada fase (no al final), para no repetir el mismo error.

---

## 1. Nomenclatura de navegación

```
Grupo:   Jornada de Trabajo
├── Módulo: Planeación Semanal
├── Módulo: Asistencia
└── Módulo: Resumen de Nómina
```

Rutas propuestas (a confirmar contra convención real de `src/app/(admin)/...`):
```
/jornada/planeacion
/jornada/asistencia
/jornada/nomina
```

---

## 2. Alcance funcional (resumen del requerimiento)

1. **Planeación Semanal**: tabla de programación (operador, día, hora inicio
   programada, hora fin programada) para la semana. Es la referencia contra
   la que se valida la asistencia real.
2. **Asistencia**: lista de operadores programados en el turno del día, con
   un check de "llegó" (toma fecha/hora inicio) y un check de "salió" (toma
   fecha/hora fin). De ahí sale la hora real trabajada.
3. **Resumen de Nómina**: tabla por operador + rango de fechas con la
   distribución de horas en las 8 categorías legales, y botón de descarga
   en Excel.

## 3. Decisiones a confirmar con el usuario ⚠️

| # | Pregunta | Supuesto usado |
|---|---|---|
| D1 | ¿Ya existe tabla `festivos` (Colombia)? | Se asume que no existe y debe crearse como catálogo. |
| D2 | ¿Corte de semana laboral: lunes–domingo o según otra convención de nómina de la empresa? | Se asume lunes–domingo; **confirmar antes de programar el cálculo**. |
| D3 | ¿Rango exacto de "hora nocturna" legal vigente (ej. 9pm–6am)? | Se deja parametrizable en configuración, no hardcodeado, por si cambia la ley. |
| D4 | ¿Las horas extra requieren autorización previa registrada, o se calculan automáticamente por exceder lo programado? | Se asume que sí requieren marca de autorización (buena práctica legal), a confirmar. |
| D5 | ¿Qué pasa si un operario programado no marca ni registra novedad? | Se asume que debe quedar como "ausencia sin marcar" visible para que el coordinador la revise, no se calcula como 0 silenciosamente. |
| D6 | ¿El Excel se genera en servidor o en cliente? | Se define en Fase 6 según librerías ya instaladas en el proyecto (revisar `package.json` antes de instalar cualquier cosa nueva). |

---

## 4. Modelo de datos (conceptual)

### Catálogos
- `festivos` (fecha, descripción, país/región si aplica) — si no existe.
- `configuracion_jornada` (hora_inicio_nocturna, hora_fin_nocturna, horas_jornada_ordinaria) — parametrizable, no hardcodeado.

### Planeación
- `jornada_programacion`
  `id, operador_id, fecha, hora_inicio_programada, hora_fin_programada, centro_trabajo_id (si aplica), creado_por`
  - Constraint: no duplicar programación para el mismo operador y fecha.

### Asistencia (marcación real)
- `jornada_marcaciones`
  `id, programacion_id, hora_inicio_real, hora_fin_real, registrado_por_inicio, registrado_por_fin, estado (pendiente|en_curso|completa)`
- `jornada_novedades` (para D5: incapacidad, permiso, vacaciones, ausencia injustificada)
  `id, operador_id, fecha, tipo_novedad, observaciones, registrado_por`
- `jornada_correcciones` (auditoría de ediciones manuales de marcación)
  `id, marcacion_id, campo_corregido, valor_anterior, valor_nuevo, motivo, corregido_por, fecha_correccion`
- `jornada_autorizaciones_extra` (si D4 = sí)
  `id, marcacion_id, autorizado_por, motivo, fecha_autorizacion`

### Cálculo (fuente única, no duplicar fórmula — AGENTS.md §19)
- Función/vista `fn_clasificar_horas(marcacion_id)` que recorre el intervalo
  trabajado y lo distribuye en las 8 categorías, cruzando:
  - ¿es de noche? (según `configuracion_jornada`)
  - ¿es domingo/festivo? (según `festivos`)
  - ¿excede la jornada programada? (según `jornada_programacion`)
- Vista `vw_resumen_nomina_semanal(operador_id, semana)` que expone las 8
  columnas ya calculadas, consumida igual por la UI y por el Excel (misma
  fuente, sin cálculos paralelos).

### Las 8 categorías (recargos legales, tal como las definió el usuario)
```
Horas ordinarias
Recargo nocturno en jornada ordinaria     35%
Hora extra diurna                         25%
Hora extra nocturna                       75%
Hora dominical o festiva ordinaria        90%
Hora nocturna dominical o festiva        125%
Hora extra diurna dominical o festiva    115%
Hora extra nocturna dominical o festiva  165%
```

---

## 5. Permisos nuevos

```
jornada.planeacion.crear
jornada.planeacion.editar
jornada.planeacion.ver
jornada.asistencia.marcar
jornada.asistencia.corregir
jornada.asistencia.ver
jornada.nomina.ver
jornada.nomina.exportar
```

---

## 6. Tareas atómicas

### Fase 0 — Discovery (obligatoria)
- [ ] 0.1 Confirmar las decisiones D1–D6 de la sección 3 con el usuario.
- [ ] 0.2 Inspeccionar `src/layout/AppSidebar.tsx` para entender cómo se registran grupos/módulos actualmente (íconos, orden, permisos que ocultan ítems).
- [ ] 0.3 Confirmar por qué los módulos anteriores no quedaron en el sidebar (¿falta de tarea, o el patrón de registro no estaba claro?) para no repetirlo.
- [ ] 0.4 Revisar si ya existen `festivos`, `configuracion_jornada`, o tablas de horas/liquidaciones mencionadas en `ARCHITECTURE.md` §12 que deban reutilizarse en vez de crear nuevas.
- [ ] 0.5 Revisar `package.json` para saber si ya hay una librería de generación de Excel (ej. `xlsx`, `exceljs`) antes de proponer instalar una nueva.

### Fase 1 — Corregir el sidebar del módulo anterior (Operación de Equipos)
- [ ] 1.1 Agregar entrada de navegación del módulo de Operación de Equipos en `AppSidebar.tsx` (grupo/ítem + ícono + ruta).
- [ ] 1.2 Verificar que el ítem respete el permiso `operaciones.turnos.ver` (ocultarlo si el usuario no tiene el permiso, sin que eso reemplace la verificación de servidor).
- [ ] 1.3 Probar navegación end-to-end: entrar por el sidebar y llegar a una página funcional (no solo un placeholder).

### Fase 2 — Base de datos (una migración por ítem)
- [ ] 2.1 Migración `festivos` (si no existe) + seed del año en curso.
- [ ] 2.2 Migración `configuracion_jornada` (parametrizable, no hardcodear horario nocturno).
- [ ] 2.3 Migración `jornada_programacion` + constraint de no duplicar operador/fecha + RLS.
- [ ] 2.4 Migración `jornada_marcaciones` + RLS.
- [ ] 2.5 Migración `jornada_novedades` + RLS.
- [ ] 2.6 Migración `jornada_correcciones` (auditoría) + RLS.
- [ ] 2.7 (Si D4 = sí) Migración `jornada_autorizaciones_extra` + RLS.
- [ ] 2.8 Función `fn_clasificar_horas` (clasificación en las 8 categorías) — cubrir el caso de turnos que cruzan medianoche.
- [ ] 2.9 Vista `vw_resumen_nomina_semanal` (fuente única para UI y Excel).
- [ ] 2.10 Migración de los 8 permisos nuevos + asignación a roles correspondientes (coordinador de operaciones y/o rol de nómina, a confirmar).

### Fase 3 — Servicios de datos (`features/jornada`)
- [ ] 3.1 `crearProgramacionSemanal(operadores[], semana)`.
- [ ] 3.2 `editarProgramacion(programacionId, cambios)`.
- [ ] 3.3 `listarProgramacionDelDia(fecha, centroTrabajo?)` — para pintar la lista de "operadores programados hoy".
- [ ] 3.4 `marcarLlegada(programacionId)` — captura hora real de inicio.
- [ ] 3.5 `marcarSalida(marcacionId)` — captura hora real de fin.
- [ ] 3.6 `registrarNovedad(operadorId, fecha, tipoNovedad, observaciones)`.
- [ ] 3.7 `corregirMarcacion(marcacionId, campo, valorNuevo, motivo)` — nunca editar el dato crudo sin dejar registro en `jornada_correcciones`.
- [ ] 3.8 (Si D4 = sí) `autorizarHoraExtra(marcacionId, motivo)`.
- [ ] 3.9 `obtenerResumenNomina(operadorId?, rangoFechas)` — consume la vista de la tarea 2.9.

### Fase 4 — Autorización
- [ ] 4.1 Verificar permiso en servidor para cada acción (crear programación, marcar, corregir, exportar).
- [ ] 4.2 Políticas RLS por tabla nueva, probadas con acceso autorizado y no autorizado.

### Fase 5 — Módulo "Planeación Semanal" (con sidebar desde el inicio)
- [ ] 5.1 Agregar ítem "Planeación Semanal" en `AppSidebar.tsx` bajo el grupo "Jornada de Trabajo" (ícono nuevo en `src/icons/` si hace falta).
- [ ] 5.2 Página `/jornada/planeacion`: tabla editable de programación por semana (operador × día).
- [ ] 5.3 Formulario/):edición rápida por celda o por fila (RHF + Zod) para hora inicio/fin programada.
- [ ] 5.4 Validación: no permitir duplicar programación del mismo operador/fecha.
- [ ] 5.5 Estados loading/empty/error/success.
- [ ] 5.6 Mobile-first: la tabla semanal debe ser usable en pantalla pequeña (ej. vista de tarjetas por día en móvil).

### Fase 6 — Módulo "Asistencia" (con sidebar desde el inicio)
- [ ] 6.1 Agregar ítem "Asistencia" en el sidebar bajo "Jornada de Trabajo".
- [ ] 6.2 Página `/jornada/asistencia`: lista de operadores programados para el día (o turno) seleccionado, tipo checklist.
- [ ] 6.3 Check "Llegó" por fila → `marcarLlegada`, muestra hora capturada, deshabilita el check tras usarlo.
- [ ] 6.4 Check "Salió" por fila → `marcarSalida`, muestra hora capturada.
- [ ] 6.5 Acción "Registrar novedad" por fila (incapacidad, permiso, ausencia) cuando el operario no va a marcar.
- [ ] 6.6 Vista de corrección manual (solo para quien tenga `jornada.asistencia.corregir`), con motivo obligatorio.
- [ ] 6.7 Estados loading/empty/error/success; resaltar visualmente a los operadores programados que aún no han marcado.
- [ ] 6.8 Mobile-first: pensado para usarse desde el celular al pie del turno.

### Fase 7 — Módulo "Resumen de Nómina" (con sidebar desde el inicio)
- [ ] 7.1 Agregar ítem "Resumen de Nómina" en el sidebar bajo "Jornada de Trabajo".
- [ ] 7.2 Página `/jornada/nomina`: filtro de rango de fechas + selector de operador(es).
- [ ] 7.3 Tabla: Operario, Semana, y las 8 columnas de horas (ordinarias, recargo nocturno 35%, extra diurna 25%, extra nocturna 75%, dominical/festiva 90%, nocturna dominical/festiva 125%, extra diurna dominical/festiva 115%, extra nocturna dominical/festiva 165%).
- [ ] 7.4 Botón "Descargar Excel" — usa la misma fuente de datos que la tabla en pantalla (vista de la tarea 2.9), para que Excel y pantalla nunca difieran.
- [ ] 7.5 Definir formato del Excel (una fila por operario/semana, encabezados iguales a las columnas de pantalla).
- [ ] 7.6 Estados loading/empty/error/success.
- [ ] 7.7 Permiso `jornada.nomina.exportar` verificado en servidor antes de generar el archivo.

### Fase 8 — Cierre
- [ ] 8.1 Ejecutar lint/typecheck/build/test definidos en `package.json`.
- [ ] 8.2 Probar acceso autorizado y no autorizado de cada permiso nuevo.
- [ ] 8.3 Prueba de no regresión sobre el módulo de Operación de Equipos y sobre el sidebar general.
- [ ] 8.4 Confirmar que los 3 módulos son accesibles desde el sidebar sin pasos manuales (esto es lo que falló la vez anterior).
- [ ] 8.5 Informe final en el formato de `AGENTS.md` §25.

---

## 7. Orden sugerido de ejecución

```
Fase 0 → Fase 1 (arreglar sidebar anterior) → Fase 2 → Fase 3 → Fase 4
→ Fase 5 → Fase 6 → Fase 7 → Fase 8
```

## 8. Fuera de alcance de este spec

- Liquidación/pago efectivo de nómina (solo se calculan y muestran las horas, no se integra con un sistema de pagos).
- Cálculo de seguridad social/deducciones.
- App móvil nativa (se cubre con diseño mobile-first web).
