# SPEC — Módulo de Talento Humano: Empleados y Dotación

## 1. Identificación

**Proyecto:** Operlog  
**Módulo:** Talento Humano  
**Feature:** Gestión de empleados y dotación  
**Tipo:** Feature funcional completa  
**Prioridad:** Alta  
**Arquitectura:** Next.js + Supabase SSR + React Hook Form + Zod + pnpm  
**ORM:** No utilizar Prisma  
**UX:** Mobile-first / responsive  
**Base de datos:** Supabase PostgreSQL

---

# 2. Objetivo

Implementar una primera versión sólida del módulo de **Talento Humano** que permita:

1. Crear empleados.
2. Consultar empleados.
3. Editar empleados.
4. Activar/inactivar empleados.
5. Consultar el perfil completo de un empleado.
6. Gestionar información laboral.
7. Gestionar contactos de emergencia.
8. Mantener historial laboral.
9. Administrar el catálogo de elementos de dotación.
10. Registrar entregas de dotación.
11. Registrar múltiples elementos dentro de una entrega.
12. Controlar tallas.
13. Controlar devoluciones cuando corresponda.
14. Consultar el historial de dotación de cada empleado.
15. Mantener trazabilidad de quién realizó cada operación.

La implementación debe integrarse con la arquitectura existente del proyecto y **no debe crear una arquitectura paralela**.

---

# 3. Regla principal para el agente

Antes de modificar cualquier archivo:

1. Inspeccionar el repositorio.
2. Identificar la arquitectura actual.
3. Identificar cómo están implementados actualmente:
   - autenticación
   - autorización
   - layouts
   - navegación
   - formularios
   - tablas
   - modales
   - validaciones
   - Supabase clients
   - server actions
   - manejo de errores
   - loading states
   - toast/notifications
4. Revisar las convenciones existentes.
5. Reutilizar componentes existentes cuando sea posible.
6. No duplicar componentes que ya existan.
7. No instalar dependencias nuevas sin justificarlo.
8. No utilizar Prisma.
9. No modificar funcionalidades existentes que no pertenezcan a esta feature.

---

# 4. Investigación inicial obligatoria

Antes de implementar:

### TASK TH-001 — Auditar repositorio

Inspeccionar:

```text
apps/web
packages/
src/
app/
features/
components/
lib/
supabase/
```

Determinar la estructura real del proyecto.

**Resultado esperado:**

Documento mental/plan interno del agente con:

- estructura de carpetas
- patrón de features
- patrón de acceso a Supabase
- patrón de formularios
- patrón de validaciones
- patrón de tablas
- patrón de permisos

No modificar código todavía.

---

### TASK TH-002 — Auditar Supabase

Identificar:

- cliente browser
- cliente server
- middleware
- autenticación
- manejo de sesión
- políticas RLS
- tablas existentes relacionadas con usuarios
- relación entre `auth.users` y usuarios internos

**Regla:**

No crear una segunda solución de autenticación.

---

### TASK TH-003 — Auditar módulo existente de Talento Humano

Buscar si ya existen:

```text
empleados
talento humano
dotacion
epp
cargos
areas
contratos
```

Si existen estructuras parciales:

- reutilizarlas
- migrarlas cuando sea necesario
- evitar duplicados

---

# 5. Modelo de datos

Crear una estructura normalizada.

## 5.1 Tabla `empleados`

Información principal del empleado.

Campos mínimos:

```text
id
tipo_documento
numero_documento
primer_nombre
segundo_nombre
primer_apellido
segundo_apellido
fecha_nacimiento
sexo
telefono
correo_personal
correo_corporativo
direccion
ciudad
fecha_ingreso
fecha_retiro
estado
observaciones
created_at
updated_at
created_by
updated_by
```

### Reglas

`numero_documento` debe ser único.

`estado` debe utilizar valores controlados:

```text
activo
inactivo
retirado
```

No eliminar físicamente empleados que tengan historial operativo.

Utilizar inactivación/retirement en lugar de DELETE cuando existan registros relacionados.

---

# 6. Información laboral

## 6.1 Tabla `empleados_laboral`

Campos:

```text
id
id_empleado
cargo
area
centro_trabajo
tipo_contrato
fecha_inicio
fecha_fin
jefe_inmediato
salario
tipo_jornada
turno
estado
observaciones
created_at
updated_at
```

