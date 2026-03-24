/**
 * UNPRO — Screenshot Analytics Hook (Admin)
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useScreenshotAnalytics() {
  const daily = useQuery({
    queryKey: ["screenshot_analytics_daily"],
    queryFn: async () => {
      const { data } = await supabase.from("screenshot_analytics_daily").select("*").limit(30);
      return data ?? [];
    },
  });

  const topScreens = useQuery({
    queryKey: ["screenshot_top_screens"],
    queryFn: async () => {
      const { data } = await supabase.from("screenshot_top_screens").select("*").limit(20);
      return data ?? [];
    },
  });

  const conversion = useQuery({
    queryKey: ["screenshot_conversion_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("screenshot_conversion_summary").select("*").single();
      return data;
    },
  });

  const roleBreakdown = useQuery({
    queryKey: ["screenshot_role_breakdown"],
    queryFn: async () => {
      const { data } = await supabase.from("screenshot_role_breakdown").select("*");
      return data ?? [];
    },
  });

  return { daily, topScreens, conversion, roleBreakdown };
}

export function useFrictionScoring() {
  return useQuery({
    queryKey: ["screen_friction_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("screen_friction_summary").select("*");
      return data ?? [];
    },
  });
}

export function useAdminScreenshotAlerts(statusFilter?: string) {
  return useQuery({
    queryKey: ["screenshot_alerts", statusFilter],
    queryFn: async () => {
      let q = supabase.from("screenshot_alerts").select("*").order("created_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data } = await q;
      return data ?? [];
    },
  });
}

export function useScreenshotRecommendations(statusFilter?: string) {
  return useQuery({
    queryKey: ["screenshot_recommendations", statusFilter],
    queryFn: async () => {
      let q = supabase.from("screenshot_recommendations").select("*").order("created_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data } = await q;
      return data ?? [];
    },
  });
}

export function useScreenshotAlertSummary() {
  return useQuery({
    queryKey: ["screenshot_alert_summary"],
    queryFn: async () => {
      const { data } = await supabase.from("screenshot_alert_summary").select("*");
      return data ?? [];
    },
  });
}

export function useRecentScreenshotEvents(limit = 20) {
  return useQuery({
    queryKey: ["screenshot_events_recent", limit],
    queryFn: async () => {
      const { data } = await supabase
        .from("screenshot_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data ?? [];
    },
  });
}
