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

export class VerifiedFunctionError extends Error {
  functionName: string;
  status: number | "network";
  requestId: string | null;
  details: unknown;

  constructor(args: {
    functionName: string;
    status: number | "network";
    message: string;
    requestId?: string | null;
    details?: unknown;
  }) {
    super(args.message);
    this.name = "VerifiedFunctionError";
    this.functionName = args.functionName;
    this.status = args.status;
    this.requestId = args.requestId ?? null;
    this.details = args.details;
  }
}

export function formatVerifiedFunctionError(error: unknown): string {
  if (error instanceof VerifiedFunctionError) {
    return [
      `Function: ${error.functionName}`,
      `Status: ${error.status}`,
      `Message: ${error.message}`,
      error.requestId ? `Request ID: ${error.requestId}` : null,
    ].filter(Boolean).join("\n");
  }

  const message = error instanceof Error ? error.message : "Erreur inconnue";
  return `Message: ${message}`;
}

async function invokeVerifiedFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? anonKey;

  if (!baseUrl || !anonKey) {
    throw new VerifiedFunctionError({
      functionName,
      status: "network",
      message: "Configuration navigateur manquante: URL backend ou clé publique absente.",
    });
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (networkError) {
    throw new VerifiedFunctionError({
      functionName,
      status: "network",
      message: "Appel impossible: fonction non déployée, CORS ou réseau bloqué.",
      details: networkError,
    });
  }

  const requestId = response.headers.get("x-request-id");
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }

  if (!response.ok || payload?.ok === false) {
    throw new VerifiedFunctionError({
      functionName,
      status: response.status,
      message: payload?.message || payload?.error || response.statusText || "Fonction backend en échec.",
      requestId: payload?.request_id || requestId,
      details: payload,
    });
  }

  return payload as T;
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
      return invokeVerifiedFunction<any>("enrich-contractor-from-official-site", { prospect_id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verified-prospects"] }),
  });
}

export function useValidatePhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect_id: string) => {
      return invokeVerifiedFunction<any>("validate-contractor-phone", { prospect_id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["verified-prospects"] }),
  });
}

export function useSendVerifiedBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ limit, dry_run }: { limit: number; dry_run: boolean }) => {
      return invokeVerifiedFunction<any>("send-verified-batch", { limit, dry_run });
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
  if (p.outreach_failure_reason?.startsWith("enrichment_no_pages_scanned")) return { label: "Site inaccessible", tone: "err" };
  if (p.outreach_failure_reason?.startsWith("enrichment_incomplete")) return { label: "Erreur enrichissement", tone: "warn" };
  if (p.outreach_failure_reason?.startsWith("Twilio Lookup")) return { label: "Erreur validation", tone: "err" };
  if (p.phone_validation_status === "invalid") return { label: "Numéro invalide", tone: "err" };
  if (p.phone_validation_status === "landline") return { label: "Ligne fixe — email requis", tone: "warn" };
  if (p.phone_validation_status === "unverified") return { label: "Non vérifié", tone: "warn" };
  if (p.data_quality_score < 70) return { label: "À enrichir", tone: "warn" };
  if (p.sms_eligible) return { label: "Prêt à envoyer", tone: "ok" };
  return { label: "En attente", tone: "info" };
}
