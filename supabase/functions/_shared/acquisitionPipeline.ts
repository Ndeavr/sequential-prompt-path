// Shared acquisition-pipeline event helper. Import from edge functions to emit
// funnel events into `public.acquisition_pipeline_events`.
// Fails silently (logs only) — never blocks the caller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type PipelineStage =
  | "scraped"
  | "enriching"
  | "enriched"
  | "queued"
  | "promoted"
  | "verified"
  | "verification_reused"
  | "excluded_history"
  | "quarantined"
  | "lookup_failed"
  | "ready_sms"
  | "ready_email"
  | "contacted"
  | "sms_attempted"
  | "sms_sent"
  | "delivered"
  | "clicked"
  | "activated"
  | "paid"
  | "failed"
  | "rejected"
  | "duplicate"
  | "dry_run_preview"
  | "worker_cycle";

export const REASON = {
  phone_invalid: "phone_invalid",
  phone_missing: "phone_missing",
  email_missing: "email_missing",
  quality_below_80: "quality_below_80",
  duplicate_neq: "duplicate_neq",
  duplicate_phone: "duplicate_phone",
  duplicate_business: "duplicate_business",
  outside_target_zone: "outside_target_zone",
  category_unknown: "category_unknown",
  enrichment_failed: "enrichment_failed",
  website_unreachable: "website_unreachable",
  sms_not_eligible: "sms_not_eligible",
  landline_only: "landline_only",
  no_contact_info: "no_contact_info",
  timeout: "timeout",
  unknown: "unknown",
  history_delivery_logs: "history_delivery_logs",
  history_contractor_leads: "history_contractor_leads",
  history_prospect_contacted: "history_prospect_contacted",
  lookup_unknown_type: "lookup_unknown_type",
  lookup_provider_failed: "lookup_provider_failed",
  fair_selection_empty: "fair_selection_empty",
} as const;

export type ReasonCode = keyof typeof REASON;

export interface PipelineEventInput {
  prospect_id?: string | null;
  business_name?: string | null;
  city?: string | null;
  category?: string | null;
  source?: string | null;
  stage: PipelineStage;
  reason_code?: ReasonCode | string | null;
  reason_text?: string | null;
  metadata?: Record<string, unknown>;
}

let cached: ReturnType<typeof createClient> | null = null;
function admin() {
  if (cached) return cached;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

export async function logPipelineEvent(evt: PipelineEventInput): Promise<void> {
  try {
    await admin().from("acquisition_pipeline_events").insert({
      prospect_id: evt.prospect_id ?? null,
      business_name: evt.business_name ?? null,
      city: evt.city ?? null,
      category: evt.category ?? null,
      source: evt.source ?? null,
      stage: evt.stage,
      reason_code: evt.reason_code ?? null,
      reason_text: evt.reason_text ?? null,
      metadata: evt.metadata ?? {},
    });
  } catch (err) {
    console.error("[pipeline-event] failed", err);
  }
}

// -----------------------------------------------------------------------------
// Category normalization — one canonical bucket, many equivalent labels.
// Used by autonomous + targeted acquisition paths so operator input matches
// live production data whether it was captured in EN, FR or as a slug.
// -----------------------------------------------------------------------------
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  plumber: ["plumber", "plumbing", "plombier", "plomberie", "drainage", "drainage de fondations", "excavation et drainage"],
  roofing: ["roofing", "toiture", "couvreur", "couvreurs"],
  electrician: ["electrician", "electrical", "electricite", "électricien", "electricien", "électricité"],
  hvac: ["hvac", "chauffage", "climatisation", "ventilation", "chauffage et climatisation", "thermopompes", "climatisation et chauffage (thermopompes)", "climatisation/chauffage", "chauffage, climatisation et ventilation", "chauffage, ventilation, climatisation", "climatisation, chauffage, ventilation", "chauffage, ventilation et climatisation"],
  isolation: ["isolation", "insulation", "isolation acoustique", "acoustique", "insonorisation"],
  painting: ["painting", "peinture", "peintre"],
  landscaping: ["landscaping", "paysagement", "paysagiste", "aménagement paysager", "amenagement paysager"],
  renovation: ["renovation", "rénovation", "rénovation générale", "renovation generale", "rénovation résidentielle", "rénovation de cuisine", "rénovation de salle de bain", "rénovation de sous-sol", "rénovation et construction", "entrepreneur général", "entrepreneur general", "construction et rénovation résidentielle", "cuisine et salle de bain", "armoires de cuisines"],
  excavation: ["excavation", "fondation", "béton", "beton"],
  decontamination: ["decontamination", "décontamination", "restauration après sinistre"],
};

export function normalizeCategoryInput(input: string | null | undefined): { bucket: string; synonyms: string[] } | null {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (!key) return null;
  // Exact bucket match first
  if (CATEGORY_SYNONYMS[key]) return { bucket: key, synonyms: CATEGORY_SYNONYMS[key] };
  // Search inside synonym lists
  for (const [bucket, syns] of Object.entries(CATEGORY_SYNONYMS)) {
    if (syns.some((s) => s.toLowerCase() === key)) return { bucket, synonyms: syns };
  }
  // Unknown: treat as literal single-value match
  return { bucket: key, synonyms: [key] };
}
