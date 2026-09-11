import type { SubtipoActivo } from "./activo.types";

/**
 * Campos de la ficha técnica por subtipo. Misma estructura y nombres que el
 * módulo Flota de "equilogip" (components/maquinas/maquina-form.tsx). Se
 * almacenan como JSONB en `activos.datos_tecnicos`; los valores numéricos se
 * guardan como texto (igual que la fuente).
 */
export type TipoCampoFicha = "text" | "number";

export interface CampoFicha {
  name: string;
  label: string;
  type?: TipoCampoFicha;
  /** Si viene, el campo se renderiza como select con estas opciones. */
  options?: string[];
  /** Si es true junto con `options`, se renderiza como grupo de checkboxes. */
  multiple?: boolean;
  placeholder?: string;
}

export const CAMPOS_TECNICOS: Record<SubtipoActivo, CampoFicha[]> = {
  MOTOCICLETA: [
    { name: "cilindraje_cc", label: "Cilindraje (cc)", type: "number" },
    { name: "tipo_motor", label: "Tipo de motor" },
    { name: "numero_cilindros", label: "Número de cilindros" },
    { name: "refrigeracion", label: "Refrigeración" },
    { name: "arranque", label: "Arranque" },
    { name: "transmision", label: "Transmisión" },
    { name: "tipo_frenos", label: "Tipo de frenos" },
    { name: "suspension_delantera", label: "Suspensión delantera" },
    { name: "suspension_trasera", label: "Suspensión trasera" },
    { name: "capacidad_tanque_l", label: "Capacidad de tanque (L)", type: "number" },
    { name: "llanta_delantera", label: "Llanta delantera" },
    { name: "llanta_trasera", label: "Llanta trasera" },
    { name: "peso", label: "Peso (kg)", type: "number" },
  ],
  AUTOMOVIL: [
    { name: "tipo_vehiculo", label: "Tipo de vehículo" },
    { name: "carroceria", label: "Carrocería" },
    { name: "numero_puertas", label: "Número de puertas" },
    { name: "numero_pasajeros", label: "Número de pasajeros" },
    { name: "cilindraje_cc", label: "Cilindraje (cc)", type: "number" },
    { name: "numero_cilindros", label: "Número de cilindros" },
    { name: "potencia", label: "Potencia (HP)" },
    { name: "torque", label: "Torque (Nm)" },
    { name: "transmision", label: "Transmisión" },
    { name: "traccion", label: "Tracción" },
    { name: "direccion", label: "Dirección" },
    { name: "frenos", label: "Frenos" },
    { name: "capacidad_tanque_l", label: "Capacidad de tanque (L)", type: "number" },
    { name: "medidas_llantas", label: "Medidas de llantas" },
  ],
  MONTACARGAS: [
    { name: "capacidad_nominal_kg", label: "Capacidad nominal (kg)", type: "number" },
    { name: "centro_carga", label: "Centro de carga (mm)", type: "number" },
    { name: "altura_maxima_elevacion", label: "Altura máxima de elevación", type: "number" },
    { name: "altura_mastil_retraido", label: "Altura mástil retraído", type: "number" },
    { name: "altura_libre", label: "Altura libre (mm)", type: "number" },
    { name: "tipo_mastil", label: "Tipo de mástil", options: ["Simple", "Dúplex", "Triplex"] },
    { name: "etapas_mastil", label: "Etapas de mástil", type: "number" },
    { name: "dimensiones_horquillas", label: "Dimensiones de horquillas (mm)", type: "number" },
    { name: "separacion_horquillas", label: "Separación de horquillas (mm)", type: "number" },
    { name: "desplazador_lateral", label: "Desplazador lateral", options: ["Sí", "No"] },
    { name: "inclinacion_mastil", label: "Inclinación del mástil (grados)", type: "number" },
    { name: "radio_giro", label: "Radio de giro (mm)", type: "number" },
    { name: "peso_operativo", label: "Peso operativo (kg)", type: "number" },
    {
      name: "tipo_combustible",
      label: "Tipo de combustible",
      multiple: true,
      options: ["Diésel", "GLP", "Gasolina", "Eléctrico"],
    },
    { name: "voltaje_bateria_ah", label: "Voltaje de batería (Ah)", type: "number" },
    { name: "tipo_llantas", label: "Tipo de llantas", options: ["Neumática", "Sólida"] },
  ],
  CARGADOR_FRONTAL: [
    { name: "peso_operativo", label: "Peso operativo (kg)", type: "number" },
    { name: "potencia_motor", label: "Potencia de motor (HP)", type: "number" },
    { name: "capacidad_cucharon_m3", label: "Capacidad de cucharón (m³)", type: "number" },
    { name: "carga_util", label: "Carga útil (kg)", type: "number" },
    { name: "carga_vuelco", label: "Carga de vuelco (kg)", type: "number" },
    { name: "fuerza_arranque", label: "Fuerza de arranque (kg)", type: "number" },
    { name: "altura_maxima_descarga", label: "Altura máxima de descarga (mm)", type: "number" },
    { name: "alcance_descarga", label: "Alcance de descarga (mm)", type: "number" },
    { name: "tipo_cucharon", label: "Tipo de cucharón" },
    { name: "traccion", label: "Tracción" },
    { name: "velocidad_maxima", label: "Velocidad máxima (km/h)", type: "number" },
    { name: "neumaticos", label: "Neumáticos" },
    { name: "capacidad_tanque_combustible", label: "Capacidad de tanque de combustible (L)", type: "number" },
    { name: "capacidad_hidraulica", label: "Capacidad hidráulica (L)", type: "number" },
  ],
  RETROEXCAVADORA: [
    { name: "peso_operativo", label: "Peso operativo (kg)", type: "number" },
    { name: "potencia", label: "Potencia (HP)", type: "number" },
    { name: "capacidad_cucharon_frontal_m3", label: "Capacidad de cucharón frontal (m³)", type: "number" },
    { name: "cucharon_trasero", label: "Cucharón trasero" },
    { name: "profundidad_maxima_excavacion", label: "Profundidad máxima de excavación (mm)", type: "number" },
    { name: "alcance_maximo", label: "Alcance máximo (mm)", type: "number" },
    { name: "altura_maxima_descarga", label: "Altura máxima de descarga (mm)", type: "number" },
    { name: "fuerza_excavacion_cucharon", label: "Fuerza de excavación cucharón (kg)", type: "number" },
    { name: "fuerza_brazo", label: "Fuerza de brazo (kg)", type: "number" },
    { name: "traccion", label: "Tracción", options: ["4x2", "4x4"] },
    { name: "tipo_estabilizadores", label: "Tipo de estabilizadores" },
    { name: "caudal_presion_hidraulica", label: "Caudal/presión hidráulica" },
    { name: "capacidad_tanque_combustible", label: "Capacidad de tanque de combustible (L)", type: "number" },
  ],
  YALE_MANUAL: [],
};

export const CAMPOS_FABRICANTE: CampoFicha[] = [
  { name: "pais_fabricacion", label: "País de fabricación" },
  { name: "fabricante", label: "Fabricante" },
  { name: "distribuidor", label: "Distribuidor" },
  { name: "manual_operador", label: "Manual del operador" },
  { name: "manual_partes", label: "Manual de partes" },
  { name: "manual_servicio", label: "Manual de servicio" },
];

export const LABEL_CAMPO_TECNICO = (() => {
  const mapa = new Map<string, CampoFicha>();
  for (const campos of Object.values(CAMPOS_TECNICOS)) {
    for (const campo of campos) {
      if (!mapa.has(campo.name)) mapa.set(campo.name, campo);
    }
  }
  for (const campo of CAMPOS_FABRICANTE) {
    if (!mapa.has(campo.name)) mapa.set(campo.name, campo);
  }
  return mapa;
})();

export function labelCampoTecnico(name: string): string {
  return LABEL_CAMPO_TECNICO.get(name)?.label ?? name;
}