import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOutreachFunnel() {
  return useQuery({
    queryKey: ["v_outreach_funnel_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_outreach_funnel_full" as any)
        .select("*")
        .order("sent", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as Array<{
        campaign_id: string; channel: "email" | "sms";
        sent: number; delivered: number; opened: number; clicked: number;
        replied: number; bounced: number;
        onboarding_started: number; activated: number; paid: number;
      }>;
    },
    refetchInterval: 15_000,
  });
}

export function useProviderHealth() {
  return useQuery({
    queryKey: ["v_outreach_provider_health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_outreach_provider_health" as any)
        .select("*");
      if (error) throw error;
      return ((data ?? []) as unknown) as Array<{
        provider: "resend_email" | "twilio_sms" | "r_redirect_clicks" | "stripe_checkouts";
        last_event_at: string | null;
      }>;
    },
    refetchInterval: 30_000,
  });
}

export function useAutopilotGate() {
  return useQuery({
    queryKey: ["outreach_autopilot_gate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_autopilot_gate" as any)
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as { gated: boolean; last_pass_at: string | null; reason: string | null; updated_at: string } | null;
    },
    refetchInterval: 15_000,
  });
}

export function useRecentE2ERuns(limit = 5) {
  return useQuery({
    queryKey: ["acq_e2e_test_runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acq_e2e_test_runs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10_000,
  });
}

export function useRecentEmailEvents(limit = 100) {
  return useQuery({
    queryKey: ["outreach_email_events_recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_email_events" as any)
        .select("id,message_id,recipient,template,campaign_id,subject,sent_at,delivered_at,opened_at,clicked_at,replied_at,bounced_at,last_error")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useRunSelftest() {
  return useMutation({
    mutationFn: async (params: { email?: string } = {}) => {
      const { data, error } = await supabase.functions.invoke("acq-e2e-selftest", { body: params });
      if (error) throw error;
      return data;
    },
  });
}

export function useRun30dBackfill() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("acq-events-backfill-30d", { body: {} });
      if (error) throw error;
      return data;
    },
  });
}

export function useOperationalScore() {
  return useQuery({
    queryKey: ["outreach_operational_score_latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_operational_score" as any).select("*")
        .order("computed_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30_000,
  });
}

export function useActiveHealthChecks() {
  return useQuery({
    queryKey: ["outreach_health_checks_latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_health_checks" as any).select("*")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      // Dedupe to latest per provider
      const seen = new Set<string>();
      const latest: any[] = [];
      for (const row of (data as any[]) ?? []) {
        if (!seen.has(row.provider)) { seen.add(row.provider); latest.push(row); }
      }
      return latest;
    },
    refetchInterval: 15_000,
  });
}

export function useRepairRuns(limit = 20) {
  return useQuery({
    queryKey: ["outreach_repair_runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_repair_runs" as any).select("*")
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useCriticalAlerts() {
  return useQuery({
    queryKey: ["outreach_critical_alerts_open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_critical_alerts" as any).select("*")
        .is("resolved_at", null)
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 20_000,
  });
}

export function useE2EFullRuns(limit = 5) {
  return useQuery({
    queryKey: ["outreach_e2e_full_runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_e2e_full_runs" as any).select("*")
        .eq("step", "summary")
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15_000,
  });
}

export function useRunHealthAgent() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("outreach-health-agent", { body: { trigger: "manual" } });
      if (error) throw error;
      return data;
    },
  });
}

export function useRunE2EReal() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("acq-e2e-real", { body: { trigger: "manual" } });
      if (error) throw error;
      return data as {
        run_group: string; pass: boolean; total_ms: number;
        failed_step: { index: number; step: string; error: string; repair?: string } | null;
        steps: Array<{ index: number; step: string; status: "pass"|"fail"|"skipped"; duration_ms: number; error?: string; repair?: string }>;
      };
    },
  });
}

export function useRepairMessaging() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("outreach-repair-messaging", { body: {} });
      if (error) throw error;
      return data as {
        ok: boolean;
        steps: Array<{ step: string; ok: boolean; detail: string; duration_ms: number; repair?: string }>;
        e2e: { pass: boolean; failed_step: any } | null;
      };
    },
  });
}