La información laboral debe permitir historial.

---

# 7. Historial laboral

## 7.1 Tabla `empleados_historial_laboral`

Campos:

```text
id
id_empleado
cargo
area
centro_trabajo
tipo_contrato
fecha_inicio
fecha_fin
jefe_inmediato
observaciones
created_at
created_by
```

Cada cambio relevante de:

- cargo
- área
- centro de trabajo
- contrato

debe poder conservarse históricamente.

---

# 8. Contactos de emergencia

## 8.1 Tabla `empleados_contactos_emergencia`

Campos:

```text
id
id_empleado
nombre_completo
parentesco
telefono_principal
telefono_alternativo
direccion
es_principal
created_at
updated_at
```

Un empleado puede tener múltiples contactos.

Solo debe existir un contacto principal por empleado.

---

# 9. Catálogo de dotación

## 9.1 Tabla `elementos_dotacion`

Campos:

```text
id
nombre
descripcion
categoria
requiere_talla
requiere_devolucion
vida_util_dias
unidad_medida
estado
created_at
updated_at
```

Categorías iniciales:

```text
EPP
Uniforme
Dotacion
Accesorio
Herramienta
```

El catálogo debe poder crecer sin modificar la estructura de empleados.

---

# 10. Entregas de dotación

## 10.1 Tabla `entregas_dotacion`

Campos:

```text
id
id_empleado
fecha_entrega
tipo_entrega
entregado_por
observaciones
firma_empleado
estado
created_at
updated_at
```

Tipos de entrega:

```text
inicial
renovacion
reposicion
```

Estados:

```text
entregada
anulada
```

---

# 11. Detalle de entrega

## 11.1 Tabla `entregas_dotacion_detalle`

Campos:

```text
id
id_entrega
id_elemento
cantidad
talla
estado_entrega
fecha_vencimiento
requiere_devolucion
fecha_devolucion
estado_devolucion
observaciones
created_at
updated_at
```

Estados de entrega:

```text
nuevo
usado
repuesto
```

Estados de devolución:

```text
no_aplica
pendiente
devuelto
```

---

# 12. Relaciones

Implementar las siguientes relaciones:

```text
empleados
    │
    ├── empleados_laboral
    │
    ├── empleados_historial_laboral
    │
    ├── empleados_contactos_emergencia
    │
    └── entregas_dotacion
              │
              └── entregas_dotacion_detalle
                          │
                          └── elementos_dotacion
```

Utilizar foreign keys.

No utilizar IDs manuales.

Preferir UUID si esa es la convención actual del proyecto.

---

# 13. Índices y restricciones

Crear índices para:

```text
empleados.numero_documento
empleados.estado
empleados.nombre/apellidos
empleados.fecha_ingreso
empleados_laboral.id_empleado
empleados_historial_laboral.id_empleado
empleados_contactos_emergencia.id_empleado
entregas_dotacion.id_empleado
entregas_dotacion.fecha_entrega
entregas_dotacion_detalle.id_entrega
entregas_dotacion_detalle.id_elemento
```

Crear restricciones para evitar:

- documentos duplicados
- relaciones inexistentes
- cantidades menores o iguales a cero
- estados inválidos
- fechas incoherentes

---

# 14. Seguridad RLS

Implementar Row Level Security en las tablas nuevas.

El agente debe revisar primero el sistema actual de roles/permisos.

No asumir nombres de roles existentes.

Integrar el módulo al mecanismo de autorización existente.

Como mínimo deben existir permisos conceptuales para:

```text
talento_humano.empleados.ver
talento_humano.empleados.crear
talento_humano.empleados.editar
talento_humano.empleados.estado
talento_humano.dotacion.ver
talento_humano.dotacion.crear
talento_humano.dotacion.editar
talento_humano.dotacion.anular
```

Si el proyecto ya posee un sistema de permisos, utilizarlo.

---

# 15. UI — Empleados

Crear vista:

```text
Talento Humano
└── Empleados
```

La vista debe mostrar:

- nombre completo
- documento
- cargo
- área
- centro de trabajo
- fecha de ingreso
- estado

Funciones:

