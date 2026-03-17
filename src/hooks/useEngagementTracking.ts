/**
 * UNPRO — Engagement Tracking Hook
 * Tracks CTA clicks, scroll depth, form start/complete events.
 */
import { useCallback, useEffect, useRef } from "react";
import { trackEvent } from "@/services/eventTrackingService";

export function useEngagementTracking() {
  const scrollTracked = useRef<Set<number>>(new Set());

  // Track CTA clicks
  const trackCta = useCallback((label: string, destination?: string) => {
    trackEvent({
      eventType: "rendezvous_click",
      category: "matching",
      metadata: { label, destination },
    });
  }, []);

  // Track form events
  const trackFormStart = useCallback((formName: string) => {
    trackEvent({ eventType: "lead_start", category: "matching", metadata: { formName } });
  }, []);

  const trackFormComplete = useCallback((formName: string, metadata?: Record<string, unknown>) => {
    trackEvent({ eventType: "lead_complete", category: "matching", metadata: { formName, ...metadata } });
  }, []);

  // Track scroll depth (25%, 50%, 75%, 100%)
  useEffect(() => {
    const handleScroll = () => {
      const scrollPct = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      const thresholds = [25, 50, 75, 100];
      for (const t of thresholds) {
        if (scrollPct >= t && !scrollTracked.current.has(t)) {
          scrollTracked.current.add(t);
          trackEvent({
            eventType: "engagement",
            category: "seo",
            metadata: { scrollDepth: t, page: window.location.pathname },
          });
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { trackCta, trackFormStart, trackFormComplete };
}
