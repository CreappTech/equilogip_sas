import type { RecursoCatalogo } from "./types/catalogos";

export interface CampoCatalogo {
  name: string;
  label: string;
  kind: "text" | "number" | "select" | "switch" | "time";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /**
   * Para selects con opciones dinámicas (ej. modelos → marcas). El recurso se
   * resuelve en servidor (`[recurso]/page.tsx`) y se pasa al CRUD como
   * `opcionesFuente[campo.name]`.
   */
  optionsSource?: RecursoCatalogo;
  hint?: string;
}

export interface ColumnaCatalogo {
  key: string;
  header: string;
  field?: string;
  /** Render especial en la tabla. */
  badge?: "estado" | "categoria";
  /**
   * Nombre del campo (de `campos`) cuyas opciones dinámicas resuelven el
   * valor de esta columna a una etiqueta (ej. modelos → "Marca").
   */
  labelSource?: string;
  /** Sufijo mostrado tras el valor (ej. "%" para recargos). */
  suffix?: string;
  /** Prefijo mostrado antes del valor (ej. "$" para tarifas). */
  prefix?: string;
}

export interface CatalogoConfig {
  recurso: RecursoCatalogo;
  /** Título singular, usado en el formulario/diálogos. */
  titulo: string;
  /** Título del listado. */
  tituloPlural: string;
  descripcion: string;
  tabla: string;
  /** true si la fila pertenece al tenant (se inyecta tenant_id en el server). */
  tenant: boolean;
  /** Columna de orden para el listado y el orden por defecto. */
  ordenColumna: "orden" | "nombre";
  campos: CampoCatalogo[];
  columnas: ColumnaCatalogo[];
}

const SWITCH_ACTIVO: CampoCatalogo = {
  name: "activo",
  label: "Activo",
  kind: "switch",
};

