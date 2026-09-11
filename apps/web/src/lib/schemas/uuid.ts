import { z } from "zod";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida un UUID bien formado (lo mismo que acepta el tipo `uuid` de Postgres),
 * sin las restricciones de versión/variante RFC 4122 de `z.string().uuid()`.
 * Necesario porque la base puede contener IDs placeholder que Postgres acepta
 * y Zod v4 rechaza (ej. tenants/profiles con variante `2`).
 */
export function uuidSchema(mensaje: string) {
  return z.string().regex(UUID_REGEX, mensaje);
}