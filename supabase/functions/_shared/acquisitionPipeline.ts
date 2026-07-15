// Shared acquisition-pipeline event helper. Import from edge functions to emit
// funnel events into `public.acquisition_pipeline_events`.
// Fails silently (logs only) — never blocks the caller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type PipelineStage =
  | "scraped"
  | "enriching"
  | "enriched"
  | "verified"
  | "ready_sms"
  | "ready_email"
  | "contacted"
  | "delivered"
  | "clicked"
  | "activated"
  | "rejected"
  | "duplicate"
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
