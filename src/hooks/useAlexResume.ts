/**
 * UNPRO — Alex Resume Hook
 * Fires after login to trigger resume + contextual Alex message.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getActiveDeepLinkId, trackDeepLinkEvent } from "@/services/deepLinkTracking";

export interface AlexResumeState {
  shouldResume: boolean;
  feature: string | null;
  deepLinkId: string | null;
  message: string;
}

const RESUME_KEY = "unpro_alex_resume";

export function saveAlexResumeIntent(feature: string, deepLinkId?: string) {
  sessionStorage.setItem(RESUME_KEY, JSON.stringify({ feature, deepLinkId, timestamp: Date.now() }));
}

export function useAlexResume(): AlexResumeState {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<AlexResumeState>({
    shouldResume: false,
    feature: null,
    deepLinkId: null,
    message: "",
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    const raw = sessionStorage.getItem(RESUME_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      // Only resume if within 10 minutes
      if (Date.now() - parsed.timestamp > 600_000) {
        sessionStorage.removeItem(RESUME_KEY);
        return;
      }

      const dlId = parsed.deepLinkId || getActiveDeepLinkId();

      trackDeepLinkEvent("auth_completed", dlId, { feature: parsed.feature });
      trackDeepLinkEvent("action_resumed", dlId, { feature: parsed.feature });

      setState({
        shouldResume: true,
        feature: parsed.feature,
        deepLinkId: dlId,
        message: "Parfait. On reprend exactement où tu étais.",
      });

      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      sessionStorage.removeItem(RESUME_KEY);
    }
  }, [isAuthenticated]);

  return state;
}
