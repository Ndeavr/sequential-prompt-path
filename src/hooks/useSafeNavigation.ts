/**
 * UNPRO — Safe Navigation Hook
 * Wraps useNavigate with fallback resolution for broken routes.
 */
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { resolveRouteIntent } from "@/services/navigation/routeIntentResolver";

export function useSafeNavigation() {
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();

  const safeNavigate = useCallback(
    (path: string, options?: { replace?: boolean }) => {
      try {
        navigate(path, options);
      } catch {
        const resolution = resolveRouteIntent(path, role, isAuthenticated);
        navigate(resolution.targetPath, { replace: true });
      }
    },
    [navigate, role, isAuthenticated]
  );

  return { safeNavigate, navigate };
}
