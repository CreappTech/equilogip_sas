"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import Alert from "@/components/ui/alert/Alert";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastEntry {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, variant, title, message }]);
      const duration = variant === "error" ? 6000 : 4000;
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const api: ToastApi = {
    success: useCallback(
      (title, message) => show("success", title, message),
      [show]
    ),
    error: useCallback((title, message) => show("error", title, message), [
      show,
    ]),
    warning: useCallback(
      (title, message) => show("warning", title, message),
      [show]
    ),
    info: useCallback((title, message) => show("info", title, message), [show]),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[99999] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto relative shadow-theme-md"
          >
            <Alert
              variant={toast.variant}
              title={toast.title}
              message={toast.message ?? ""}
            />
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar notificación"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};