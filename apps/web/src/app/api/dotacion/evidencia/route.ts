import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPermisos } from "@/lib/auth/permisos";

/**
 * Sive evidencia/firma de una entrega de dotación con autorización.
 * Un <img> no envía cabeceras Supabase, pero sí las cookies de sesión del
 * proyecto: este route handler autentica y autoriza (dueño del archivo o
 * permiso dotacion.entregas.ver) y transmite los bytes, incluidos PDFs.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");

  if (!path || !path.startsWith("dotacion-evidencias/")) {
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
      permisos.includes("*") || permisos.includes("dotacion.entregas.ver");
    if (!puedeVer) {
      return new NextResponse("No autorizado", { status: 403 });
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("dotacion-evidencias")
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
        : extension === "pdf"
          ? "application/pdf"
          : "image/jpeg";

  const buffer = Buffer.from(await data.arrayBuffer());

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=3600",
  };
  // Los PDFs se abren en otra pestaña (no en línea) para no perder la navegación.
  if (contentType === "application/pdf") {
    headers["Content-Disposition"] = `inline; filename="evidencia.pdf"`;
  }

  return new NextResponse(buffer, { headers });
}