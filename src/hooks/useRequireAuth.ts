/**
 * UNPRO — Soft auth gate hook
 * Opens the auth overlay instead of hard-redirecting.
 * Returns a function that checks auth and opens overlay if needed.
 */
import { useAuth } from "@/hooks/useAuth";
import { openAuthOverlay } from "@/hooks/useAuthOverlay";
import { useLocation } from "react-router-dom";

export function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  /**
   * Call before a protected action. Returns true if authenticated.
   * If not, opens the auth overlay and returns false.
   */
  function requireAuth(actionLabel?: string, action?: string): boolean {
    if (isAuthenticated) return true;
    openAuthOverlay({
      label: actionLabel ?? "Continuer votre action",
      returnPath: location.pathname + location.search + location.hash,
      action,
    });
    return false;
  }

  return { requireAuth, isAuthenticated };
}
