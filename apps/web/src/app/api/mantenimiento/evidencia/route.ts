import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPermisos } from "@/lib/auth/permisos";

/**
 * Servir evidencia fotográfica de una inspección con autorización.
 * Un <img> no envía cabeceras Supabase, pero sí las cookies de sesión del
 * proyecto: este route handler autentica y autoriza (dueño del archivo o
 * permiso mantenimiento.inspecciones.ver) y transmite los bytes.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");

  if (!path || !path.startsWith("inspeccion-evidencias/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  // La carpeta raíz del objeto es el id del usuario que lo subió.
  const folder = path.split("/")[0];
  if (!folder) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  if (folder !== user.id) {
    const permisos = await getPermisos();
    const puedeVer =
      permisos.includes("*") ||
      permisos.includes("mantenimiento.inspecciones.ver");
    if (!puedeVer) {
      return new NextResponse("No autorizado", { status: 403 });
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("inspeccion-evidencias")
    .download(path);

  if (error || !data) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const extension = path.split(".").pop()?.toLowerCase();
  const contentType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  const buffer = Buffer.from(await data.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}