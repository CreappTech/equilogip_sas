# activos - Dominio de Equilogipsas

Lógica de dominio del módulo de **Activos** (Fase 4 + extensión de flota):
vehículos, maquinaria y equipos. El formulario replica la estructura de
campos del módulo Flota del proyecto "equilogip".

## Modelo

Tablas (ver `supabase/migrations/20260905000000_create_activos_tables.sql`
y `20260906000000_add_flota_form_fields.sql`):

```text
activos                      (común: tipo, subtipo (6 tipos de flota),
 │                             codigo_interno, nombre (derivado de marca+modelo,
 │                             nullable), estado (ciclo de vida), estado_operativo,
 │                             fecha_adquisicion, color, numero_motor,
 │                             lectura_inicial, serie, origen,
 │                             centro_servicio_id, proveedor_id,
 │                             datos_tecnicos JSONB, datos_fabricante JSONB,
 │                             created_at, updated_at)
 ├── vehiculos               (1:1 — placa obligatoria; marca, modelo, anio)
 ├── maquinas                (1:1 — marca, modelo, anio)
 └── equipos                 (1:1 — marca, modelo, anio)

proveedores               (catálogo compartido; activos.origen = SUBARRENDADA)
centros_servicio            (sede del activo; RLS existente limita por tenant)
```

Reglas:

- `tipo` inmutable (trigger en la base) y especialidad consistente con el tipo.
- `subtipo` consistente con la categoría: trigger `trg_activos_verificar_subtipo`
  (vehículo ⇒ MOTOCICLETA/AUTOMOVIL; maquinaria ⇒ MONTACARGAS/CARGADOR_FRONTAL/
  RETROEXCAVADORA; equipo ⇒ YALE_MANUAL). Catálogo de subtipos en
  `types/activo.types.ts` (`SUBTIPOS_POR_CATEGORIA`).
- `estado`: `activo | inactivo | retirado`. Retirar un activo (`retirarActivo`)
  es terminal: un activo `retirado` no se puede volver a editar ni revertir
  (lo garantiza RLS, no solo la UI).
- `estado_operativo`: `OPERATIVA | EN_MANTENIMIENTO | FUERA_DE_SERVICIO |
  ALQUILADA`. `ALQUILADA` no se ofrece en el formulario: solo se asigna por
  flujo futuro de alquiler.
- `origen = SUBARRENDADA` ⇒ `proveedor_id` obligatorio; `PROPIA` ⇒ nulo
  (constraint `activos_proveedor_check` en la base).
- `nombre` se deriva de `marca + modelo` en las actions; el listado y detalle
  usan `nombreActivo()` como fallback.
- Ficha técnica (`datos_tecnicos`) e información del fabricante
  (`datos_fabricante`) en JSONB; el catálogo de campos vive en
  `types/fichaTecnica.ts` (`CAMPOS_TECNICOS`, `CAMPOS_FABRICANTE`) sin
  duplicar la fuente.
- YALE_MANUAL no tiene ficha técnica (igual que la fuente).
- Sin DELETE físico de activos.

## Permisos

13 códigos: `activos.activos.{ver,crear,editar,eliminar}` +
`activos.<vehiculos|maquinas|equipos>.<ver|crear|editar|eliminar>`.

Helper en `types/activo.types.ts`: `permisoActivo(tipo, accion)` →
`activos.<recurso>.<accion>` (vehiculo → vehiculos, maquina → maquinas,
equipo → equipos).

RLS de `proveedores`: lectura con códigos exactos (`catalogos.proveedores.ver`
o `activos.activos.ver`), escritura con `catalogos.proveedores.{crear,editar,eliminar}`.

## Estructura

```text
types/       TipoActivo, EstadoActivo, SubtipoActivo, EstadoOperativoActivo,
             OrigenActivo, ProveedorSubarriendo, CentroServicio, ActivoRow,
             ListadoActivo, ActivoDetalle, ResultadoActivo, labels, helpers
             (tipoARecurso, tipoAUbicacion, permisoActivo, nombreActivo,
             categoriaDeSubtipo, SUBTIPOS_POR_CATEGORIA) + fichaTecnica.ts
schemas/     Zod activoBaseSchema, vehiculoSchema, maquinaSchema,
             equipoSchema (subtipo restringido por categoría; proveedor si
             SUBARRENDADA), retirarActivoSchema, activoFormSchema (cliente)
queries/     listActivos (server, con join a especialidad para referencia),
             getActivoDetalle, listPorTipo + wrappers, listReferencias
             (listCentrosServicio, listProveedores)
actions/     shared.ts (autorizar, traducirError, derivarNombre,
             crearActivoEspecialidad, actualizarActivoEspecialidad),
             create{Vehiculo,Maquina,Equipo}.ts,
             update{Vehiculo,Maquina,Equipo}.ts, retirarActivo.ts
```

UI en `apps/web/src/app/activos/`: listado (`ActivosClient`), detalle
(`ActivoDetalleClient` con tab de ficha técnica/fabricante), `nuevo/`,
`[id]/editar/` (comparten `ActivoForm`, 3 secciones: datos generales, ficha
técnica por subtipo, información del fabricante).

## Convenciones

- Las actions devuelven `ResultadoActivo` (`{ok} | {ok, error}`) y siempre
  revalidan `/activos`.
- El retiro se hace leyendo primero el activo para autorizar con el
  permiso del tipo correcto.
- `traducirError` mapea errores de Supabase a mensajes de usuario
  (23505 → código interno/placa duplicados, 23503 → sede/proveedor inválidos,
  P0001 subtipo → categoría incorrecta, 42501 → permiso).
- Listado = server component + `ActivoForm`/clients en el cliente.
  Las mutaciones usan `useResourceMutation` + `useToast` +
  `router.refresh()` (sin doble envío).
- Los selectores de sede y proveedor se cargan en el server (páginas
  `nuevo`/`editar` vía `listReferencias`) y se pasan como props al formulario.