```text
Buscar
Filtrar
Crear
Editar
Ver detalle
Cambiar estado
```

---

# 16. Mobile-first

La interfaz debe estar diseñada primero para:

```text
320px+
375px+
390px+
768px+
1024px+
```

En móvil:

- evitar tablas horizontales innecesarias
- utilizar cards cuando sea conveniente
- formularios en una sola columna
- botones grandes
- acciones accesibles con el pulgar
- evitar modales excesivamente grandes
- usar bottom sheets/drawers si la arquitectura actual los soporta

En desktop:

- utilizar tablas
- aprovechar espacio disponible
- mantener jerarquía visual clara

---

# 17. Formulario de empleado

Crear formulario utilizando:

```text
React Hook Form
Zod
```

Dividir visualmente en:

### Información personal

```text
Tipo de documento
Número de documento
Primer nombre
Segundo nombre
Primer apellido
Segundo apellido
Fecha de nacimiento
Sexo
```

### Información de contacto

```text
Teléfono
Correo personal
Correo corporativo
Dirección
Ciudad
```

### Información laboral

```text
Fecha de ingreso
Cargo
Área
Centro de trabajo
Tipo de contrato
Jefe inmediato
Turno
```

---

# 18. Validaciones

Implementar validaciones frontend y backend.

Validar:

- campos obligatorios
- documento
- correo
- fechas
- estados
- cantidades
- relaciones
- duplicados

Nunca confiar únicamente en las validaciones del frontend.

---

# 19. Detalle del empleado

Crear una vista:

```text
/employees/[id]
```

o respetar el patrón de routing existente.

Debe mostrar:

```text
Información personal
Información laboral
Contactos de emergencia
Historial laboral
Dotaciones
```

Utilizar tabs/sections si el sistema actual lo permite.

---

# 20. Dotación

Crear sección:

```text
Talento Humano
└── Dotación
```

Debe permitir:

### Catálogo

CRUD de elementos.

### Entregas

Registrar una entrega.

Una entrega puede contener múltiples elementos.

Ejemplo:

```text
Entrega #00025

Empleado: Juan Pérez
Fecha: 03/09/2026
Tipo: Entrega inicial

Detalle:

Casco       1
Botas       1 — talla 42
Guantes     2 — talla M
Gafas       1
Overol      1 — talla L
```

---

# 21. Flujo de entrega

El formulario debe funcionar así:

### Paso 1

Seleccionar empleado.

### Paso 2

Seleccionar tipo de entrega.

### Paso 3

Agregar elementos.

Cada línea debe permitir:

```text
Elemento
Cantidad
Talla
Estado
Fecha vencimiento
Requiere devolución
Observaciones
```

### Paso 4

Agregar observaciones.

### Paso 5

Confirmar entrega.

### Paso 6

Guardar encabezado + detalle en una operación consistente.

Si ocurre un error, no debe quedar una entrega parcialmente registrada.

Utilizar una estrategia transaccional apropiada para Supabase/PostgreSQL.

---

# 22. Historial de dotación

Desde el perfil del empleado mostrar:

```text
Historial de dotación
```

Ejemplo:

```text
03/09/2026
Entrega inicial

Casco
Botas — 42
Guantes — M
Gafas
Overol — L
```

Permitir abrir el detalle de cada entrega.

---

# 23. Devoluciones

Cuando un elemento tenga:

```text
requiere_devolucion = true
```

debe poder marcarse posteriormente como:

```text
devuelto
```

Registrar:

```text
fecha_devolucion
estado_devolucion
```

Nunca borrar el historial de la entrega.

---

# 24. Catálogos

Antes de crear catálogos nuevos, revisar si ya existen.

Si no existen, evaluar la creación de:

```text
cargos
areas
centros_trabajo
tipos_contrato
turnos
```

No duplicar información que ya esté gestionada por otros módulos.

Las relaciones deben utilizar IDs y no nombres libres cuando exista un catálogo.

---

# 25. Arquitectura frontend

Seguir exactamente el patrón actual del proyecto.

Preferir una estructura equivalente a:

```text
features/
└── talento-humano/
    ├── empleados/
    │   ├── components/
    │   ├── schemas/
    │   ├── actions/
    │   ├── queries/
    │   └── types/
    │
    └── dotacion/
        ├── components/
        ├── schemas/
        ├── actions/
        ├── queries/
        └── types/
```

