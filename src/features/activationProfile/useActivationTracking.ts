/**
 * useActivationTracking — fire-and-forget canonical funnel events for the
 * activation surface. Deduplicated server-side by idempotency key, and
 * locally so a re-render never double-fires.
 */
import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActivationEvent =
  | "landing_engaged"
  | "profile_section_expanded"
  | "correction_requested"
  | "checkout_cta_clicked"
  | "checkout_cta_failed";

export function useActivationTracking(token: string | undefined) {
  const fired = useRef<Set<string>>(new Set());

  return useCallback(
    (event: ActivationEvent, meta: Record<string, unknown> = {}) => {
      if (!token) return;
      const key = `${event}:${JSON.stringify(meta)}`;
      if (fired.current.has(key)) return;
      fired.current.add(key);
      void supabase.functions
        .invoke("activation-token-resolve", { body: { token, event, meta } })
        .catch(() => { /* tracking must never break the funnel */ });
    },
    [token],
  );
}
