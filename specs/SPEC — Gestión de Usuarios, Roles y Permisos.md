# SPEC — Gestión de Usuarios, Roles y Permisos

## 1. Identificación

**Proyecto:** Operlog  
**Módulo:** Administración  
**Feature:** Usuarios, roles y permisos  
**Prioridad:** Crítica  
**Stack:** Next.js + Supabase SSR + React Hook Form + Zod + pnpm  
**Base de datos:** Supabase PostgreSQL  
**ORM:** No utilizar Prisma  
**Autenticación:** Supabase Auth  
**UX:** Mobile-first / responsive

---

# 2. Objetivo

Implementar un sistema completo de administración de acceso que permita:

- Crear usuarios del sistema.
- Asociar un usuario de autenticación con un perfil interno.
- Activar/inactivar usuarios.
- Asignar uno o varios roles.
- Crear y administrar roles.
- Definir permisos.
- Asignar permisos a roles.
- Controlar acceso a módulos.
- Controlar acciones dentro de cada módulo.
- Aplicar autorización tanto en frontend como backend/database.
- Mantener trazabilidad de cambios.
- Evitar que un usuario pueda otorgarse permisos a sí mismo.
- Evitar depender exclusivamente de ocultar botones en frontend.

El sistema debe ser diseñado para que posteriormente puedan agregarse nuevos módulos sin modificar la arquitectura de autorización.

---

# 3. Principio arquitectónico

Separar claramente:

```text
Supabase Auth
     │
     │ auth.users
     ↓
usuarios
     │
     ├── roles_usuario
     │       │
     │       ↓
     │     roles
     │       │
     │       ↓
     │   roles_permisos
     │       │
     │       ↓
     │   permisos
     │
     └── información administrativa
```

La autenticación determina:

> ¿Quién es el usuario?

La autorización determina:

> ¿Qué puede hacer ese usuario?

Nunca mezclar ambos conceptos.

---

# 4. Regla principal para OpenCode

Antes de modificar cualquier archivo:

1. Inspeccionar completamente el sistema actual.
2. Revisar autenticación Supabase.
3. Revisar `auth.users`.
4. Revisar si ya existe una tabla de usuarios.
5. Revisar roles existentes.
6. Revisar permisos existentes.
7. Revisar middleware.
8. Revisar layouts.
9. Revisar navegación/sidebar.
10. Revisar cómo se protege actualmente cada ruta.
11. Revisar componentes de UI existentes.
12. Revisar sistema de formularios.
13. Revisar sistema de notificaciones.
14. Revisar RLS.
15. Revisar las skills disponibles.

No crear una arquitectura paralela.

No utilizar Prisma.

---

# 5. Discovery obligatorio

## TASK USR-001 — Auditar autenticación

Determinar:

- cómo se realiza login
- cómo se obtiene el usuario autenticado
- cómo se mantiene la sesión
- cómo funciona middleware
- cómo se obtiene `auth.users.id`
- dónde se crean actualmente usuarios

---

## TASK USR-002 — Auditar usuarios

Buscar:

```text
usuarios
users
profiles
profiles_users
user_profiles
```

Determinar si ya existe una tabla equivalente.

Si existe:

- reutilizarla
- extenderla si es necesario
- no crear una tabla duplicada

---

## TASK USR-003 — Auditar roles

Buscar:

```text
roles
user_roles
roles_users
permissions
permissions_roles
```

Determinar si ya existe algún sistema.

---

## TASK USR-004 — Auditar autorización

Revisar:

- middleware
- server actions
- route handlers
- RLS
- componentes de protección
- hooks
- funciones de autorización

Determinar si actualmente la aplicación utiliza:

```text
role-based access control
```

o:

```text
permission-based access control
```

---

## TASK USR-005 — Auditar navegación

Determinar cómo se construye:

- sidebar
- menú
- rutas
- módulos
- submódulos

El menú debe poder utilizar posteriormente los permisos para mostrar únicamente las opciones permitidas.

---

## TASK USR-006 — Auditar módulos existentes

Identificar los módulos reales del sistema.

No inventar módulos.

Crear posteriormente permisos únicamente para funcionalidades existentes o planificadas según la arquitectura actual.

---

# 6. Modelo de datos

La solución debe utilizar RBAC:

**Role Based Access Control**

pero los roles no deben tener lógica hardcodeada en los componentes.

---

