"use client";

import { useRef } from "react";
import { twMerge } from "tailwind-merge";

import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { eliminarArchivo, subirArchivo, urlEvidencia } from "@/features/dotacion/lib/evidencia";

interface EvidenceUploaderProps {
  value?: string[];
  onChange?: (paths: string[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  hint?: string;
}

const MAX_FILES = 5;

function esImagen(path: string): boolean {
  return /\.(jpg|jpeg|webp)$/i.test(path);
}

/**
 * Carga de evidencias de una entrega de dotación (fotos y PDF, ≤5 MB cada
 * uno, hasta `maxFiles`). Cada archivo se sube al bucket privado apenas se
 * selecciona (mismo patrón que mantenimiento) y se muestra su preview; la
 * lista de paths resultante viaja en el submit del formulario.
 */
export default function EvidenceUploader({
  value = [],
  onChange,
  disabled = false,
  maxFiles = MAX_FILES,
  hint,
}: EvidenceUploaderProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSeleccionarFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const cupos = maxFiles - value.length;
    const seleccionados = Array.from(files).slice(0, cupos);
    if (seleccionados.length < files.length) {
      toast.warning(
        "Límite de evidencias",
        `Solo se admiten hasta ${maxFiles} archivos por entrega.`
      );
    }
    if (seleccionados.length === 0) return;

    const nuevos: string[] = [];
    for (const file of seleccionados) {
      const resultado = await subirArchivo(file);
      if (resultado.ok) {
        nuevos.push(resultado.path);
      } else {
        toast.error("No se pudo subir", resultado.error);
      }
    }
    if (nuevos.length > 0) {
      onChange?.([...value, ...nuevos]);
    }
  }

  function onEliminar(path: string) {
    void eliminarArchivo(path);
    onChange?.(value.filter((p) => p !== path));
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          void onSeleccionarFiles(e.target.files);
          e.target.value = "";
        }}
        disabled={disabled}
      />

      <div
        className={twMerge(
          "rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700",
          disabled && "bg-gray-100 opacity-60 dark:bg-gray-800"
        )}
      >
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Foto de la entrega o documento (JPG, PNG, WEBP o PDF; máx. 5 MB
            cada uno, hasta {maxFiles} archivos).
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || value.length >= maxFiles}
            onClick={() => inputRef.current?.click()}
          >
            Adjuntar evidencias
          </Button>
        </div>

        {value.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {value.map((path) => (
              <li
                key={path}
                className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {esImagen(path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlEvidencia(path)}
                    alt="Evidencia de la entrega"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <a
                    href={urlEvidencia(path)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-gray-50 text-gray-500 hover:text-brand-500 dark:bg-gray-800 dark:text-gray-400"
                  >
                    <svg
                      className="h-8 w-8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                      <path d="M14 3v5h5" />
                    </svg>
                    <span className="px-2 text-xs">Ver PDF</span>
                  </a>
                )}
                {!disabled && (
                  <button
                    type="button"
                    aria-label="Quitar evidencia"
                    onClick={() => onEliminar(path)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/60 text-white hover:bg-error-500"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {value.length >= maxFiles && (
          <p className="mt-3 text-xs text-warning-500">
            Alcanzaste el máximo de {maxFiles} evidencias por entrega.
          </p>
        )}

        {hint && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>
    </div>
  );
}