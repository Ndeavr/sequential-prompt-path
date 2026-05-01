/**
 * useInteractionState — Drives the universal interaction state machine.
 *
 * Usage:
 *   const { state, run } = useInteractionState();
 *   <VaultButton state={state} onClick={() => run(async () => api.save())} />
 */
import { useCallback, useRef, useState } from "react";
import {
  INTERACTION_STATE_TIMINGS,
  type InteractionState,
} from "@/lib/interactionStates";

export interface UseInteractionStateOptions {
  /** Called on success transition */
  onSuccess?: () => void;
  /** Called on error transition */
  onError?: (err: unknown) => void;
}

export function useInteractionState(opts: UseInteractionStateOptions = {}) {
  const [state, setState] = useState<InteractionState>("idle");
  const timer = useRef<number | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const set = useCallback((next: InteractionState) => {
    clearTimer();
    setState(next);
  }, []);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      clearTimer();
      setState("scanning");
      try {
        const result = await fn();
        setState("opening");
        await new Promise((r) =>
          window.setTimeout(r, INTERACTION_STATE_TIMINGS.opening),
        );
        setState("success");
        opts.onSuccess?.();
        timer.current = window.setTimeout(() => {
          setState("idle");
          timer.current = null;
        }, INTERACTION_STATE_TIMINGS.success);
        return result;
      } catch (err) {
        setState("error");
        opts.onError?.(err);
        timer.current = window.setTimeout(() => {
          setState("idle");
          timer.current = null;
        }, INTERACTION_STATE_TIMINGS.error);
        return undefined;
      }
    },
    [opts],
  );

  return { state, set, run };
}
