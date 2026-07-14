import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FunnelStepCell {
  at: string | null;
  ok: boolean;
  error?: string | null;
}

export interface FunnelLead {
  lead_id: string;
  phone: string | null;
  company_name: string | null;
  category: string | null;
  city: string | null;
  lead_status: string | null;
  failure_code: string | null;
  steps: Record<string, FunnelStepCell>;
  first_break: { step: string; reason: string } | null;
}

export interface FunnelDebugReport {
  steps: string[];
  totals: { leads: number; paid: number; activated: number };
  leads: FunnelLead[];
  window_days: number;
}

async function invoke<T>(name: string, opts?: { method?: string; body?: unknown; qs?: string }) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Non authentifié");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}${opts?.qs ?? ""}`;
  const res = await fetch(url, {
    method: opts?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error ?? `HTTP ${res.status}`);
  return j as T;
}

export function useFunnelDebugLeads(days = 30, limit = 200) {
  return useQuery<FunnelDebugReport>({
    queryKey: ["funnel-debug-leads", days, limit],
    queryFn: () => invoke<FunnelDebugReport>("funnel-debug-leads", { qs: `?days=${days}&limit=${limit}` }),
    refetchInterval: 15_000,
  });
}

export interface TestRunResult {
  ok: boolean;
  run_id?: string;
  lead_id?: string;
  message_sid?: string | null;
  sms_url?: string;
  trace: Array<{ step: string; ok: boolean; at: string; detail?: any }>;
  first_break: { step: string; detail?: any } | null;
  note?: string;
}

export function useRunFunnelTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phone: string; name?: string; category?: string; city?: string }) =>
      invoke<TestRunResult>("funnel-debug-run-test", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funnel-debug-leads"] }),
  });
}
