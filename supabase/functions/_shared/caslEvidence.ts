/**
 * UNPRO — CASL Consent Evidence helpers (shared across scrapers + senders).
 *
 * ONE canonical way to (a) normalize a destination, (b) hash a public source,
 * and (c) persist a `casl_consent_evidence` row anchored to a scraped
 * prospect, an outbound_company, or a contractor_lead.
 *
 * These helpers NEVER decide whether to send. They only capture provenance.
 * The commercial-send-gate is still the single authority for authorizing a
 * production commercial SMS. Transactional / OTP / auth / service messages
 * MUST NOT rely on this module.
 */

// Deno-only imports are avoided so this file can also be re-used from
// browser mirrors if ever needed.

export type CaslDestinationType = "phone_sms" | "email";

export type CaslLawfulBasis =
  | "implicit_public_conspicuous"
  | "implicit_business_relationship"
  | "express_written"
  | "express_verbal_recorded"
  | "inquiry_recent";

export interface CaslCaptureInput {
  /** Which anchor(s) this evidence belongs to. Pass at least one. */
  contractor_lead_id?: string | null;
  contractor_prospect_id?: string | null;
  outbound_company_id?: string | null;

  destination_type: CaslDestinationType;
  destination: string;              // raw as scraped

  lawful_basis: CaslLawfulBasis;

  source_url?: string | null;       // exact page where destination was published
  source_type?: string | null;      // e.g. "google_business_profile", "company_website"
  source_publisher?: string | null; // e.g. "Google Places", "scelltech.com"
  retrieved_at?: string;            // ISO — defaults to now()
  page_content_for_hash?: string;   // raw payload to fingerprint
  page_sha256?: string | null;      // optional pre-computed hash

  refusal_statement_found?: boolean;
  refusal_statement_snippet?: string | null;

  business_relevance_explanation?: string | null;
  verification_method?: string | null;
  expires_at?: string | null;

  capture_agent: string;            // edge function slug, e.g. "acq-scrape-google-places"
}

export interface CaslCaptureResult {
  ok: boolean;
  evidence_id?: string;
  destination_normalized?: string;
  error?: string;
}

