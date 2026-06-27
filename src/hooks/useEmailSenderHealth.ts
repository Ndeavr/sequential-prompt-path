import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailSenderHealth {
  sender: { active: string; address: string; valid: boolean };
  resend: { status: "ok" | "auth_error" | "missing_key" | "error"; http_status: number | null };
  last_send_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  last_resend_code: number | null;
  delivery_rate: number;
  bounce_rate: number;
  failed_rate: number;
  last_selftest: { ran_at: string; passed: boolean; provider_message_id: string | null } | null;
  sender_mismatches: { created_at: string; payload: Record<string, unknown> }[];
  window_days: number;
  totals: { sent: number; delivered: number; bounced: number; failed: number; total: number };
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
