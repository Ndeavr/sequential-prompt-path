/**
 * useSmsHealth — Reads v_sms_infrastructure_status + last sms_test_runs row.
 * Exposes runTestSms mutation invoking edge function `sms-admin-test`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SmsHealthStatus = "HEALTHY" | "WARNING" | "ERROR";

export interface SmsInfrastructureStatus {
  status: SmsHealthStatus;
  last_callback_at: string | null;
  last_test_success_at: string | null;
  sent_24h: number | null;
  delivered_24h: number | null;
  failed_24h: number | null;
  delivery_rate_24h: number | null;
}

export interface LastTestRun {
  id: string;
  phone: string;
  message_sid: string | null;
  success: boolean;
  callback_received: boolean;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  error: string | null;
  created_at: string;
}

export interface SmsHealthBundle {
  status: SmsInfrastructureStatus;
  lastTest: LastTestRun | null;
  blockReason: string | null;
}

function computeBlockReason(s: SmsInfrastructureStatus): string | null {
  if (s.status === "HEALTHY") return null;
  if (!s.last_callback_at) {
    return "Aucun callback Twilio reçu. Le webhook `twilio-status-v2` n'a jamais confirmé une livraison. Envoyez un SMS test pour établir le canal.";
  }
  if (!s.last_test_success_at) {
    return "Aucun test SMS réussi enregistré. Cliquez « Exécuter un test SMS » pour valider le pipeline.";
  }
  const ageH = (Date.now() - new Date(s.last_test_success_at).getTime()) / 36e5;
  if (ageH > 24) {
    return `Dernier test SMS réussi il y a ${ageH.toFixed(1)}h (>24h). Relancez un test pour rafraîchir la santé outbound.`;
  }
  if ((s.sent_24h ?? 0) > 10 && (s.delivery_rate_24h ?? 100) < 90) {
    return `Taux de livraison 24 h à ${s.delivery_rate_24h}% (<90%). Trop d'échecs Twilio — vérifiez numéros et solde.`;
  }
  return "Outbound bloqué — raison inconnue. Consultez `v_sms_infrastructure_status`.";
}

export function useSmsHealth() {
  return useQuery<SmsHealthBundle>({
    queryKey: ["sms-health"],
    queryFn: async () => {
      const [{ data: statusRow }, { data: lastRow }] = await Promise.all([
        supabase.from("v_sms_infrastructure_status" as any).select("*").maybeSingle(),
        supabase
          .from("sms_test_runs")
          .select("id,phone,message_sid,success,callback_received,sent_at,delivered_at,failed_at,error,created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const status = (statusRow as unknown as SmsInfrastructureStatus | null) ?? {
        status: "ERROR",
        last_callback_at: null,
        last_test_success_at: null,
        sent_24h: 0,
        delivered_24h: 0,
        failed_24h: 0,
        delivery_rate_24h: null,
      };
      return {
        status,
        lastTest: (lastRow as LastTestRun | null) ?? null,
        blockReason: computeBlockReason(status),
      };
    },
    refetchInterval: 30_000,
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
        toast.success(`Test SMS envoyé (${data.status ?? "sent"}) — en attente du callback Twilio.`);
      } else {
        toast.error(`Échec test SMS: ${data.error_message ?? data.error_code ?? "inconnu"}`);
      }
      qc.invalidateQueries({ queryKey: ["sms-health"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur test SMS"),
  });
}
