import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/data/error-message";

interface ResourceListState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export function useResourceList<T>(fetcher: () => Promise<T[]>) {
  const [state, setState] = useState<ResourceListState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data: data ?? [], loading: false, error: null });
    } catch (error) {
      setState({ data: [], loading: false, error: getErrorMessage(error) });
    }
  }, [fetcher]);

  useEffect(() => {
    Promise.resolve().then(() => void load());
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return { ...state, load, refresh };
}