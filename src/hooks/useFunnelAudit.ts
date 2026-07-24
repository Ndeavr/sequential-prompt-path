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

export type ReadinessStatus =
  | "ready"
  | "missing_landing"
  | "missing_city"
  | "missing_category"
  | "missing_phone"
  | "casl_pending";

export interface CanaryPreviewLead {
  lead_id: string;
  business: string | null;
  city?: string | null;
  category?: string | null;
  phone: string | null;
  evidence_source_url: string | null;
  evidence_retrieved_at: string | null;
  verification_method: string | null;
  prior_contact_status?: string | null;
  exclusion_reason?: string | null;
  landing_url?: string | null;
  landing_status?: "verified" | "pending_generation";
  readiness?: {
    status: ReadinessStatus;
    checks: { phone: boolean; casl: boolean; city: boolean; category: boolean; landing: boolean };
  };
}

export interface CanaryPreview {
  mode?: string;
  limit?: number;
  would_send_count?: number;
  would_send: CanaryPreviewLead[];
  disclaimer?: string;
  error?: string;
}

export interface CanaryReadiness {
  eligible: number;
  ready_now: number;
  missing_city: number;
  missing_category: number;
  missing_landing: number;
  missing_phone: number;
  ready_pct: number;
  error?: string;
}

export interface RepairResult {
  requested: number;
  created: number;
  skipped: number;
  created_landings: Array<{ lead_id: string; slug: string }>;
  skips: Array<{ lead_id: string; reason: string }>;
  error?: string;
}

export interface FunnelAuditReport {
  window_days: number;
  generated_at: string;
  total_leads_scraped: number;
  biggest_dropoff: { key: string; label: string; drop_pct: number; from: number; to: number } | null;
  prefill_coverage: { sampled: number; prefilled: number; pct: number };
  sms_7d_summary: { queued: number; sent: number; delivered: number; failed: number; undelivered: number; total: number };
  stages: FunnelStage[];
  canary_preview?: CanaryPreview;
  canary_readiness?: CanaryReadiness | null;
  repair_result?: RepairResult | null;
}

export function useFunnelAudit(
  days = 30,
  opts: { canary?: boolean; canaryLimit?: number } = {},
) {
  const { canary = false, canaryLimit = 3 } = opts;
  return useQuery<FunnelAuditReport>({
    queryKey: ["funnel-audit", days, canary, canaryLimit],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Non authentifié");
      const params = new URLSearchParams({ days: String(days) });
      if (canary) {
        params.set("canary_preview", "1");
        params.set("canary_limit", String(canaryLimit));
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/funnel-audit-report?${params.toString()}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      return body as FunnelAuditReport;
    },
    refetchInterval: canary ? false : 60_000,
  });
}

export async function repairCanaryLandings(limit = 5): Promise<RepairResult> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Non authentifié");
  const params = new URLSearchParams({ action: "repair_landings", limit: String(limit), canary_preview: "1", canary_limit: "3" });
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/funnel-audit-report?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return (body?.repair_result ?? { requested: limit, created: 0, skipped: 0, created_landings: [], skips: [] }) as RepairResult;
}
