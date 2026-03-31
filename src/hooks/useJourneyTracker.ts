/**
 * UNPRO — Journey Tracker Hook
 * Automatically tracks navigation and saves snapshots for journey continuity.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { trackNavigation, updateJourneyState, saveJourneySnapshot } from "@/services/navigation/journeyService";
import { getJourneyTypeForRole } from "@/config/routeRegistry";

export function useJourneyTracker() {
  const location = useLocation();
  const { role, isAuthenticated } = useAuth();
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    const from = prevPath.current;
    const to = location.pathname;

    if (from !== to) {
      trackNavigation(from, to);
      prevPath.current = to;
    }

    // Update journey state
    if (isAuthenticated && role) {
      const journeyType = getJourneyTypeForRole(role);
      updateJourneyState({
        activeJourney: journeyType,
        currentPath: to,
      });

      // Save snapshot for resumable protected routes
      const isProtected = to.startsWith("/dashboard") || to.startsWith("/pro") || to.startsWith("/admin") || to.startsWith("/condos/dashboard");
      if (isProtected) {
        saveJourneySnapshot({
          activeJourney: journeyType,
          routePath: to,
          stepKey: null,
          payload: {},
        });
      }
    }
  }, [location.pathname, role, isAuthenticated]);
}
