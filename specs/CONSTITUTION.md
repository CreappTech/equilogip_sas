# EQUILOGIPSAS — CONSTITUTION

## 1. Propósito

Equilogipsas es un sistema empresarial para la gestión y control de:

- Vehículos.
- Equipos.
- Máquinas.
- Empleados.
- Actividades.
- Mantenimiento.
- Ingresos.
- Gastos.
- Horas trabajadas.
- Liquidaciones.
- Reportes.
- Indicadores.
- Rentabilidad de activos.

El sistema debe permitir conocer el comportamiento operativo y financiero de los activos de la empresa.

El objetivo principal es poder responder:

> ¿Cuánto cuesta operar cada activo, cuánto ingreso genera y cuál es su resultado?

---

# 2. Principios fundamentales

## 2.1 Datos primero

La aplicación debe construirse alrededor de datos estructurados, consistentes y trazables.

No se deben crear funcionalidades únicamente pensando en la interfaz.

Cada funcionalidad debe tener:

```text
Modelo de datos
↓
Reglas de negocio
↓
Persistencia
↓
Autorización
↓
Interfaz
↓
Validación
```

---

## 2.2 El activo es una entidad central

Vehículos, máquinas y equipos son tipos de activos.

La arquitectura debe evitar duplicar lógica innecesariamente entre:

```text
vehículos
máquinas
equipos
```

Cuando una funcionalidad sea común a todos los activos, debe implementarse sobre el concepto general de `activo`.

Las características específicas de cada tipo deben mantenerse separadas cuando corresponda.

---

## 2.3 Usuario ≠ empleado

Un usuario es una persona que utiliza el sistema.

Un empleado es una persona que trabaja para la empresa.

No todos los empleados necesariamente necesitan una cuenta de usuario.

La relación entre ambos debe ser opcional y explícita.

Vínculo técnico: columna `profiles.fk_empleado_id` → `empleados.id`
(`ON DELETE SET NULL`, UNIQUE), gestionada con el permiso
`empleados.empleados.vincular_usuario` (ver AGENTS.md §4.11).

---

# 3. Stack tecnológico

La aplicación utilizará:

```text
Next.js
TypeScript
Supabase
PostgreSQL
Supabase Auth
React
React Hook Form
Zod
pnpm
```

No utilizar Prisma.

No introducir un ORM adicional salvo decisión arquitectónica explícita.

## 3.1 Origen de la capa de UI

La capa de presentación (componentes, layout, sistema de diseño, iconos,
theme de Tailwind v4) parte de la base del template `free-nextjs-admin-
dashboard` (TailAdmin, Next.js 16 + Tailwind v4 + TypeScript strict). Este
origen queda documentado para que no se pierda de vista al evaluar cambios
estructurales: el inventario completo de qué componentes, hooks y
librerías de esa base están disponibles vive en `AGENTS.md` §4, no en este
documento. Esta Constitución define las reglas de negocio y arquitectura
que gobiernan **sobre** esa base de UI, no la reemplazan.

Dos consecuencias directas de este origen que el resto del proyecto debe
respetar:

- Los widgets de dashboard heredados de TailAdmin (métricas, pedidos
  recientes, mapa de país, etc.) traen datos de ejemplo hardcodeados por
  herencia del template. La regla de "no mock data en producción" (§ del
  documento AGENTS.md, sección 15) aplica también a ellos: se conectan a
  Supabase progresivamente, no se dejan como están de forma indefinida.
- Formularios de autenticación (`SignInForm`/`SignUpForm`) heredados del
  template son solo UI sin lógica real. Se conectan a Supabase Auth
  siguiendo §6 y §7 de este documento; no se asume que ya tienen lógica de
  sesión solo porque visualmente están completos.

---

# 4. Base de datos

Supabase PostgreSQL es la fuente principal de verdad.

Toda información persistente debe almacenarse en la base de datos.

No utilizar almacenamiento local del navegador como fuente principal de
información empresarial. (Excepción explícita: preferencias puramente de
UI como el modo claro/oscuro, que sí pueden persistir en `localStorage`
tal como ya lo hace el `ThemeContext` heredado de TailAdmin — eso no es
información de negocio.)

Las relaciones deben utilizar IDs.

No utilizar nombres como mecanismo de relación.

---

# 5. Seguridad

La seguridad es una responsabilidad de backend y base de datos.

Nunca considerar suficiente:

```text
ocultar botón
```

o:

```text
ocultar página
```

Toda operación sensible debe validarse en servidor.

Supabase RLS debe proteger los datos.

La interfaz únicamente mejora la experiencia del usuario; no constituye una barrera de seguridad.

---

# 6. Autenticación

La autenticación será responsabilidad de Supabase Auth.

Nunca:

- almacenar contraseñas.
- crear un sistema de contraseñas propio.
- almacenar hashes de contraseñas en tablas de negocio.
- colocar credenciales en código.
- colocar secretos en el frontend.

