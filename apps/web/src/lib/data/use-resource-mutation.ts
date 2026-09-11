import { useCallback, useState } from "react";
import { getErrorMessage } from "@/lib/data/error-message";

export type MutationResult =
  | { ok: true }
  | { ok: false; error: string };

export type MutationStatus = "idle" | "submitting" | "success" | "error";

interface ResourceMutationState {
  status: MutationStatus;
  error: string | null;
}

export function useResourceMutation<Args, R extends MutationResult = MutationResult>(
  action: (args: Args) => Promise<R>
) {
  const [state, setState] = useState<ResourceMutationState>({
    status: "idle",
    error: null,
  });

  const mutate = useCallback(
    async (args: Args): Promise<R> => {
      setState({ status: "submitting", error: null });
      try {
        const result = await action(args);
        if (result.ok) {
          setState({ status: "success", error: null });
        } else {
          const msg = (result as { ok: false; error: string }).error;
          setState({ status: "error", error: msg });
        }
        return result;
      } catch (error) {
        const message = getErrorMessage(error);
        setState({ status: "error", error: message });
        return { ok: false, error: message } as R;
      }
    },
    [action]
  );

  const reset = useCallback(() => {
    setState({ status: "idle", error: null });
  }, []);

  return { ...state, mutate, reset };
}