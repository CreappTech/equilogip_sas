# Prompt: Auditoría y corrección — "Invalid input: expected string, received undefined" en formularios

## Contexto obligatorio

Antes de tocar código, leé:

```text
AGENTS.md
CONSTITUTION.md
ARCHITECTURE.md
```

Respetar íntegramente sus reglas. En particular para esta tarea:

- Alcance acotado: esta tarea es **solo diagnosticar y corregir** el error de validación descrito abajo. No refactorizar formularios, no cambiar librerías, no tocar arquitectura, no "aprovechar" para mejorar otras cosas (AGENTS.md §3).
- No inventar la causa: inspeccionar cada formulario real antes de asumir de dónde viene el error (AGENTS.md §2, §5).
- No modificar el modelo de datos ni el schema de base de datos para "esquivar" el error salvo que la causa raíz esté ahí y se confirme explícitamente (AGENTS.md §18).
- Reutilizar el patrón de formularios ya existente (React Hook Form + Zod) — no introducir un patrón nuevo de validación (CONSTITUTION.md §3, §12).
- Validación incremental: corregir un formulario, validar, seguir con el siguiente — no acumular cambios sin probar (AGENTS.md §23).
- Al final, informar en el formato de AGENTS.md §25.

---

## Síntoma reportado

Al guardar un registro en **varios formularios** del sistema, en algunos inputs aparece el mensaje:

```text
Invalid input: expected string, received undefined
```

Este es un mensaje característico de Zod cuando un campo definido como `z.string()` (sin `.optional()`/`.nullable()`, o mal encadenado) recibe `undefined` en el objeto que se valida, en lugar de un string (aunque sea vacío `""`).

El síntoma se presenta en **múltiples formularios**, no en uno aislado, así que además de corregir cada caso puntual hay que identificar si existe una **causa raíz compartida** (un patrón mal replicado, un hook, un helper, o una convención que no se está siguiendo consistentemente).

---

## Caso reproducible confirmado (punto de partida obligatorio)

Se confirmó visualmente el error en el formulario **"Nuevo cargo"** (catálogo `cargos`):

- El campo **Nombre** tiene texto visible tipeado por el usuario ("Operador de Montacargas").
- Al intentar guardar, aparece igual: `Invalid input: expected string, received undefined`.
- El campo **Orden** (numérico) no muestra error.

Esto es una señal importante: el valor **se ve en pantalla** pero **no llega** al objeto que Zod valida. Esto descarta que sea un problema de "el usuario no llenó el campo" y apunta a un problema de **integración entre el input y React Hook Form**, no del schema en sí. Las causas más probables a verificar primero, en este orden:

1. El input de "Nombre" no está registrado correctamente con RHF (falta `{...register("nombre")}` o el `Controller` correspondiente) — es un input no controlado por RHF que solo refleja lo que el usuario tipea en el DOM.
2. El atributo `name`/key usado al registrar el input no coincide exactamente con la key que espera el schema Zod (ej. `"name"` vs `"nombre"`, o algún mismatch de mayúsculas/naming al traducir un template).
3. Si "Cargos" y el resto de catálogos de la tarea anterior (`prompt-crud-catalogos-equilogipsas.md`) se generaron desde un **componente/plantilla de formulario genérico compartido** (ej. un `CatalogoForm` reutilizable con props `label`/`name`/`schema`), es muy probable que el bug esté en ESE componente único y se haya replicado en todos los catálogos generados a partir de él. Verificar esto primero antes de revisar formulario por formulario — si la causa está centralizada, corregirla en un solo lugar resuelve todos los formularios generados desde esa plantilla.

Empezar la auditoría reproduciendo exactamente este caso en el formulario de "Nuevo cargo", confirmar la causa exacta ahí, y **antes de corregir**, verificar si esa misma causa se repite en los demás formularios de catálogo por venir del mismo componente genérico.

---

## Paso 1 — Discovery (obligatorio antes de corregir nada)

1. Buscar en todo el repo los formularios que usan `useForm` + `zodResolver` (o el patrón equivalente ya adoptado en el proyecto).
2. Para cada formulario, identificar:
   - El schema Zod asociado.
   - El objeto `defaultValues` pasado a `useForm`.
   - Si el formulario se usa tanto para **crear** como para **editar** un registro: cómo se pobla el formulario al editar (¿`reset(data)` con datos crudos de Supabase, o se transforman antes?).
   - Los componentes de input usados (¿son controlados? ¿tienen `value` inicial definido siempre?).