Pero si el proyecto tiene otra convención, **usar la existente**.

---

# 26. Estados de UI

Todos los listados deben manejar:

```text
loading
empty
error
success
```

Los formularios deben manejar:

```text
idle
submitting
success
error
```

Nunca dejar botones sin feedback durante una operación.

Evitar doble envío.

---

# 27. Manejo de errores

Los errores técnicos de Supabase no deben mostrarse directamente al usuario.

Transformar errores a mensajes UX comprensibles.

Ejemplo:

En lugar de:

```text
duplicate key value violates unique constraint
```

mostrar:

```text
Ya existe un empleado registrado con este número de documento.
```

---

# 28. Auditoría

Toda operación importante debe conservar:

```text
created_at
created_by
updated_at
updated_by
```

Cuando aplique:

```text
anulado_por
fecha_anulacion
```

No eliminar información histórica.

---

# 29. Tareas atómicas

El agente debe ejecutar las tareas en este orden.

## FASE 1 — Discovery

- [ ] TH-001 Auditar estructura del repositorio.
- [ ] TH-002 Auditar arquitectura frontend.
- [ ] TH-003 Auditar Supabase.
- [ ] TH-004 Auditar autenticación.
- [ ] TH-005 Auditar autorización.
- [ ] TH-006 Auditar componentes UI existentes.
- [ ] TH-007 Auditar patrón de formularios.
- [ ] TH-008 Auditar patrón de tablas.
- [ ] TH-009 Buscar tablas existentes relacionadas con empleados.
- [ ] TH-010 Buscar funcionalidades existentes de Talento Humano.
- [ ] TH-011 Identificar catálogos reutilizables.

**Gate:** no continuar hasta entender la arquitectura existente.

---

## FASE 2 — Base de datos

- [ ] TH-012 Diseñar migración SQL.
- [ ] TH-013 Crear `empleados`.
- [ ] TH-014 Crear `empleados_laboral`.
- [ ] TH-015 Crear `empleados_historial_laboral`.
- [ ] TH-016 Crear `empleados_contactos_emergencia`.
- [ ] TH-017 Crear `elementos_dotacion`.
- [ ] TH-018 Crear `entregas_dotacion`.
- [ ] TH-019 Crear `entregas_dotacion_detalle`.
- [ ] TH-020 Crear foreign keys.
- [ ] TH-021 Crear índices.
- [ ] TH-022 Crear constraints.
- [ ] TH-023 Crear triggers necesarios para timestamps/auditoría.
- [ ] TH-024 Implementar RLS.
- [ ] TH-025 Verificar RLS con usuarios autorizados.
- [ ] TH-026 Verificar RLS con usuarios no autorizados.

**Gate:** las tablas deben poder consultarse correctamente desde Supabase.

---

## FASE 3 — Schemas y tipos

- [ ] TH-027 Crear tipos TypeScript.
- [ ] TH-028 Crear schema Zod para empleado.
- [ ] TH-029 Crear schema Zod para información laboral.
- [ ] TH-030 Crear schema Zod para contacto.
- [ ] TH-031 Crear schema Zod para elemento de dotación.
- [ ] TH-032 Crear schema Zod para entrega.
- [ ] TH-033 Crear schema Zod para detalle de entrega.

---

## FASE 4 — Empleados

- [ ] TH-034 Crear listado de empleados.
- [ ] TH-035 Implementar búsqueda.
- [ ] TH-036 Implementar filtros.
- [ ] TH-037 Crear formulario de empleado.
- [ ] TH-038 Implementar creación.
- [ ] TH-039 Implementar edición.
- [ ] TH-040 Implementar cambio de estado.
- [ ] TH-041 Crear vista de detalle.
- [ ] TH-042 Mostrar información personal.
- [ ] TH-043 Mostrar información laboral.
- [ ] TH-044 Mostrar contactos.
- [ ] TH-045 Mostrar historial laboral.

---

## FASE 5 — Contactos

- [ ] TH-046 Crear componente de contactos.
- [ ] TH-047 Crear contacto.
- [ ] TH-048 Editar contacto.
- [ ] TH-049 Eliminar/desactivar contacto según arquitectura.
- [ ] TH-050 Garantizar un único contacto principal.

