// UNPRO — Auto-enqueue every newly enriched contractor into contact_verification_queue.
// Best-effort, non-blocking, idempotent (queue has unique index on source_table+source_lead_id).
// Used by every acquisition / enrichment edge function so that NO contractor enters outreach
// without first being validated (line-type, RBQ/NEQ match, channel choice).

export interface AutoVerifyPayload {
  business_name?: string | null;
  contact_person_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  google_business_url?: string | null;
  rbq_number?: string | null;
  rbq_business_name?: string | null;
  rbq_status?: string | null;
  neq_number?: string | null;
  neq_business_name?: string | null;
  neq_status?: string | null;
  google_rating?: number | null;
  google_reviews_count?: number | null;
  category?: string | null;
  city?: string | null;
  source_lead_id?: string | null;
  source_table?: string | null;
}

export async function enqueueContactVerification(payload: AutoVerifyPayload): Promise<void> {
  try {
    if (!payload?.business_name || !payload.business_name.trim()) return;
    const SUPA_URL = Deno.env.get("SUPABASE_URL");
    const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPA_URL || !SRK) return;

    // Fire and forget — never block the caller
    fetch(`${SUPA_URL}/functions/v1/contact-verification-enqueue`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` },
      body: JSON.stringify(payload),
    }).catch(() => { /* swallow */ });
  } catch { /* never throw */ }
}
