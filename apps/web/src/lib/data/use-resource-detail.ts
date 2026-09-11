import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/data/error-message";

interface ResourceDetailState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useResourceDetail<T>(fetcher: () => Promise<T | null>) {
  const [state, setState] = useState<ResourceDetailState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: getErrorMessage(error) });
    }
  }, [fetcher]);

  useEffect(() => {
    Promise.resolve().then(() => void load());
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data, error: null }));
  }, []);

  return { ...state, load, refresh, setData };
}