---

## FASE 6 — Historial laboral

- [ ] TH-051 Crear mecanismo de historial.
- [ ] TH-052 Registrar cambios laborales.
- [ ] TH-053 Mostrar historial.
- [ ] TH-054 Verificar fechas de vigencia.
- [ ] TH-055 Evitar pérdida del historial anterior.

---

## FASE 7 — Catálogo de dotación

- [ ] TH-056 Crear listado de elementos.
- [ ] TH-057 Crear elemento.
- [ ] TH-058 Editar elemento.
- [ ] TH-059 Activar/inactivar elemento.
- [ ] TH-060 Implementar categorías.
- [ ] TH-061 Implementar configuración de talla.
- [ ] TH-062 Implementar vida útil.
- [ ] TH-063 Implementar requisito de devolución.

---

## FASE 8 — Entregas

- [ ] TH-064 Crear listado de entregas.
- [ ] TH-065 Crear formulario de entrega.
- [ ] TH-066 Seleccionar empleado.
- [ ] TH-067 Seleccionar tipo de entrega.
- [ ] TH-068 Agregar elementos dinámicamente.
- [ ] TH-069 Validar cantidad.
- [ ] TH-070 Validar talla cuando corresponda.
- [ ] TH-071 Registrar fecha de vencimiento.
- [ ] TH-072 Registrar devolución requerida.
- [ ] TH-073 Registrar observaciones.
- [ ] TH-074 Guardar encabezado.
- [ ] TH-075 Guardar detalles.
- [ ] TH-076 Garantizar consistencia de la operación.
- [ ] TH-077 Evitar doble envío.
- [ ] TH-078 Mostrar confirmación de entrega.

---

## FASE 9 — Historial de dotación

- [ ] TH-079 Mostrar entregas en perfil del empleado.
- [ ] TH-080 Mostrar detalle de entrega.
- [ ] TH-081 Mostrar elementos entregados.
- [ ] TH-082 Mostrar cantidades.
- [ ] TH-083 Mostrar tallas.
- [ ] TH-084 Mostrar fechas.
- [ ] TH-085 Mostrar estado de devolución.

---

## FASE 10 — Devoluciones

- [ ] TH-086 Identificar elementos pendientes de devolución.
- [ ] TH-087 Crear acción de devolución.
- [ ] TH-088 Registrar fecha.
- [ ] TH-089 Actualizar estado.
- [ ] TH-090 Evitar devolución duplicada.
- [ ] TH-091 Mantener trazabilidad.

---

## FASE 11 — UX

- [ ] TH-092 Revisar mobile-first.
- [ ] TH-093 Revisar formularios en móvil.
- [ ] TH-094 Revisar tablas en móvil.
- [ ] TH-095 Revisar botones.
- [ ] TH-096 Revisar loading states.
- [ ] TH-097 Revisar empty states.
- [ ] TH-098 Revisar error states.
- [ ] TH-099 Revisar confirmaciones.
- [ ] TH-100 Revisar accesibilidad básica.
- [ ] TH-101 Revisar responsive desktop/tablet/móvil.

---

# 30. Testing

Crear pruebas para:

### Empleados

- [ ] Crear empleado válido.
- [ ] Rechazar documento duplicado.
- [ ] Rechazar campos obligatorios.
- [ ] Editar empleado.
- [ ] Cambiar estado.
- [ ] Consultar empleado.

### Contactos

- [ ] Crear contacto.
- [ ] Crear múltiples contactos.
- [ ] Validar contacto principal único.

### Dotación

- [ ] Crear elemento.
- [ ] Crear entrega.
- [ ] Agregar múltiples elementos.
- [ ] Validar cantidad.
- [ ] Validar talla.
- [ ] Consultar historial.
- [ ] Registrar devolución.

### Seguridad

- [ ] Usuario autorizado puede consultar.
- [ ] Usuario autorizado puede crear.
- [ ] Usuario autorizado puede editar.
- [ ] Usuario no autorizado no puede modificar.

---

# 31. Validación final

Antes de considerar la feature terminada:

Ejecutar los comandos de calidad existentes en el proyecto.

Como mínimo:

```text
lint
typecheck
test
build
```

