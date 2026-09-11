"use client";

import { useState } from "react";
import Link from "next/link";

import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Ingresa el correo asociado a tu cuenta.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: supaError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        {
          redirectTo: `${window.location.origin}/reset-password/confirm`,
        }
      );
      if (supaError) {
        setError(
          supaError.message === "Email rate limit exceeded"
            ? "Demasiados intentos. Espera unos minutos antes de volver a intentar."
            : "No se pudo enviar el correo. Verifica el correo e inténtalo de nuevo."
        );
        return;
      }
      setEnviado(true);
    } catch {
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col flex-1 lg:w-1/2 w-full">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Revisa tu correo
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Si la dirección <strong>{email}</strong> está registrada, enviamos
              un enlace para restablecer tu contraseña.
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            El enlace caduca en 1 hora. Si no llega, revisa la carpeta de spam o
            contacta al administrador.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              ← Volver a iniciar sesión
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
            Restablecer contraseña
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ingresa el correo asociado a tu cuenta. Te enviaremos un enlace para
            restablecer tu contraseña.
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
                Correo electrónico <span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <Button className="w-full" size="sm" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6">
          <Link
            href="/login"
            className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
