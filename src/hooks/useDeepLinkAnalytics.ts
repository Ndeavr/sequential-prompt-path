/**
 * UNPRO — Deep Link Analytics Hook
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsMetrics {
  totalScans: number;
  totalLandingViews: number;
  totalCtaClicks: number;
  totalAuthCompleted: number;
  totalConversions: number;
  ctaRate: number;
  authCompletionRate: number;
  conversionRate: number;
}

export function useDeepLinkAnalytics(filters?: { placementId?: string; feature?: string; city?: string }) {
  return useQuery({
    queryKey: ["deep-link-analytics", filters],
    queryFn: async (): Promise<AnalyticsMetrics> => {
      const events = supabase.from("deep_link_events" as any);

      const [scans, views, ctas, auths] = await Promise.all([
        events.select("id", { count: "exact", head: true }).eq("event_type", "qr_scanned"),
        events.select("id", { count: "exact", head: true }).eq("event_type", "landing_viewed"),
        events.select("id", { count: "exact", head: true }).eq("event_type", "cta_clicked"),
        events.select("id", { count: "exact", head: true }).eq("event_type", "auth_completed"),
      ]);

      const { count: convCount } = await supabase
        .from("qualified_conversions" as any)
        .select("id", { count: "exact", head: true })
        .eq("is_qualified", true);

      const s = scans.count || 0;
      const v = views.count || 0;
      const c = ctas.count || 0;
      const a = auths.count || 0;
      const conv = convCount || 0;

      return {
        totalScans: s,
        totalLandingViews: v,
        totalCtaClicks: c,
        totalAuthCompleted: a,
        totalConversions: conv,
        ctaRate: v > 0 ? Math.round((c / v) * 100) : 0,
        authCompletionRate: c > 0 ? Math.round((a / c) * 100) : 0,
        conversionRate: v > 0 ? Math.round((conv / v) * 100) : 0,
      };
    },
  });
}
