import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import AdminShell from "@/components/layout/AdminShell";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombres, apellidos, email_login, rol")
    .eq("id", user.id)
    .single();

  const nombreCompleto = profile
    ? `${profile.nombres} ${profile.apellidos}`.trim()
    : user.email ?? "Usuario";
  const correo = profile?.email_login ?? user.email ?? "";

  const puedeResponder = profile?.rol === "admin" || profile?.rol === "supervisor";

  return (
    <AdminShell
      userName={nombreCompleto}
      userEmail={correo}
      signOut={signOut}
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
            Panel de administración
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Bienvenido, {nombreCompleto}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Usuario</p>
            <p className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white/90">
              {correo || "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Nombre</p>
            <p className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white/90">
              {nombreCompleto}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Rol</p>
            <p className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white/90">
              {profile?.rol ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Correo de acceso
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white/90">
            {user.email}
          </p>
          {puedeResponder && (
            <p className="mt-2 text-sm text-success-500">
              Tienes permisos para responder solicitudes.
            </p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
