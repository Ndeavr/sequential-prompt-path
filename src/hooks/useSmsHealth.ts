/**
 * useSmsHealth — Canonical: reads `public.get_sms_outbound_health()` RPC
 * (single source of truth wrapping v_sms_infrastructure_status + sms_test_runs).
 * Adds test cooldown (5 min) computed from lastTest.created_at.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SmsHealthStatus = "HEALTHY" | "WARNING" | "ERROR";

export interface SmsOutboundHealth {
  is_operational: boolean;
  status: SmsHealthStatus;
  last_callback_at: string | null;
  last_test_success_at: string | null;
  valid_until: string | null;
  sent_24h: number | null;
  delivered_24h: number | null;
  failed_24h: number | null;
  delivery_rate_24h: number | null;
  last_test_sid: string | null;
  last_test_phone: string | null;
  last_test_error: string | null;
  reason: string | null;
}

export interface SmsHealthBundle {
  health: SmsOutboundHealth;
  cooldownMs: number; // > 0 means test button should be disabled
}

const COOLDOWN_MS = 5 * 60 * 1000;

export function maskPhone(p: string | null | undefined): string {
  if (!p) return "—";
  const s = String(p).replace(/\s+/g, "");
  if (s.length < 6) return s;
  return `${s.slice(0, 3)}•••••${s.slice(-4)}`;
}

export function maskSid(sid: string | null | undefined): string {
  if (!sid) return "—";
  return sid.length > 10 ? `${sid.slice(0, 4)}…${sid.slice(-4)}` : sid;
}

export function useSmsHealth() {
  return useQuery<SmsHealthBundle>({
    queryKey: ["sms-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_sms_outbound_health" as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const health = (row ?? {
        is_operational: false,
        status: "ERROR",
        last_callback_at: null,
        last_test_success_at: null,
        valid_until: null,
        sent_24h: 0,
        delivered_24h: 0,
        failed_24h: 0,
        delivery_rate_24h: null,
        last_test_sid: null,
        last_test_phone: null,
        last_test_error: null,
        reason: "RPC indisponible.",
      }) as SmsOutboundHealth;

      // Cooldown computed from most recent test run
      const { data: lastRun } = await supabase
        .from("sms_test_runs")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const cooldownMs = lastRun?.created_at
        ? Math.max(0, COOLDOWN_MS - (Date.now() - new Date(lastRun.created_at).getTime()))
        : 0;

      return { health, cooldownMs };
    },
    refetchInterval: 15_000,
  });
}

export function useRunSmsTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phone?: string) => {
      const { data, error } = await supabase.functions.invoke("sms-admin-test", {
        body: phone ? { to: phone } : {},
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as {
        ok: boolean;
        test_run_id?: string;
        twilio_sid?: string;
        status?: string;
        error_code?: string | null;
        error_message?: string | null;
      };
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Test SMS envoyé (${data.status ?? "sent"}). En attente du callback Twilio…`);
      } else {
        toast.error(`Échec test SMS: ${data.error_message ?? data.error_code ?? "inconnu"}`);
      }
      qc.invalidateQueries({ queryKey: ["sms-health"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur test SMS"),
  });
}
