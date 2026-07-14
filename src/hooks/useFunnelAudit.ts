import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  conversion_from_previous_pct: number | null;
  drop_from_previous_pct: number | null;
  last_occurrence_at: string | null;
  top_error: { code: string; message: string; count: number } | null;
}

export interface FunnelAuditReport {
  window_days: number;
  generated_at: string;
  total_leads_scraped: number;
  biggest_dropoff: { key: string; label: string; drop_pct: number; from: number; to: number } | null;
  prefill_coverage: { sampled: number; prefilled: number; pct: number };
  sms_7d_summary: { queued: number; sent: number; delivered: number; failed: number; undelivered: number; total: number };
  stages: FunnelStage[];
}

export function useFunnelAudit(days = 30) {
  return useQuery<FunnelAuditReport>({
    queryKey: ["funnel-audit", days],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Non authentifié");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/funnel-audit-report?days=${days}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      return body as FunnelAuditReport;
    },
    refetchInterval: 60_000,
  });
}
