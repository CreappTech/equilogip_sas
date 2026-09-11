import type { PostgrestError } from "@supabase/supabase-js";

export function getErrorMessage(error: unknown): string {
  if (isPostgrestError(error)) {
    return "No se pudieron procesar los datos. Intenta de nuevo.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Ocurrió un error inesperado.";
}

function isPostgrestError(error: unknown): error is PostgrestError {
  if (!error || typeof error !== "object") return false;
  return typeof (error as PostgrestError).code === "string";
}