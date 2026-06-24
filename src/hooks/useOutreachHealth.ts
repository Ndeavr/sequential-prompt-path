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
