/**
 * useAuthGate — single entry point for the login/sign-up gate.
 *
 *  - requestLoginPrompt(reason)  : open the card explicitly
 *  - requireAuth(action, reason) : run `action` if logged in, otherwise open
 *                                  the gate and replay `action` after login
 *  - isAuthenticated, role       : derived from useAuth
 */
import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useAuthGateStore,
  AUTH_GATE_DISMISS_KEY,
  type AuthGateReason,
} from "@/stores/authGateStore";

export function useAuthGate() {
  const { session, role } = useAuth() as any;
  const isAuthenticated = !!session?.user;
  const open = useAuthGateStore((s) => s.open);
  const close = useAuthGateStore((s) => s.close);

  const requestLoginPrompt = useCallback(
    (reason: AuthGateReason, opts?: { variant?: "inline" | "sheet"; pendingAction?: () => void }) => {
      if (isAuthenticated) return;
      // first_intent is silent after the user dismissed it once.
      if (reason === "first_intent") {
        try {
          if (sessionStorage.getItem(AUTH_GATE_DISMISS_KEY) === "1") return;
        } catch {}
      }
      open({ reason, variant: opts?.variant ?? "inline", pendingAction: opts?.pendingAction });
    },
    [isAuthenticated, open],
  );

  const requireAuth = useCallback(
    (action: () => void, reason: AuthGateReason) => {
      if (isAuthenticated) {
        action();
        return;
      }
      open({ reason, variant: "sheet", pendingAction: action });
    },
    [isAuthenticated, open],
  );

  return {
    isAuthenticated,
    role: role ?? null,
    requestLoginPrompt,
    requireAuth,
    close,
  };
}