---

# 7. Autorización

El sistema utilizará autorización basada en:

```text
Usuario
↓
Roles
↓
Permisos
```

Los permisos deben ser granulares y reutilizables.

No crear columnas como:

```text
puede_ver_produccion
puede_editar_vehiculos
puede_crear_gastos
```

La autorización debe ser extensible.

---

# 8. Integridad de información

La aplicación debe evitar:

- registros huérfanos.
- relaciones inválidas.
- duplicados no permitidos.
- cantidades inválidas.
- fechas incoherentes.
- operaciones parcialmente guardadas.

Las reglas críticas deben existir en la base de datos cuando sea posible.

La validación frontend nunca reemplaza la validación backend/database.

---

# 9. Historial

Los registros empresariales importantes no deben eliminarse físicamente cuando su eliminación pueda afectar la trazabilidad.

Preferir:

```text
estado
inactivo
anulado
retirado
```

según el dominio.

La información histórica debe conservarse.

---

# 10. Finanzas

Ingresos y gastos deben ser entidades independientes y estructuradas.

Todo ingreso o gasto que corresponda a un activo debe poder asociarse al activo.

El sistema debe permitir analizar:

```text
Ingresos
Gastos
Costos
Resultado
```

por:

- activo.
- tipo de activo.
- actividad.
- período.
- otros criterios relevantes.

---

# 11. Mantenimiento

El mantenimiento debe generar trazabilidad sobre:

```text
Activo
↓
Mantenimiento
↓
Actividades
↓
Repuestos / servicios
↓
Mano de obra
↓
Costos
↓
Proveedor
↓
Fecha
```

El historial de mantenimiento debe mantenerse.

---

# 12. Empleados y horas

Los empleados deben poder relacionarse con:

- actividades.
- activos.
- horas trabajadas.
- liquidaciones.

Las horas trabajadas deben registrarse estructuradamente.

El sistema debe poder obtener:

```text
Empleado
↓
Horas
↓
Tarifa / conceptos
↓
Liquidación
```

El módulo `empleados` (entidad base, cargos, ciclo de vida
`activo|inactivo|retirado` y vínculo opcional con usuarios) está
implementado en la Fase 5 — ver AGENTS.md §4.11. Las entidades
estructuradas de tiempos (`horas`), conceptos y liquidaciones son dominios
propios posteriores; `empleados.id` queda listo como referencia estable.

---

# 13. Mobile-first

Toda interfaz nueva debe diseñarse primero para móvil.

Debe funcionar correctamente en:

```text
móvil
tablet
desktop
```

No diseñar primero desktop y posteriormente intentar adaptarlo.

---

# 14. Componentización

Los componentes reutilizables deben utilizarse cuando exista un patrón común.

No crear múltiples versiones del mismo componente sin justificación.

Los componentes compartidos base (`Button`, `Input`, `Select`, `Modal`,
`Table`, `Badge`, etc.) ya existen heredados del template TailAdmin — ver
el inventario completo en `AGENTS.md` §4.4 antes de crear cualquier
componente nuevo de este tipo.

Ejemplos de componentes compartidos:

```text
Button
Input
Select
Modal
Drawer
Table
DataTable
Badge
FormField
PageHeader
EmptyState
LoadingState
ErrorState
```

---

# 15. Simplicidad

Preferir soluciones:

- simples.
- explícitas.
- mantenibles.
- fáciles de probar.

No introducir abstracciones únicamente porque "podrían ser útiles en el futuro".

La arquitectura debe permitir crecer sin sobreingeniería.

---

# 16. IA

La inteligencia artificial es una capacidad futura.

No introducir IA prematuramente.

Primero debe existir:

```text
datos confiables
+
modelo de datos consistente
+
historial suficiente
+
APIs/servicios bien definidos
```

La futura IA deberá consumir datos mediante interfaces controladas.

Nunca permitir que un modelo de IA tenga acceso indiscriminado a la base de datos.

---

# 17. Aplicación móvil futura

La primera versión será web.

La aplicación debe construirse de forma que posteriormente pueda existir una APK sin duplicar la lógica de negocio.

La lógica de negocio no debe depender exclusivamente de componentes visuales de Next.js.

---

# 18. Cambios arquitectónicos

Los agentes no pueden cambiar unilateralmente:

- stack.
- arquitectura.
- modelo de seguridad.
- estrategia de base de datos.
- sistema de autenticación.
- la decisión de organización de carpetas registrada en `ARCHITECTURE.md`
  §5 (modelo híbrido `app/` + `components/` + `features/`).

Los cambios estructurales deben documentarse y justificarse.

---

# 19. Regla final

Cuando exista conflicto entre:

```text
velocidad
```

y:

```text
integridad / seguridad / mantenibilidad
```

se debe priorizar:

```text
integridad
seguridad
mantenibilidad
```

sobre velocidad de implementación.