# 7. Tabla `usuarios`

Representa el perfil administrativo del usuario.

Campos:

```text
id
auth_user_id
nombre
apellido
correo
telefono
estado
fecha_ultimo_acceso
created_at
updated_at
created_by
updated_by
```

Estados:

```text
activo
inactivo
bloqueado
```

### Reglas

`auth_user_id` debe ser único.

El correo debe mantenerse sincronizado correctamente con Supabase Auth según la arquitectura definida.

No almacenar contraseñas.

Nunca almacenar:

```text
password
password_hash
password_confirmation
```

La contraseña debe ser gestionada exclusivamente por Supabase Auth.

---

# 8. Tabla `roles`

Campos:

```text
id
nombre
codigo
descripcion
es_sistema
estado
created_at
updated_at
created_by
updated_by
```

Ejemplos iniciales:

```text
Administrador
Supervisor
Operaciones
Talento Humano
Consulta
```

Los nombres definitivos deben adaptarse a los roles reales del negocio.

`codigo` debe ser único.

Ejemplo:

```text
ADMIN
SUPERVISOR
OPERACIONES
TALENTO_HUMANO
CONSULTA
```

---

# 9. Tabla `usuarios_roles`

Relación muchos a muchos:

```text
usuario
   ↓
usuarios_roles
   ↓
rol
```

Campos:

```text
id
usuario_id
rol_id
created_at
created_by
```

Crear restricción única:

```text
usuario_id + rol_id
```

Un usuario puede tener varios roles.

---

# 10. Tabla `permisos`

Los permisos representan acciones concretas.

Campos:

```text
id
nombre
codigo
descripcion
modulo
recurso
accion
estado
created_at
updated_at
```

Ejemplo:

```text
codigo:
talento_humano.empleados.ver

modulo:
talento_humano

recurso:
empleados

accion:
ver
```

---

# 11. Convención de permisos

Utilizar:

```text
modulo.recurso.accion
```

Ejemplos:

```text
talento_humano.empleados.ver
talento_humano.empleados.crear
talento_humano.empleados.editar
talento_humano.empleados.eliminar
talento_humano.empleados.estado

talento_humano.dotacion.ver
talento_humano.dotacion.crear
talento_humano.dotacion.editar
talento_humano.dotacion.anular

produccion.ordenes.ver
produccion.ordenes.crear
produccion.ordenes.editar

sst.ats.ver
sst.ats.crear
sst.ats.editar

usuarios.ver
usuarios.crear
usuarios.editar
usuarios.estado

roles.ver
roles.crear
roles.editar
roles.permisos
```

No utilizar permisos como:

```text
puede_ver_empleados
puede_crear_empleados
```

La convención debe ser uniforme.

---

# 12. Tabla `roles_permisos`

Relación:

```text
roles
   ↓
roles_permisos
   ↓
permisos
```

Campos:

```text
id
rol_id
permiso_id
created_at
created_by
```

Restricción única:

```text
rol_id + permiso_id
```

---

# 13. Diagrama final

```text
auth.users
    │
    │ auth_user_id
    ↓
usuarios
    │
    │
    ↓
usuarios_roles
    │
    ↓
roles
    │
    ↓
roles_permisos
    │
    ↓
permisos
```

---

# 14. Superadministrador

Debe existir un mecanismo para un administrador principal del sistema.

No hardcodear correos personales.

No hacer:

```text
if email === "admin@empresa.com"
```

La autorización debe depender de un rol/permisos.

Ejemplo:

```text
SUPER_ADMIN
```

Este rol puede tener todos los permisos.

Debe existir protección para evitar que un usuario sin privilegios administrativos pueda asignarse este rol.

---

# 15. Crear usuario

El flujo debe ser:

```text
Administrador
      ↓
Crear usuario
      ↓
Información básica
      ↓
Correo
      ↓
Roles
      ↓
Crear usuario Auth
      ↓
Crear perfil usuarios
      ↓
Asignar roles
      ↓
Confirmación
```

La creación debe manejar correctamente errores parciales.

No debe quedar:

```text
Auth creado
pero
perfil inexistente
```

o:

```text
perfil creado
pero
Auth inexistente
```

Diseñar el flujo según las capacidades reales de Supabase Auth y PostgreSQL.

---

# 16. Contraseña

No implementar almacenamiento propio de contraseñas.

El sistema debe utilizar Supabase Auth.

