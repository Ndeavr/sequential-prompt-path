/**
 * UNPRO — Resolved Destination Hook
 * Returns the best destination for a given path based on user context.
 */
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { resolveRouteIntent, type RouteResolution } from "@/services/navigation/routeIntentResolver";

export function useResolvedDestination(attemptedPath: string): RouteResolution {
  const { role, isAuthenticated } = useAuth();

  return useMemo(
    () => resolveRouteIntent(attemptedPath, role, isAuthenticated),
    [attemptedPath, role, isAuthenticated]
  );
}