export const CATALOGOS: Record<RecursoCatalogo, CatalogoConfig> = {
  cargos: {
    recurso: "cargos",
    titulo: "Cargo",
    tituloPlural: "Cargos",
    descripcion: "Catálogo de cargos del talento humano.",
    tabla: "cargos",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Operador de montacargas",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  areas: {
    recurso: "areas",
    titulo: "Área",
    tituloPlural: "Áreas",
    descripcion: "Catálogo de áreas del talento humano.",
    tabla: "areas",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Logística",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  tipos_contrato: {
    recurso: "tipos_contrato",
    titulo: "Tipo de contrato",
    tituloPlural: "Tipos de contrato",
    descripcion: "Tipos de contratación del talento humano.",
    tabla: "tipos_contrato",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Término indefinido",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  turnos: {
    recurso: "turnos",
    titulo: "Turno",
    tituloPlural: "Turnos",
    descripcion: "Catálogo de turnos del talento humano.",
    tabla: "turnos",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Turno nocturno",
      },
      {
        name: "hora_inicio",
        label: "Hora de inicio",
        kind: "time",
        required: true,
        hint: "Hora de entrada del turno (HH:MM).",
      },
      {
        name: "hora_fin",
        label: "Hora de fin",
        kind: "time",
        required: true,
        hint: "Hora de salida (HH:MM). Si es menor que la de inicio, el turno cruza la medianoche (nocturno).",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "hora_inicio", header: "Inicio", field: "hora_inicio" },
      { key: "hora_fin", header: "Fin", field: "hora_fin" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  subtipos_activos: {
    recurso: "subtipos_activos",
    titulo: "Tipo de equipo",
    tituloPlural: "Tipos de equipo",
    descripcion:
      "Tipos de equipo del módulo de activos. El subtipo se valida contra este catálogo en la base de datos.",
    tabla: "activos_subtipos",
    tenant: false,
    ordenColumna: "orden",
    campos: [
      {
        name: "categoria",
        label: "Categoría",
        kind: "select",
        required: true,
        options: [
          { value: "vehiculo", label: "Vehículo" },
          { value: "maquina", label: "Maquinaria" },
          { value: "equipo", label: "Equipo" },
        ],
      },
      {
        name: "codigo",
        label: "Código",
        kind: "text",
        required: true,
        placeholder: "Ej. MONTACARGAS",
        hint: "Se guarda en mayúsculas. No se repite dentro de la misma categoría.",
      },
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Montacargas",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "codigo", header: "Código", field: "codigo" },
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "categoria", header: "Categoría", badge: "categoria" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  centros_servicio: {
    recurso: "centros_servicio",
    titulo: "Centro de trabajo",
    tituloPlural: "Centros de trabajo",
    descripcion:
      "Centro de trabajo de la compañía. Se usa como sede/ubicación de los activos. El modelo actual soporta un centro por tenant.",
    tabla: "centros_servicio",
    tenant: true,
    ordenColumna: "nombre",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Sede principal",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  proveedores: {
    recurso: "proveedores",
    titulo: "Proveedor",
    tituloPlural: "Proveedores",
    descripcion:
      "Catálogo compartido de proveedores (mantenimiento, finanzas y subarriendo). El registro es global (no pertenece a un tenant).",
    tabla: "proveedores",
    tenant: false,
    ordenColumna: "nombre",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Rentacar S.A.S",
      },
      {
        name: "telefono",
        label: "Teléfono",
        kind: "text",
        placeholder: "Teléfono de contacto",
      },
      {
        name: "email",
        label: "Correo electrónico",
        kind: "text",
        placeholder: "contacto@proveedor.com",
      },
      {
        name: "direccion",
        label: "Dirección",
        kind: "text",
        placeholder: "Dirección del proveedor",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "telefono", header: "Teléfono", field: "telefono" },
      { key: "email", header: "Correo", field: "email" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  marcas: {
    recurso: "marcas",
    titulo: "Marca",
    tituloPlural: "Marcas",
    descripcion: "Catálogo de marcas de equipos y maquinaria.",
    tabla: "marcas",
    tenant: false,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Toyota",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  modelos: {
    recurso: "modelos",
    titulo: "Modelo",
    tituloPlural: "Modelos",
    descripcion:
      "Modelos de equipos y maquinaria, agrupados por marca. La marca es obligatoria.",
    tabla: "modelos",
    tenant: false,
    ordenColumna: "orden",
    campos: [
      {
        name: "marca_id",
        label: "Marca",
        kind: "select",
        required: true,
        optionsSource: "marcas",
      },
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. FB2000",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "marca", header: "Marca", field: "marca_id", labelSource: "marca_id" },
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  unidades_medida: {
    recurso: "unidades_medida",
    titulo: "Unidad de medida",
    tituloPlural: "Unidades de medida",
    descripcion: "Unidades de medida para magnitudes (repuestos, insumos, horas).",
    tabla: "unidades_medida",
    tenant: false,
    ordenColumna: "orden",
    campos: [
      {
        name: "codigo",
        label: "Código",
        kind: "text",
        required: true,
        placeholder: "Ej. LT",
        hint: "Se guarda en mayúsculas. No se repite.",
      },
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Litro",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "codigo", header: "Código", field: "codigo" },
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  tipos_documento_identidad: {
    recurso: "tipos_documento_identidad",
    titulo: "Tipo de documento",
    tituloPlural: "Tipos de documento",
    descripcion: "Tipos de documento de identidad (cédula, NIT, pasaporte, etc.).",
    tabla: "tipos_documento_identidad",
    tenant: false,
    ordenColumna: "orden",
    campos: [
      {
        name: "codigo",
        label: "Código",
        kind: "text",
        required: true,
        placeholder: "Ej. CC",
        hint: "Se guarda en mayúsculas. No se repite.",
      },
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Cédula de ciudadanía",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "codigo", header: "Código", field: "codigo" },
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  tipos_mantenimiento: {
    recurso: "tipos_mantenimiento",
    titulo: "Tipo de mantenimiento",
    tituloPlural: "Tipos de mantenimiento",
    descripcion:
      "Tipos de mantenimiento (preventivo, correctivo, etc.) del módulo de mantenimiento.",
    tabla: "tipos_mantenimiento",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Preventivo",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  tipos_repuesto_servicio: {
    recurso: "tipos_repuesto_servicio",
    titulo: "Tipo de repuesto/servicio",
    tituloPlural: "Tipos de repuesto/servicio",
    descripcion:
      "Tipos de ítem para el control de repuestos y servicios del mantenimiento.",
    tabla: "tipos_repuesto_servicio",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Repuesto eléctrico",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  grupos_actividad: {
    recurso: "grupos_actividad",
    titulo: "Grupo de actividad",
    tituloPlural: "Grupos de actividad",
    descripcion:
      "Agrupadores internos de la empresa para clasificar las actividades (ej. Manipulación de carga).",
    tabla: "grupos_actividad",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Manipulación de carga",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  tipos_actividad: {
    recurso: "tipos_actividad",
    titulo: "Actividad",
    tituloPlural: "Actividades",
    descripcion:
      "Actividades del módulo de operaciones. La tarifa alimenta la planeación de servicios.",
    tabla: "tipos_actividad",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "grupo_actividad_id",
        label: "Grupo de actividad",
        kind: "select",
        required: true,
        optionsSource: "grupos_actividad",
      },
      {
        name: "codigo_ciiu",
        label: "Código CIIU",
        kind: "text",
        required: true,
        placeholder: "Ej. 7730",
        hint: "Código CIIU de 4 dígitos del RUT. No se repite por compañía.",
      },
      {
        name: "nombre",
        label: "Descripción",
        kind: "text",
        required: true,
        placeholder: "Ej. Cargue de camiones",
      },
      {
        name: "tarifa",
        label: "Tarifa",
        kind: "number",
        required: true,
        placeholder: "Ej. 50000",
        hint: "Tarifa por hora o por servicio (COP).",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "grupo", header: "Grupo", field: "grupo_actividad_id", labelSource: "grupo_actividad_id" },
      { key: "codigo_ciiu", header: "Código CIIU", field: "codigo_ciiu" },
      { key: "nombre", header: "Descripción", field: "nombre" },
      { key: "tarifa", header: "Tarifa", field: "tarifa", prefix: "$" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  categorias_ingreso: {
    recurso: "categorias_ingreso",
    titulo: "Categoría de ingreso",
    tituloPlural: "Categorías de ingreso",
    descripcion: "Categorías de ingreso del módulo de finanzas.",
    tabla: "categorias_ingreso",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Alquiler de equipos",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  categorias_gasto: {
    recurso: "categorias_gasto",
    titulo: "Categoría de gasto",
    tituloPlural: "Categorías de gasto",
    descripcion: "Categorías de gasto del módulo de finanzas.",
    tabla: "categorias_gasto",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Combustible",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  clientes: {
    recurso: "clientes",
    titulo: "Cliente",
    tituloPlural: "Clientes",
    descripcion:
      "Clientes de la compañía (facturación de alquileres y servicios).",
    tabla: "clientes",
    tenant: true,
    ordenColumna: "nombre",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Constructora ABC",
      },
      {
        name: "telefono",
        label: "Teléfono",
        kind: "text",
        placeholder: "Teléfono de contacto",
      },
      {
        name: "email",
        label: "Correo electrónico",
        kind: "text",
        placeholder: "contacto@cliente.com",
      },
      {
        name: "direccion",
        label: "Dirección",
        kind: "text",
        placeholder: "Dirección del cliente",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "telefono", header: "Teléfono", field: "telefono" },
      { key: "email", header: "Correo", field: "email" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  conceptos_liquidacion: {
    recurso: "conceptos_liquidacion",
    titulo: "Concepto de liquidación",
    tituloPlural: "Conceptos de liquidación",
    descripcion: "Conceptos de las liquidaciones de horas del talento humano.",
    tabla: "conceptos_liquidacion",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Horas ordinarias",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  tipos_hora: {
    recurso: "tipos_hora",
    titulo: "Tipo de hora",
    tituloPlural: "Tipos de hora",
    descripcion:
      "Tipos de hora del módulo de horas (ordinarias, extra, nocturnas, etc.).",
    tabla: "tipos_hora",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Extra diurna",
      },
      {
        name: "porcentaje_recargo",
        label: "% de recargo",
        kind: "number",
        required: true,
        placeholder: "Ej. 25",
        hint: "Porcentaje de recargo del tipo de hora (ej. 25 = 25%).",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      {
        key: "porcentaje_recargo",
        header: "% de recargo",
        field: "porcentaje_recargo",
        suffix: "%",
      },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  eps: {
    recurso: "eps",
    titulo: "EPS",
    tituloPlural: "EPS",
    descripcion: "Entidades promotoras de salud de los empleados.",
    tabla: "eps",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Nueva EPS",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  arl: {
    recurso: "arl",
    titulo: "ARL",
    tituloPlural: "ARLs",
    descripcion: "Administradoras de riesgos laborales de los empleados.",
    tabla: "arl",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Positiva",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  fondos_pension: {
    recurso: "fondos_pension",
    titulo: "Fondo de pensión",
    tituloPlural: "Fondos de pensión",
    descripcion:
      "Fondos de pensión (cesantías y pensiones) de los empleados.",
    tabla: "fondos_pension",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Porvenir",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
  bancos: {
    recurso: "bancos",
    titulo: "Banco",
    tituloPlural: "Bancos",
    descripcion: "Bancos para la información financiera de los empleados.",
    tabla: "bancos",
    tenant: true,
    ordenColumna: "orden",
    campos: [
      {
        name: "nombre",
        label: "Nombre",
        kind: "text",
        required: true,
        placeholder: "Ej. Bancolombia",
      },
      {
        name: "orden",
        label: "Orden",
        kind: "number",
        hint: "Define el orden de aparición en las listas (0 = primero).",
      },
      SWITCH_ACTIVO,
    ],
    columnas: [
      { key: "nombre", header: "Nombre", field: "nombre" },
      { key: "orden", header: "Orden", field: "orden" },
      { key: "estado", header: "Estado", badge: "estado" },
    ],
  },
};

/** Recursos editables del maestro de datos, en el orden de presentación. */
export const RECURSOS_CATALOGO = Object.keys(CATALOGOS) as RecursoCatalogo[];