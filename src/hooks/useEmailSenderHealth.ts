import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HealthLevel = "ok" | "warn" | "blocked" | "unknown";

export interface EmailSenderHealth {
  overall: { level: HealthLevel; reason: string; remediation: string | null };
  configured_sender: { level: HealthLevel; active: string; address: string; domain: string; note: string };
  domain: { level: HealthLevel; detail: string };
  api_request: { level: HealthLevel; http_status: number | null; detail: string; route: string; key_prefix: string | null };
  provider_acceptance: {
    level: HealthLevel;
    last_accepted_at: string | null;
    last_provider_id: string | null;
    sender_used: string | null;
  };
  delivery: {
    level: HealthLevel;
    delivery_rate: number;
    bounce_rate: number;
    failed_rate: number;
    totals: { sent: number; delivered: number; bounced: number; failed: number; total: number };
    window_days: number;
  };
  last_failure: {
    level: HealthLevel;
    at: string;
    message: string | null;
    status: string;
    template_name: string | null;
    channel: string | null;
  } | null;
  last_send_at: string | null;
  last_selftest: { ran_at: string; passed: boolean; provider_message_id: string | null; error_message?: string | null } | null;
  sender_mismatches: { created_at: string; payload: Record<string, unknown> }[];
}

export function useEmailSenderHealth() {
  return useQuery({
    queryKey: ["email-sender-health"],
    queryFn: async (): Promise<EmailSenderHealth> => {
      const { data, error } = await supabase.functions.invoke("email-sender-health");
      if (error) throw error;
      return data as EmailSenderHealth;
    },
    refetchInterval: 60_000,
  });
}

export function useRunDailySelftest() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("email-daily-selftest");
      if (error) throw error;
      return data as { ok: boolean; message_id: string | null; recipient: string; when: string };
    },
  });
}