Para creación de usuarios, evaluar el mecanismo existente y preferir:

```text
invitación / recuperación de contraseña
```

cuando sea compatible con la configuración actual.

Nunca mostrar ni almacenar contraseñas en logs.

---

# 17. Formulario de usuario

Campos:

### Información personal

```text
Nombre
Apellido
Correo
Teléfono
```

### Acceso

```text
Estado
Roles
```

No mostrar campos de contraseña si el flujo de invitación/recuperación de Supabase permite evitarlos.

---

# 18. Listado de usuarios

Crear:

```text
Administración
└── Usuarios
```

Mostrar:

```text
Nombre
Correo
Roles
Estado
Último acceso
```

Acciones:

```text
Ver
Editar
Cambiar estado
Gestionar roles
```

---

# 19. Búsqueda

Permitir buscar por:

```text
nombre
apellido
correo
```

Implementar debounce cuando corresponda.

---

# 20. Filtros

Filtros mínimos:

```text
Estado
Rol
```

---

# 21. Detalle del usuario

Mostrar:

```text
Información personal
Estado
Roles
Permisos efectivos
Último acceso
Fecha de creación
```

Los permisos efectivos deben calcularse a partir de:

```text
roles
+
roles_permisos
+
permisos
```

No guardar una copia redundante de los permisos efectivos en el usuario.

---

# 22. Gestión de roles

Crear:

```text
Administración
└── Roles
```

Funciones:

```text
Crear rol
Editar rol
Activar/inactivar rol
Gestionar permisos
```

---

# 23. Formulario de rol

Campos:

```text
Nombre
Código
Descripción
Estado
```

El código debe ser único.

Ejemplo:

```text
OPERACIONES
```

---

# 24. Gestión de permisos

Dentro de cada rol mostrar permisos agrupados por módulo.

Ejemplo:

```text
Talento Humano

☑ Empleados
   ☑ Ver
   ☑ Crear
   ☑ Editar
   ☐ Eliminar
   ☑ Cambiar estado

☑ Dotación
   ☑ Ver
   ☑ Crear
   ☐ Editar
   ☐ Anular
```

Utilizar agrupación visual.

No mostrar una lista plana de cientos de permisos.

---

# 25. Permisos por módulo

La estructura visual debe ser:

```text
Módulo
    ↓
Recurso
    ↓
Acciones
```

Ejemplo:

```text
Producción
 ├── Órdenes
 │    ├── Ver
 │    ├── Crear
 │    ├── Editar
 │    └── Finalizar
 │
 └── Limitaciones
      ├── Ver
      ├── Crear
      └── Resolver
```

---

# 26. Autorización frontend

Crear una abstracción reutilizable.

Ejemplo conceptual:

```text
hasPermission("produccion.ordenes.crear")
```

o equivalente siguiendo las convenciones actuales.

Utilizarla para:

- botones
- acciones
- navegación
- componentes

Pero esto **no constituye seguridad suficiente**.

---

# 27. Autorización backend

Toda operación sensible debe validar permisos en servidor.

Ejemplo:

```text
crear empleado
↓
validar sesión
↓
validar permiso
↓
ejecutar operación
```

Nunca confiar únicamente en:

```text
botón oculto
```

---

# 28. RLS

Implementar RLS para las tablas:

```text
usuarios
roles
usuarios_roles
permisos
roles_permisos
```

Las políticas deben impedir modificaciones no autorizadas.

Evaluar cuidadosamente el riesgo de:

```text
recursión de RLS
```

al consultar roles/permisos desde las propias políticas.

Cuando sea apropiado, utilizar funciones SQL `security definer` cuidadosamente diseñadas y protegidas.

---

# 29. Regla de seguridad crítica

Un usuario no debe poder:

```text
editar sus propios permisos
asignarse SUPER_ADMIN
crear un rol con permisos superiores a los que posee
eliminar su propio acceso administrativo
```

Implementar protección tanto en backend como en base de datos cuando sea necesario.

---

# 30. Protección del último administrador

Nunca permitir que el sistema quede sin administradores.

Antes de:

```text
desactivar administrador
quitar rol administrador
eliminar administrador
```

verificar que exista al menos otro administrador activo.

---

# 31. Auditoría

Registrar:

```text
created_at
created_by
updated_at
updated_by
```

Para acciones críticas evaluar una tabla:

```text
auditoria_accesos
```

con:

