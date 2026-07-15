import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VerifiedProspect {
  id: string;
  business_name: string;
  category: string | null;
  website_url: string | null;
  phone_primary: string | null;
  phone_e164: string | null;
  phone_line_type: string | null;
  phone_validation_status: string;
  sms_eligible: boolean;
  email: string | null;
  street_address: string | null;
  city: string | null;
  postal_code: string | null;
  rbq_number: string | null;
  verification_status: string;
  data_quality_score: number;
  source_urls: Record<string, unknown> | null;
  outreach_status: string;
  outreach_twilio_sid: string | null;
  outreach_sent_at: string | null;
  outreach_failure_reason: string | null;
  verified_at: string | null;
  last_enriched_at: string | null;
  created_at: string;
}

export function useVerifiedProspects() {
  return useQuery({
    queryKey: ["verified-prospects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verified_contractor_prospects" as any)
        .select("*")
        .order("data_quality_score", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as VerifiedProspect[];
    },
  });
}

export function useEnrichProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect_id: string) => {
      const { data, error } = await supabase.functions.invoke("enrich-contractor-from-official-site", {
        body: { prospect_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verified-prospects"] }),
  });
}

export function useValidatePhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect_id: string) => {
      const { data, error } = await supabase.functions.invoke("validate-contractor-phone", {
        body: { prospect_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verified-prospects"] }),
  });
}

export function useSendVerifiedBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ limit, dry_run }: { limit: number; dry_run: boolean }) => {
      const { data, error } = await supabase.functions.invoke("send-verified-batch", {
        body: { limit, dry_run },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verified-prospects"] }),
  });
}

export function statusLabel(p: VerifiedProspect): { label: string; tone: "ok" | "warn" | "err" | "info" } {
  if (p.outreach_status === "activated") return { label: "Activé 1 $", tone: "ok" };
  if (p.outreach_status === "clicked") return { label: "Cliqué", tone: "ok" };
  if (p.outreach_status === "delivered") return { label: "Livré", tone: "ok" };
  if (p.outreach_status === "sent") return { label: "Envoyé", tone: "info" };
  if (p.outreach_status === "failed") return { label: "Échec Twilio", tone: "err" };
  if (p.phone_validation_status === "invalid") return { label: "Numéro invalide", tone: "err" };
  if (p.phone_validation_status === "landline") return { label: "Ligne fixe — email requis", tone: "warn" };
  if (p.phone_validation_status === "unverified") return { label: "Non vérifié", tone: "warn" };
  if (p.data_quality_score < 70) return { label: "À enrichir", tone: "warn" };
  if (p.sms_eligible) return { label: "Prêt à envoyer", tone: "ok" };
  return { label: "En attente", tone: "info" };
}
