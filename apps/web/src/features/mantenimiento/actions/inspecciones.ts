"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspeccionSchema, type InspeccionFormValues } from "../schemas/inspeccionSchema";
import { respuestaSchema, type RespuestaFormValues } from "../schemas/respuestaSchema";
import type {
  CrearInspeccionResultado,
  FinalizarInspeccionResultado,
  PuntajeCategoria,
  Puntajes,
  ResultadoMantenimiento,
  UnidadLectura,
} from "../types/mantenimiento.types";
import type { TipoActivo } from "@/features/activos/types/activo.types";
import { autorizar, traducirError } from "./shared";

const TIEMPO_MINIMO_DEFAULT = 120;

function leerUnidadPorTipo(tipo: TipoActivo): UnidadLectura {
  return tipo === "vehiculo" ? "kilometraje" : "horometro";
}

export async function crearInspeccion(
  input: InspeccionFormValues
): Promise<CrearInspeccionResultado> {
  const user = await autorizar("mantenimiento.inspecciones.crear");
  if (!user) {
    return { ok: false, error: "No tienes permiso para iniciar inspecciones." };
  }

  const parsed = inspeccionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  // El equipo debe existir, estar activo, operativo y ser visible para el operador.
  // Se valida con el cliente del usuario para no saltarse la RLS de activos.
  const { data: activo, error: errorActivo } = await supabase
    .from("activos")
    .select("tipo, estado, estado_operativo")
    .eq("id", parsed.data.activo_id)
    .maybeSingle();

  if (errorActivo || !activo) {
    return { ok: false, error: "El equipo seleccionado no es válido." };
  }
  if (activo.estado !== "activo" || activo.estado_operativo !== "OPERATIVA") {
    return { ok: false, error: "El equipo no está operativo para una inspección." };
  }

  const lectura_unidad = leerUnidadPorTipo(activo.tipo as TipoActivo);

  const { data: insertada, error } = await supabase
    .from("mantenimiento_inspecciones")
    .insert({
      activo_id: parsed.data.activo_id,
      operador_id: user.id,
      lectura: parsed.data.lectura,
      lectura_unidad,
      nivel_combustible: parsed.data.nivel_combustible,
      nivel_aceite: parsed.data.nivel_aceite,
      estado: "borrador",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  if (!insertada?.id) {
    return { ok: false, error: "No se pudo confirmar la inspección creada." };
  }

  return { ok: true, extra: { inspeccionId: insertada.id } };
}

export async function guardarRespuesta(
  input: RespuestaFormValues
): Promise<ResultadoMantenimiento> {
  const user = await autorizar("mantenimiento.inspecciones.crear");
  if (!user) {
    return { ok: false, error: "No tienes permiso para diligenciar inspecciones." };
  }

  const parsed = respuestaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  // Solo el operador propietario puede guardar respuestas en su borrador.
  const { data: inspeccion, error: errorInspeccion } = await supabase
    .from("mantenimiento_inspecciones")
    .select("operador_id, estado")
    .eq("id", parsed.data.inspeccion_id)
    .maybeSingle();

  if (errorInspeccion || !inspeccion) {
    return { ok: false, error: "La inspección no existe." };
  }
  if (inspeccion.operador_id !== user.id || inspeccion.estado !== "borrador") {
    return { ok: false, error: "La inspección ya fue finalizada." };
  }

  const { error } = await supabase
    .from("mantenimiento_inspeccion_respuestas")
    .upsert(
      {
        inspeccion_id: parsed.data.inspeccion_id,
        pregunta_id: parsed.data.pregunta_id,
        respuesta: parsed.data.respuesta,
        justificacion: parsed.data.justificacion?.trim() || null,
        foto_path: parsed.data.foto_path ?? null,
      },
      { onConflict: "inspeccion_id,pregunta_id" }
    );

  if (error) {
    return { ok: false, error: traducirError(error) };
  }

  return { ok: true };
}

export async function finalizarInspeccion(
  inspeccionId: string
): Promise<FinalizarInspeccionResultado> {
  const user = await autorizar("mantenimiento.inspecciones.crear");
  if (!user) {
    return { ok: false, error: "No tienes permiso para finalizar inspecciones." };
  }

  const supabase = await createClient();

  const { data: inspeccion, error: errorInspeccion } = await supabase
    .from("mantenimiento_inspecciones")
    .select("*")
    .eq("id", inspeccionId)
    .maybeSingle();

  if (errorInspeccion || !inspeccion) {
    return { ok: false, error: "La inspección no existe." };
  }
  if (inspeccion.operador_id !== user.id) {
    return { ok: false, error: "No puedes finalizar una inspección de otro usuario." };
  }
  if (inspeccion.estado !== "borrador") {
    return { ok: false, error: "La inspección ya fue finalizada." };
  }

  // Tipo del equipo para filtrar los checkpoints que aplican.
  const { data: activo, error: errorActivo } = await supabase
    .from("activos")
    .select("tipo, subtipo")
    .eq("id", inspeccion.activo_id)
    .maybeSingle();

  if (errorActivo || !activo) {
    return { ok: false, error: "El equipo de la inspección no es válido." };
  }

  const tipo = activo.tipo as TipoActivo;

  // Verificar que todos los checkpoints del tipo que aplican están respondidos.
  const { data: preguntas, error: errorPreguntas } = await supabase
    .from("mantenimiento_preguntas")
    .select("id, tipo_activo")
    .eq("activo", true);

  if (errorPreguntas) {
    return { ok: false, error: traducirError(errorPreguntas) };
  }

  const aplican = (preguntas ?? []).filter(
    (p) => p.tipo_activo === "ambos" || p.tipo_activo === tipo
  );

  const { data: respuestas } = await supabase
    .from("mantenimiento_inspeccion_respuestas")
    .select("pregunta_id, respuesta, justificacion, foto_path")
    .eq("inspeccion_id", inspeccionId);

  const respondidasIds = new Set((respuestas ?? []).map((r) => r.pregunta_id));
  const faltantes = aplican.filter((p) => !respondidasIds.has(p.id)).length;

  if (faltantes > 0) {
    return {
      ok: false,
      error: `Faltan ${faltantes} pregunta(s) por responder para completar la inspección.`,
    };
  }

  // Puntajes por categoría (radar): Bueno suma, Malo resta, No aplica excluye.
  const { data: preguntasConCategoria } = await supabase
    .from("mantenimiento_preguntas")
    .select("id, categoria_id")
    .in(
      "id",
      aplican.map((p) => p.id)
    );

  const categoriaPorPregunta: Record<string, string> = {};
  for (const p of preguntasConCategoria ?? []) {
    categoriaPorPregunta[p.id] = p.categoria_id;
  }

  const { data: categorias } = await supabase
    .from("mantenimiento_categorias")
    .select("id, codigo, nombre");

  const categoriaCodigoPorId: Record<string, string> = {};
  for (const c of categorias ?? []) categoriaCodigoPorId[c.id] = c.codigo;

  const puntajes: Puntajes = {};
  const acumulado: Record<string, PuntajeCategoria> = {};
  for (const p of aplican) {
    const codigo = categoriaCodigoPorId[categoriaPorPregunta[p.id]];
    if (!codigo || !acumulado[codigo]) {
      if (!codigo) continue;
      acumulado[codigo] = {
        bueno: 0,
        malo: 0,
        no_aplica: 0,
        aplica: 0,
        puntaje: 0,
        porcentaje: 0,
      };
    }
    const r = (respuestas ?? []).find((x) => x.pregunta_id === p.id);
    const acc = acumulado[codigo];
    const respuesta = r?.respuesta ?? "no_aplica";
    if (respuesta === "bueno") {
      acc.bueno += 1;
      acc.aplica += 1;
      acc.puntaje += 1;
    } else if (respuesta === "malo") {
      acc.malo += 1;
      acc.aplica += 1;
      acc.puntaje -= 1;
    } else {
      acc.no_aplica += 1;
    }
  }

  for (const [codigo, acc] of Object.entries(acumulado)) {
    puntajes[codigo] = {
      ...acc,
      porcentaje:
        acc.aplica > 0
          ? Math.round((Math.max(0, acc.puntaje) / acc.aplica) * 100)
          : null,
    };
  }

  // Tiempo: si duró menos del mínimo estándar, es una "inspección exprés".
  const { data: config } = await supabase
    .from("mantenimiento_configuracion")
    .select("tiempo_minimo_segundos")
    .maybeSingle();

  const tiempoMinimo = config?.tiempo_minimo_segundos ?? TIEMPO_MINIMO_DEFAULT;

  // Rutinas preventivas a disparar (lectura >= umbral, tipo y subtipo que aplican).
  // Con cliente admin: la evaluación es del sistema, no del operador.
  const admin = createAdminClient();
  const { data: rutinas } = await admin
    .from("mantenimiento_rutinas")
    .select("id, tipo_activo, subtipo")
    .eq("activo", true)
    .eq("unidad", inspeccion.lectura_unidad)
    .lte("umbral", inspeccion.lectura);

  const rutinasDisparadas: { id: string }[] = [];
  for (const r of rutinas ?? []) {
    const subtipo = r.subtipo as string | null;
    const tipoOk = r.tipo_activo === "ambos" || r.tipo_activo === tipo;
    const subtipoOk = !subtipo || subtipo === activo.subtipo;
    if (tipoOk && subtipoOk) rutinasDisparadas.push({ id: r.id as string });
  }

  const finalizadaEn = new Date();
  const iniciadaEn = new Date(inspeccion.iniciada_en as string);
  const tiempoSegundos = Math.max(
    0,
    Math.round((finalizadaEn.getTime() - iniciadaEn.getTime()) / 1000)
  );
  const esExpress = tiempoSegundos < tiempoMinimo;

  const { error: errorUpdate } = await admin
    .from("mantenimiento_inspecciones")
    .update({
      estado: "completada",
      finalizada_en: finalizadaEn.toISOString(),
      tiempo_segundos: tiempoSegundos,
      es_express: esExpress,
      tiempo_minimo_segundos_aplicado: tiempoMinimo,
      puntajes,
    })
    .eq("id", inspeccionId);

  if (errorUpdate) {
    return { ok: false, error: traducirError(errorUpdate as PostgrestError) };
  }

  if (rutinasDisparadas.length > 0) {
    await admin.from("mantenimiento_inspeccion_rutinas").insert(
      rutinasDisparadas.map((r) => ({ inspeccion_id: inspeccionId, rutina_id: r.id }))
    );
  }

  revalidatePath("/mantenimiento");
  return { ok: true, extra: { es_express: esExpress, tiempo_segundos: tiempoSegundos } };
}

/** Descarta un borrador abandonado (solo su propietario). */
export async function descartarBorrador(
  inspeccionId: string
): Promise<ResultadoMantenimiento> {
  const user = await autorizar("mantenimiento.inspecciones.crear");
  if (!user) {
    return { ok: false, error: "No tienes permiso para gestionar inspecciones." };
  }

  const supabase = await createClient();
  const { data: inspeccion } = await supabase
    .from("mantenimiento_inspecciones")
    .select("operador_id, estado")
    .eq("id", inspeccionId)
    .maybeSingle();

  if (!inspeccion || inspeccion.operador_id !== user.id || inspeccion.estado !== "borrador") {
    return { ok: false, error: "El borrador no existe o ya fue finalizado." };
  }

  // Cleanup de borradores es operación interna (admin client); la tabla no
  // tiene policy DELETE.
  const admin = createAdminClient();
  const { error } = await admin
    .from("mantenimiento_inspecciones")
    .delete()
    .eq("id", inspeccionId);

  if (error) {
    return { ok: false, error: traducirError(error as PostgrestError) };
  }

  return { ok: true };
}