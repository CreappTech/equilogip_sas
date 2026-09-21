import { createClient } from "@/lib/supabase/client";

const BUCKET = "inspeccion-evidencias";

type ResultadoEvidencia =
  | { ok: true; path: string }
  | { ok: false; error: string };

export async function subirEvidencia(file: File): Promise<ResultadoEvidencia> {
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "La foto no puede superar los 5 MB." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { ok: false, error: "Solo se permiten fotos JPG, PNG o WEBP." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sesión no válida. Vuelve a iniciar sesión." };
  }

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return { ok: false, error: "No se pudo subir la foto. Intenta de nuevo." };
  }

  return { ok: true, path };
}

export async function eliminarEvidencia(path: string): Promise<void> {
  if (!path) return;
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

/** URL autenticada para mostrar la foto (vía route handler con cookies). */
export function urlEvidencia(path: string): string {
  return `/api/mantenimiento/evidencia?path=${encodeURIComponent(path)}`;
}