```text
id
usuario_id
accion
entidad
entidad_id
datos_anteriores
datos_nuevos
created_at
ip
user_agent
```

No registrar contraseñas ni tokens.

---

# 32. UX Mobile-first

En móvil:

- listado mediante cards
- filtros en drawer
- formulario en una columna
- roles mediante chips
- permisos mediante acordeones
- acciones accesibles
- botones grandes
- confirmaciones claras

En desktop:

- tabla
- panel lateral/drawer para edición
- matriz de permisos
- navegación por módulos

---

# 33. Estados UX

Implementar:

```text
loading
empty
error
success
```

Formularios:

```text
idle
submitting
success
error
```

Evitar doble submit.

Mostrar feedback después de:

- crear usuario
- editar usuario
- cambiar estado
- asignar rol
- quitar rol
- modificar permisos

---

# 34. Validaciones

Validar:

### Usuario

- nombre obligatorio
- apellido obligatorio
- correo válido
- correo único
- estado válido

### Rol

- nombre obligatorio
- código obligatorio
- código único

### Permisos

- permiso existente
- evitar duplicados

### Roles

- rol existente
- evitar asociaciones duplicadas

---

# 35. API / Server Actions

Seguir la arquitectura existente.

Cada operación sensible debe tener una única fuente de verdad.

Ejemplo conceptual:

```text
createUser()
updateUser()
updateUserStatus()
assignRole()
removeRole()
createRole()
updateRole()
updateRolePermissions()
```

No duplicar lógica de autorización en múltiples lugares.

---

# 36. Caché

Revisar el mecanismo actual de caché/revalidación de Next.js.

Después de:

```text
crear usuario
editar usuario
cambiar estado
asignar rol
modificar permisos
```

la interfaz debe reflejar los cambios inmediatamente.

No dejar datos obsoletos.

---

# 37. Tareas atómicas

## FASE 1 — Discovery

- [ ] USR-001 Auditar Supabase Auth.
- [ ] USR-002 Auditar tabla de usuarios.
- [ ] USR-003 Auditar roles.
- [ ] USR-004 Auditar permisos.
- [ ] USR-005 Auditar middleware.
- [ ] USR-006 Auditar RLS.
- [ ] USR-007 Auditar navegación.
- [ ] USR-008 Auditar protección de rutas.
- [ ] USR-009 Auditar componentes existentes.
- [ ] USR-010 Identificar módulos actuales.
- [ ] USR-011 Identificar posibles conflictos.

**GATE 1:** detenerse y presentar resultados.

---

# FASE 2 — Diseño

- [ ] USR-012 Diseñar modelo de datos definitivo.
- [ ] USR-013 Definir relaciones.
- [ ] USR-014 Definir índices.
- [ ] USR-015 Definir constraints.
- [ ] USR-016 Definir permisos.
- [ ] USR-017 Definir roles iniciales.
- [ ] USR-018 Diseñar estrategia RLS.
- [ ] USR-019 Diseñar estrategia de sincronización Auth/usuarios.

**GATE 2:** revisar diseño antes de implementar.

---

# FASE 3 — Base de datos

- [ ] USR-020 Crear migración.
- [ ] USR-021 Crear `usuarios`.
- [ ] USR-022 Crear `roles`.
- [ ] USR-023 Crear `usuarios_roles`.
- [ ] USR-024 Crear `permisos`.
- [ ] USR-025 Crear `roles_permisos`.
- [ ] USR-026 Crear constraints.
- [ ] USR-027 Crear índices.
- [ ] USR-028 Crear funciones de autorización necesarias.
- [ ] USR-029 Crear RLS.
- [ ] USR-030 Crear datos iniciales.
- [ ] USR-031 Verificar políticas RLS.

**GATE 3:** comprobar acceso autorizado/no autorizado.

---

# FASE 4 — Backend

- [ ] USR-032 Crear queries de usuarios.
- [ ] USR-033 Crear mutation de usuario.
- [ ] USR-034 Crear actualización de usuario.
- [ ] USR-035 Crear cambio de estado.
- [ ] USR-036 Crear consulta de roles.
- [ ] USR-037 Crear creación de rol.
- [ ] USR-038 Crear edición de rol.
- [ ] USR-039 Crear asignación de roles.
- [ ] USR-040 Crear eliminación de roles.
- [ ] USR-041 Crear consulta de permisos.
- [ ] USR-042 Crear actualización de permisos.
- [ ] USR-043 Implementar autorización server-side.
- [ ] USR-044 Implementar protección del último administrador.

