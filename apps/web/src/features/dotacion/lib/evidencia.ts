import { createClient } from "@/lib/supabase/client";

const BUCKET = "dotacion-evidencias";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const LIMITE = 5 * 1024 * 1024;

type ResultadoSubida = { ok: true; path: string } | { ok: false; error: string };

/**
 * Sube un archivo de evidencia (imagen JPG/PNG/WebP o PDF, ≤5 MB) al bucket
 * privado `dotacion-evidencias`. La carpeta raíz es el id del usuario que lo
 * sube (RLS: solo él escribe/borra en su carpeta).
 *
 * NOTA: la subida es inmediata al elegir el archivo; si la entrega nunca se
 * registra, el archivo queda en el bucket — es el mismo patrón que
 * `inspeccion-evidencias` de mantenimiento y evita re-subidas en cada envío.
 */
export async function subirArchivo(file: File): Promise<ResultadoSubida> {
  if (file.size > LIMITE) {
    return { ok: false, error: "Cada archivo no puede superar los 5 MB." };
  }
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return { ok: false, error: "Solo se permiten JPG, PNG, WEBP o PDF." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sesión no válida. Vuelve a iniciar sesión." };
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "application/pdf"
          ? "pdf"
          : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return { ok: false, error: "No se pudo subir el archivo. Intenta de nuevo." };
  }

  return { ok: true, path };
}

/**
 * Sube la firma digital como PNG. La firma llega como data URL del canvas;
 * se convierten los bytes a Blob y se guardan en el mismo bucket.
 */
export async function subirFirma(dataUrl: string): Promise<ResultadoSubida> {
  try {
    const blob: Blob = await (await fetch(dataUrl)).blob();
    if (blob.size > LIMITE) {
      return { ok: false, error: "La firma no puede superar los 5 MB." };
    }
    const file = new File([blob], "firma.png", { type: "image/png" });
    return subirArchivo(file);
  } catch {
    return { ok: false, error: "No se pudo procesar la firma." };
  }
}

/** Elimina un archivo subido (por si se retira antes de guardar). */
export async function eliminarArchivo(path: string): Promise<void> {
  if (!path) return;
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

/** URL autenticada para mostrar/servir el archivo (vía route handler con cookies). */
export function urlEvidencia(path: string): string {
  return `/api/dotacion/evidencia?path=${encodeURIComponent(path)}`;
}