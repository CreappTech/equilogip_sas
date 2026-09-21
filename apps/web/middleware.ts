import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const TERMINAL_AUTH_ERRORS = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "session_expired",
  "invalid_refresh_token",
  "invalid_jwt",
  "bad_jwt",
  "user_not_found",
  "40107",
]);

function isTerminalSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return "code" in error && typeof error.code === "string"
    ? TERMINAL_AUTH_ERRORS.has(error.code)
    : false;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname.startsWith("/login");
  const isPublicRoute =
    pathname.startsWith("/signup") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api");

  const sessionIsDead = Boolean(error && isTerminalSessionError(error));

  if (sessionIsDead) {
    // El refresh/access token de la cookie es inválido o fue revocado en el
    // servidor (sign-out global, rotación de JWT, reset de proyecto) y nunca
    // volverá a ser aceptado por GoTrue. auth-js conserva la sesión mientras
    // el access token no haya vencido (proactive-preserve), así que sin esta
    // limpieza cada request reintentaría el refresh y entraría en un loop de
    // redirects. `signOut({ scope: "local" })` no hace llamadas de red: solo
    // emite los Set-Cookie que borran la sesión obsoleta.
    await supabase.auth.signOut({ scope: "local" });
  }

  const isAuthenticated = Boolean(user && !error);

  if (isAuthenticated && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie)
    );
    return redirectResponse;
  }

  if (!isAuthenticated && !isLoginRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (sessionIsDead) {
      url.searchParams.set("expired", "1");
    }
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie)
    );
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (metadata file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};