---

# FASE 5 — Validación

- [ ] USR-045 Crear schemas Zod.
- [ ] USR-046 Validar usuario.
- [ ] USR-047 Validar rol.
- [ ] USR-048 Validar permisos.
- [ ] USR-049 Validar asociaciones.
- [ ] USR-050 Validar estados.

---

# FASE 6 — Usuarios UI

- [ ] USR-051 Crear ruta de usuarios.
- [ ] USR-052 Crear listado.
- [ ] USR-053 Crear búsqueda.
- [ ] USR-054 Crear filtros.
- [ ] USR-055 Crear formulario.
- [ ] USR-056 Crear usuario.
- [ ] USR-057 Editar usuario.
- [ ] USR-058 Cambiar estado.
- [ ] USR-059 Crear detalle.
- [ ] USR-060 Mostrar roles.
- [ ] USR-061 Mostrar permisos efectivos.

---

# FASE 7 — Roles UI

- [ ] USR-062 Crear ruta de roles.
- [ ] USR-063 Crear listado.
- [ ] USR-064 Crear rol.
- [ ] USR-065 Editar rol.
- [ ] USR-066 Activar/inactivar rol.
- [ ] USR-067 Mostrar usuarios asociados.

---

# FASE 8 — Permisos UI

- [ ] USR-068 Crear gestión de permisos.
- [ ] USR-069 Agrupar permisos por módulo.
- [ ] USR-070 Agrupar permisos por recurso.
- [ ] USR-071 Mostrar acciones.
- [ ] USR-072 Seleccionar permisos.
- [ ] USR-073 Guardar permisos.
- [ ] USR-074 Evitar duplicados.
- [ ] USR-075 Mostrar permisos heredados.

---

# FASE 9 — Navegación

- [ ] USR-076 Integrar permisos con sidebar.
- [ ] USR-077 Ocultar módulos no autorizados.
- [ ] USR-078 Ocultar acciones no autorizadas.
- [ ] USR-079 Proteger rutas directamente.
- [ ] USR-080 Proteger server actions.
- [ ] USR-081 Verificar acceso directo por URL.

---

# FASE 10 — Seguridad

- [ ] USR-082 Probar usuario sin permisos.
- [ ] USR-083 Probar usuario con permiso de lectura.
- [ ] USR-084 Probar usuario con permiso de creación.
- [ ] USR-085 Probar usuario con permiso de edición.
- [ ] USR-086 Probar escalamiento de privilegios.
- [ ] USR-087 Probar autoasignación de rol.
- [ ] USR-088 Probar autoasignación de SUPER_ADMIN.
- [ ] USR-089 Probar desactivación del último administrador.
- [ ] USR-090 Probar manipulación directa desde frontend.
- [ ] USR-091 Probar acceso directo a rutas protegidas.

---

# FASE 11 — UX

- [ ] USR-092 Revisar móvil.
- [ ] USR-093 Revisar tablet.
- [ ] USR-094 Revisar desktop.
- [ ] USR-095 Revisar formularios.
- [ ] USR-096 Revisar permisos.
- [ ] USR-097 Revisar estados.
- [ ] USR-098 Revisar mensajes de error.
- [ ] USR-099 Revisar confirmaciones.
- [ ] USR-100 Revisar accesibilidad.

---

# FASE 12 — Testing

Crear pruebas para:

### Usuarios

- [ ] USR-101 Crear usuario.
- [ ] USR-102 Editar usuario.
- [ ] USR-103 Buscar usuario.
- [ ] USR-104 Filtrar usuario.
- [ ] USR-105 Activar/inactivar usuario.

### Roles

- [ ] USR-106 Crear rol.
- [ ] USR-107 Editar rol.
- [ ] USR-108 Asignar rol.
- [ ] USR-109 Quitar rol.

### Permisos

- [ ] USR-110 Asignar permiso.
- [ ] USR-111 Quitar permiso.
- [ ] USR-112 Validar permiso efectivo.

### Seguridad

- [ ] USR-113 Validar RLS.
- [ ] USR-114 Validar autorización server-side.
- [ ] USR-115 Validar escalamiento de privilegios.
- [ ] USR-116 Validar protección del último administrador.

---

# 39. Casos de prueba obligatorios