3. Clasificar cada caso encontrado en una de estas categorías (no asumir, confirmar leyendo el código):
   - **A. `defaultValues` incompleto**: el schema exige un campo que no está en `defaultValues`, por lo que arranca en `undefined`.
   - **B. Datos de Supabase con `null`/`undefined` sin transformar**: al editar, un campo viene `null` desde la base de datos y se pasa directo a `reset()` sin convertir a `""`.
   - **C. Campo condicional/dependiente**: un input que solo aparece bajo cierta condición (ej. un campo que depende de un `Select`) y el schema no contempla ese caso con `.optional()` ni con validación condicional (`z.discriminatedUnion`, `.refine()`, etc.).
   - **D. Componente de formulario compartido mal integrado**: algún campo de un componente reutilizable (`Select`, `date-picker`, `MultiSelect`, etc.) no está registrado correctamente con `register`/`Controller`, por lo que RHF nunca recibe su valor.
   - **E. Otra causa** (documentar cuál, no forzarla en A-D).
4. Producir una lista concreta: `formulario → campo(s) afectado(s) → categoría → archivo(s)`.

No pasar al paso 2 sin esta lista. Si algo no queda claro (por ejemplo, si un campo "debería" ser opcional a nivel de negocio o no), detenerse y preguntar antes de decidir (AGENTS.md §5, §18) — esto es una decisión de reglas de negocio, no solo técnica.

---

## Paso 2 — Corrección

Para cada caso de la lista, aplicar la corrección correspondiente a su categoría:

- **A**: completar `defaultValues` con todos los campos del schema, usando `""` para strings, no `undefined`.
- **B**: normalizar los datos antes de `reset()` (por ejemplo, un helper `toFormValues(record)` que convierta `null`/`undefined` a `""` para strings, `false` para booleanos, etc. — evaluar si ya existe un helper así en el proyecto antes de crear uno nuevo, por AGENTS.md §6).
- **C**: ajustar el schema para reflejar correctamente qué campos son verdaderamente opcionales vs. condicionalmente requeridos, usando `.optional()`, `.nullable()` o validación condicional según corresponda al dominio real (confirmar la regla de negocio si hay duda).
- **D**: corregir el registro del campo en RHF (`register` o `Controller`) para que su valor sí llegue al formulario.
- **E**: aplicar la corrección específica que amerite, documentándola.

Reglas para toda corrección:

- No debilitar la validación de negocio para "hacer desaparecer" el error (ej. no volver opcional un campo que en realidad es obligatorio en el dominio).
- No permitir que el fix habilite guardar registros con datos inválidos o incompletos que rompan integridad (CONSTITUTION.md §8).
- Mantener consistencia: si se corrige un patrón (por ejemplo, un helper de normalización), aplicarlo de forma consistente en todos los formularios que compartan el mismo problema, no solo en el primero que se encuentre.

---

## Paso 3 — Validación

Después de cada formulario corregido:

1. Ejecutar `lint`, `typecheck`, `test`, `build` (los que existan en `package.json` — no inventar comandos).
2. Probar manualmente (o con test si el proyecto los tiene) el flujo de **crear** y el flujo de **editar** en ese formulario, confirmando que:
   - Ya no aparece el error.
   - El registro se guarda correctamente con los datos esperados.
   - Los campos realmente obligatorios del dominio siguen siendo exigidos (no se rompió la validación de negocio).
3. Solo entonces avanzar al siguiente formulario de la lista.

---

## Fuera de alcance

- Rediseñar formularios o cambiar su UX.
- Cambiar de React Hook Form + Zod a otra solución.
- Modificar formularios que no presentan el síntoma, salvo que compartan el componente/helper defectuoso identificado como causa raíz.
- Tocar el módulo de catálogos si ya tiene CRUD propio, salvo que sus formularios también presenten el mismo síntoma.

---

## Informe final requerido

Entregar en el formato de AGENTS.md §25, agregando una tabla resumen:

```text
| Formulario | Campo(s) afectado(s) | Categoría (A-E) | Causa raíz | Corrección aplicada |
|---|---|---|---|---|
```

Indicar explícitamente si se encontró una causa raíz **compartida** entre varios formularios (por ejemplo, un helper de mapeo de datos faltante) y, de ser así, si se centralizó la corrección en un único lugar reutilizable en vez de repetirla formulario por formulario.