export function normalizeCaslDestination(
  destinationType: CaslDestinationType,
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const s = raw.toString().trim();
  if (!s) return null;
  if (destinationType === "email") return s.toLowerCase();
  // phone_sms — reduce to last 10 digits (NANP normalization)
  const digits = s.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Insert a casl_consent_evidence row. Idempotent per
 * (anchor, destination_type, destination_normalized, source_url) — the caller
 * should skip duplicates when re-scraping the same page.
 */
export async function captureCaslEvidence(
  sb: any,
  input: CaslCaptureInput,
): Promise<CaslCaptureResult> {
  const normalized = normalizeCaslDestination(input.destination_type, input.destination);
  if (!normalized) return { ok: false, error: "unnormalizable_destination" };

  if (!input.contractor_lead_id && !input.contractor_prospect_id && !input.outbound_company_id) {
    return { ok: false, error: "missing_anchor" };
  }

  const hash = input.page_sha256
    ?? (input.page_content_for_hash ? await sha256Hex(input.page_content_for_hash) : null);

  // Idempotency check — same anchor + destination + source_url → keep the newest, skip inserting a dup.
  const anchorFilter: Record<string, string> = {};
  if (input.contractor_lead_id) anchorFilter.contractor_lead_id = input.contractor_lead_id;
  if (input.contractor_prospect_id) anchorFilter.contractor_prospect_id = input.contractor_prospect_id;
  if (input.outbound_company_id) anchorFilter.outbound_company_id = input.outbound_company_id;

  let existing: { id: string } | null = null;
  try {
    let q = sb.from("casl_consent_evidence")
      .select("id")
      .eq("destination_type", input.destination_type)
      .eq("destination_normalized", normalized)
      .eq("is_valid", true);
    for (const [k, v] of Object.entries(anchorFilter)) q = q.eq(k, v);
    if (input.source_url) q = q.eq("source_url", input.source_url);
    const { data } = await q.limit(1).maybeSingle();
    existing = data ?? null;
  } catch { /* ignore */ }

  if (existing?.id) {
    return { ok: true, evidence_id: existing.id, destination_normalized: normalized };
  }

  const row = {
    contractor_lead_id: input.contractor_lead_id ?? null,
    contractor_prospect_id: input.contractor_prospect_id ?? null,
    outbound_company_id: input.outbound_company_id ?? null,
    destination_type: input.destination_type,
    destination_normalized: normalized,
    lawful_basis: input.lawful_basis,
    source_url: input.source_url ?? null,
    source_type: input.source_type ?? null,
    source_publisher: input.source_publisher ?? null,
    retrieved_at: input.retrieved_at ?? new Date().toISOString(),
    page_sha256: hash,
    refusal_statement_found: input.refusal_statement_found ?? false,
    refusal_statement_snippet: input.refusal_statement_snippet ?? null,
    business_relevance_explanation: input.business_relevance_explanation ?? null,
    verification_method: input.verification_method ?? "automated_scrape",
    expires_at: input.expires_at ?? null,
    is_valid: true,
    auto_captured: true,
    capture_agent: input.capture_agent,
  };

  const { data, error } = await sb.from("casl_consent_evidence")
    .insert(row)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  return { ok: true, evidence_id: data?.id, destination_normalized: normalized };
}

/**
 * Convenience wrapper for scrapers that just discovered a public business
 * profile (Google Places / directory / company website). Captures phone
 * + email in one call, only when the value looks valid.
 */
export async function captureScrapeEvidenceForProfile(
  sb: any,
  args: {
    contractor_lead_id?: string | null;
    contractor_prospect_id?: string | null;
    outbound_company_id?: string | null;
    phone?: string | null;
    email?: string | null;
    source_url: string;
    source_type: string;
    source_publisher: string;
    business_relevance_explanation: string;
    page_content_for_hash?: string;
    capture_agent: string;
  },
) {
  const out: { phone_evidence_id?: string; email_evidence_id?: string; errors: string[] } = { errors: [] };

  if (args.phone) {
    const r = await captureCaslEvidence(sb, {
      contractor_lead_id: args.contractor_lead_id ?? null,
      contractor_prospect_id: args.contractor_prospect_id ?? null,
      outbound_company_id: args.outbound_company_id ?? null,
      destination_type: "phone_sms",
      destination: args.phone,
      lawful_basis: "implicit_public_conspicuous",
      source_url: args.source_url,
      source_type: args.source_type,
      source_publisher: args.source_publisher,
      page_content_for_hash: args.page_content_for_hash,
      refusal_statement_found: false,
      business_relevance_explanation: args.business_relevance_explanation,
      verification_method: "automated_scrape",
      capture_agent: args.capture_agent,
    });
    if (r.ok) out.phone_evidence_id = r.evidence_id;
    else if (r.error) out.errors.push(`phone: ${r.error}`);
  }

  if (args.email) {
    const r = await captureCaslEvidence(sb, {
      contractor_lead_id: args.contractor_lead_id ?? null,
      contractor_prospect_id: args.contractor_prospect_id ?? null,
      outbound_company_id: args.outbound_company_id ?? null,
      destination_type: "email",
      destination: args.email,
      lawful_basis: "implicit_public_conspicuous",
      source_url: args.source_url,
      source_type: args.source_type,
      source_publisher: args.source_publisher,
      page_content_for_hash: args.page_content_for_hash,
      refusal_statement_found: false,
      business_relevance_explanation: args.business_relevance_explanation,
      verification_method: "automated_scrape",
      capture_agent: args.capture_agent,
    });
    if (r.ok) out.email_evidence_id = r.evidence_id;
    else if (r.error) out.errors.push(`email: ${r.error}`);
  }

  return out;
}

/**
 * Sender-side helper: invoke commercial-send-gate. Only ever call this for
 * commercial_outreach. Transactional / OTP / auth / service notifications
 * MUST bypass this and call Twilio through their own paths.
 */
export interface CommercialGateDecision {
  pass: boolean;
  blocked_reasons: string[];
  decisions: Array<{ check: string; result: string; detail?: string }>;
  evidence_id: string | null;
  destination_normalized?: string;
  lead_id?: string;
}

export async function callCommercialSendGate(args: {
  contractor_lead_id: string;
  destination_type: CaslDestinationType;
  destination: string;
  campaign_id?: string | null;
  sender_identity?: { name: string; unsubscribe_footer: boolean };
}): Promise<CommercialGateDecision> {
  const SUPABASE_URL = (globalThis as any).Deno?.env?.get?.("SUPABASE_URL");
  const SERVICE_ROLE = (globalThis as any).Deno?.env?.get?.("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return {
      pass: false,
      blocked_reasons: ["gate_env_missing"],
      decisions: [],
      evidence_id: null,
    };
  }

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/commercial-send-gate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify({
      contractor_lead_id: args.contractor_lead_id,
      destination_type: args.destination_type,
      destination: args.destination,
      message_purpose: "commercial_outreach",
      campaign_id: args.campaign_id ?? null,
      sender_identity: args.sender_identity ?? { name: "UNPRO", unsubscribe_footer: true },
    }),
  });

  const body = await resp.json().catch(() => ({}));
  return {
    pass: Boolean(body?.pass),
    blocked_reasons: Array.isArray(body?.blocked_reasons) ? body.blocked_reasons : [],
    decisions: Array.isArray(body?.decisions) ? body.decisions : [],
    evidence_id: body?.evidence_id ?? null,
    destination_normalized: body?.destination_normalized,
    lead_id: body?.lead_id,
  };
}