Utilizar los comandos reales definidos en `package.json`.

No inventar comandos.

---

# 32. Criterios de aceptación

La feature solo se considera terminada cuando:

1. Un usuario autorizado puede crear un empleado.
2. No pueden existir documentos duplicados.
3. Se puede editar el empleado.
4. Se puede cambiar su estado.
5. Se puede consultar su información completa.
6. Se pueden registrar múltiples contactos.
7. Se conserva historial laboral.
8. Se puede crear el catálogo de dotación.
9. Se puede registrar una entrega.
10. Una entrega puede tener múltiples elementos.
11. Se pueden manejar tallas.
12. Se pueden manejar elementos con devolución.
13. Se puede consultar el historial de dotación.
14. Se puede registrar una devolución.
15. No se pierde información histórica.
16. Las operaciones están protegidas por autorización/RLS.
17. La interfaz funciona correctamente en móvil.
18. La interfaz funciona correctamente en tablet.
19. La interfaz funciona correctamente en desktop.
20. No existen errores TypeScript.
21. No existen errores de lint.
22. El build finaliza correctamente.
23. No se utiliza Prisma.
24. No se rompen funcionalidades existentes.

---

# 33. Reglas de implementación para OpenCode

## NO hacer

- No utilizar Prisma.
- No crear una API paralela si la arquitectura actual no la utiliza.
- No crear tablas duplicadas.
- No duplicar componentes existentes.
- No almacenar múltiples elementos de dotación como columnas dentro de `empleados`.
- No guardar nombres de relaciones cuando debe utilizarse un ID.
- No eliminar físicamente empleados con historial.
- No eliminar registros históricos de dotación.
- No confiar únicamente en validaciones frontend.
- No saltarse RLS.
- No modificar módulos no relacionados.
- No instalar paquetes innecesarios.

## SÍ hacer

- Reutilizar arquitectura existente.
- Usar Supabase directamente siguiendo el patrón actual.
- Usar React Hook Form.
- Usar Zod.
- Mantener separación de responsabilidades.
- Mantener componentes pequeños.
- Mantener consultas tipadas.
- Implementar estados de carga/error/vacío.
- Mantener trazabilidad.
- Diseñar mobile-first.
- Mantener código simple y mantenible.

---

# 34. Estrategia de ejecución

El agente NO debe intentar implementar toda la SPEC de una sola vez.

Debe ejecutar:

```text
FASE 1
↓
validar
↓
FASE 2
↓
validar
↓
FASE 3
↓
validar
↓
FASE 4
↓
validar
↓
FASE 5
↓
validar
↓
...
↓
FASE 11
↓
testing
↓
validación final
```

Después de cada fase:

1. Revisar archivos modificados.
2. Ejecutar validaciones pertinentes.
3. Corregir errores.
4. Confirmar que no se rompió funcionalidad existente.
5. Continuar con la siguiente fase.

---

# 35. Definition of Done

La implementación está terminada cuando:

```text
[✓] Base de datos implementada
[✓] Relaciones implementadas
[✓] RLS implementado
[✓] Schemas Zod
[✓] Types TypeScript
[✓] CRUD empleados
[✓] Información laboral
[✓] Historial laboral
[✓] Contactos emergencia
[✓] Catálogo dotación
[✓] Entregas
[✓] Detalle entregas
[✓] Devoluciones
[✓] Historial dotación
[✓] Responsive
[✓] Mobile-first
[✓] Estados UX
[✓] Manejo de errores
[✓] Auditoría
[✓] Tests
[✓] Lint
[✓] Typecheck
[✓] Build
```

---

# 36. Entregable final del agente

Al terminar, generar un resumen:

```text
## Implementado

### Base de datos
- tablas creadas
- índices
- constraints
- RLS

### Backend
- queries
- mutations/actions
- validaciones

### Frontend
- páginas
- componentes
- formularios

### Seguridad
- permisos
- RLS

### Testing
- pruebas ejecutadas
- resultado

### Validaciones
- lint: PASS/FAIL
- typecheck: PASS/FAIL
- build: PASS/FAIL

### Archivos modificados
- listado

### Pendientes
- listado únicamente si realmente existen
```

El agente no debe declarar la feature como terminada si alguno de los criterios de aceptación falla.