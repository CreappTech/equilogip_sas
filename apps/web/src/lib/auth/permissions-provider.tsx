"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

interface PermissionsContextValue {
  permisos: string[];
  isLoading: boolean;
  can: (codigo: string) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permisos: [],
  isLoading: true,
  can: () => false,
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

interface PermissionsProviderProps {
  children: ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [permisos, setPermisos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setPermisos([]);
          return;
        }

        const { data, error } = await supabase.rpc("auth_permisos");
        if (error || !data) {
          console.error(
            "[PermissionsProvider] auth_permisos falló:",
            error?.message ?? "respuesta vacía"
          );
          setPermisos([]);
          return;
        }
        const raw = (data ?? []) as { codigo?: string }[];
        const codes = raw
          .map((item) => item.codigo ?? "")
          .filter((c) => c.length > 0);
        setPermisos(codes);
      } catch (err) {
        console.error("[PermissionsProvider] error cargando permisos:", err);
        setPermisos([]);
      } finally {
        setIsLoading(false);
      }
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setPermisos([]);
      setIsLoading(true);
      if (session) {
        load();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const can = useCallback(
    (codigo: string) => {
      if (isLoading) return false;
      if (permisos.includes("*")) return true;
      return permisos.includes(codigo);
    },
    [isLoading, permisos]
  );

  return (
    <PermissionsContext.Provider value={{ permisos, isLoading, can }}>
      {children}
    </PermissionsContext.Provider>
  );
}
