import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TruthStep =
  | "scraped" | "mobile_valid" | "sms_sent" | "sms_delivered"
  | "link_clicked" | "landing_view" | "landing_visible_3s" | "cta_clicked"
  | "alex_started" | "signup_started" | "signup_completed"
  | "checkout_opened" | "stripe_success" | "account_activated";

export interface TruthLead {
  lead_id: string;
  phone: string | null;
  company_name: string | null;
  category: string | null;
  city: string | null;
  lead_status: string | null;
  failure_code: string | null;
  device_type: string | null;
  session_id: string | null;
  source: string | null;
  steps: Record<TruthStep, { at: string | null; ok: boolean; error?: string | null }>;
  first_break: { step: string; reason: string } | null;
}

export interface TruthResponse {
  steps: TruthStep[];
  window_days: number;
  kpi: {
    leads: number;
    sms_delivered: number;
    landing_views: number;
    alex_starts: number;
    signups: number;
    checkouts: number;
    paid_activations: number;
  };
  blocker: { step: string; from: number; to: number; drop_pct: number; label: string } | null;
  mismatch: { delivered_no_click: number; click_no_view: number; view_no_session: number };
  variant_stats: Record<string, { sent: number; delivered: number }>;
  leads: TruthLead[];
}

export function useConversionTruth(days = 30) {
  return useQuery<TruthResponse>({
    queryKey: ["conversion-truth", days],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("conversion-truth-dashboard", {
        body: null,
        method: "GET" as any,
      }).catch(async () => {
        // Fallback: direct fetch with query param
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        const url = `https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/conversion-truth-dashboard?days=${days}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        return { data: await res.json(), error: null } as any;
      });
      if (error) throw error;
      return data as TruthResponse;
    },
    refetchInterval: 30_000,
  });
}
