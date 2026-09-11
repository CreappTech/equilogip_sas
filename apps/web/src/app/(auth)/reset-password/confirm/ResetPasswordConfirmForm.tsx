"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordConfirmFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCode = searchParams.get("code") != null;
  const hasError = searchParams.get("error") != null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: supaError } = await supabase.auth.updateUser({
        password,
      });
      if (supaError) {
        setError(
          supaError.message ===
            "New password should be different from the old password."
            ? "La nueva contraseña debe ser diferente a la anterior."
            : "No se pudo actualizar la contraseña. El enlace puede haber caducado."
        );
        return;
      }
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (hasError || !hasCode) {
    return (
      <div className="flex flex-col flex-1 lg:w-1/2 w-full">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Enlace inválido o expirado
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              El enlace de recuperación no es válido o ya caducó. Solicita uno
              nuevo desde la página de recuperación.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/reset-password"
              className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Solicitar nuevo enlace →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Nueva contraseña
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ingresa tu nueva contraseña. Deberás iniciar sesión de nuevo.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <Label>
                Nueva contraseña <span className="text-error-500">*</span>
              </Label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Label>
                Confirmar contraseña <span className="text-error-500">*</span>
              </Label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Repite la contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Mostrar contraseñas
              </label>
            </div>
            <div>
              <Button className="w-full" size="sm" disabled={loading}>
                {loading ? "Actualizando..." : "Actualizar contraseña"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordConfirmForm() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
          Cargando...
        </div>
      }
    >
      <ResetPasswordConfirmFormInner />
    </Suspense>
  );
}