## Caso 1

Usuario:

```text
Juan
Rol: Consulta
```

Debe poder:

```text
Ver empleados
```

No debe poder:

```text
Crear empleado
Editar empleado
Eliminar empleado
```

---

## Caso 2

Usuario:

```text
María
Rol: Talento Humano
```

Debe poder:

```text
Ver empleados
Crear empleados
Editar empleados
Gestionar dotación
```

No debe poder:

```text
Gestionar usuarios
Gestionar roles
```

---

## Caso 3

Usuario:

```text
Carlos
Rol: Administrador
```

Debe poder:

```text
Gestionar usuarios
Gestionar roles
Gestionar permisos
```

---

## Caso 4

Usuario sin permiso intenta:

```text
POST /crear-empleado
```

El backend debe rechazar la operación aunque el frontend haya sido manipulado.

---

## Caso 5

Usuario intenta asignarse:

```text
SUPER_ADMIN
```

Debe ser rechazado.

---

## Caso 6

Existe un solo administrador activo.

Intentar desactivarlo.

Resultado esperado:

```text
Operación rechazada.
Debe existir al menos un administrador activo.
```

---

# 40. Definition of Done

La feature solo está terminada cuando:

```text
[✓] Supabase Auth integrado
[✓] Usuarios implementados
[✓] Roles implementados
[✓] Permisos implementados
[✓] Relaciones implementadas
[✓] RLS implementado
[✓] Autorización server-side
[✓] Protección frontend
[✓] Protección de rutas
[✓] Protección contra escalamiento
[✓] Protección último administrador
[✓] CRUD usuarios
[✓] CRUD roles
[✓] Gestión permisos
[✓] Sidebar basado en permisos
[✓] Mobile-first
[✓] Loading states
[✓] Empty states
[✓] Error states
[✓] Auditoría
[✓] Tests
[✓] Lint
[✓] Typecheck
[✓] Build
```

---

# 41. Reglas estrictas

## NO hacer

- No utilizar Prisma.
- No almacenar contraseñas.
- No implementar autenticación propia.
- No confiar únicamente en el frontend.
- No ocultar botones como mecanismo de seguridad.
- No hardcodear correos de administradores.
- No hardcodear permisos dentro de componentes.
- No crear permisos como booleanos dentro de `usuarios`.
- No duplicar roles.
- No crear tablas duplicadas.
- No permitir autoescalamiento.
- No eliminar historial.
- No modificar módulos existentes innecesariamente.

## SÍ hacer

- Usar Supabase Auth.
- Usar RBAC.
- Usar permisos granulares.
- Usar RLS.
- Validar permisos en servidor.
- Reutilizar componentes existentes.
- Reutilizar arquitectura existente.
- Utilizar React Hook Form.
- Utilizar Zod.
- Mantener TypeScript estricto.
- Mantener mobile-first.
- Mantener auditoría.
- Mantener separación entre autenticación y autorización.

---

# 42. Estrategia de ejecución

OpenCode debe trabajar por fases.

```text
DISCOVERY
    ↓
GATE
    ↓
DISEÑO
    ↓
GATE
    ↓
BASE DE DATOS
    ↓
GATE
    ↓
BACKEND
    ↓
GATE
    ↓
FRONTEND
    ↓
GATE
    ↓
SEGURIDAD
    ↓
TESTING
    ↓
VALIDACIÓN FINAL
```

No implementar todo en una única operación.

Después de cada fase:

1. Revisar cambios.
2. Ejecutar validaciones.
3. Corregir errores.
4. Confirmar que no se rompió funcionalidad existente.
5. Continuar.

---

# 43. Informe final

Al terminar entregar:

## Arquitectura

- tablas
- relaciones
- RLS
- autorización

## Usuarios

- funcionalidades implementadas

## Roles

- funcionalidades implementadas

## Permisos

- permisos creados
- módulos cubiertos

## Seguridad

- pruebas realizadas
- vulnerabilidades encontradas
- vulnerabilidades corregidas

## Testing

```text
lint: PASS/FAIL
typecheck: PASS/FAIL
test: PASS/FAIL
build: PASS/FAIL
```

## Archivos modificados

Lista completa.

## Migraciones

Lista de migraciones creadas.

## Pendientes

Solo problemas reales que no hayan podido resolverse.

No declarar la feature como terminada si existen criterios de aceptación incumplidos.