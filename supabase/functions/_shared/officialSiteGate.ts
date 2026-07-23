/**
 * officialSiteGate — canonical decision helper for classifying whether a
 * contractor lead may be tagged "missing_phone/email/contact" as a TERMINAL
 * state, or whether an official-website crawl is still required before we
 * are allowed to say the contact does not exist.
 *
 * This module is imported by:
 *   - _shared/leadValidation.ts   (avoids finalizing missing_phone prematurely)
 *   - _shared/outreachEligibility.ts (returns enrichment_pending vs missing_*)
 *   - any acquisition worker that classifies leads
 *
 * The rule (see spec §A):
 *   - initial source lacks phone or email AND a usable official domain exists
 *     AND no terminal crawl on record   →  official_site_enrichment_required
 *   - crawl currently queued/running/retryable                → pending, NOT missing
 *   - complete_with_contact                                   → contact populated
 *   - complete_no_contact                                     → missing_* is allowed
 *   - no_official_domain / blocked                            → terminal separate reason
 *
 * NOTHING in this module implies consent. Consent is enforced by
 * commercial-send-gate + casl_consent_evidence.
 */

// Kept as strings (no dep on external enums) so client + edge can share.
export type OfficialSiteState =
  | "official_site_enrichment_required"
  | "official_site_enrichment_queued"
  | "official_site_enrichment_running"
  | "official_site_enrichment_retryable"
  | "complete_with_contact"
  | "complete_no_contact"
  | "no_official_domain"
  | "blocked";

export type OfficialSiteStatusRaw = string | null | undefined;

export interface OfficialSiteGateInput {
  phone?: string | null;
  phone_e164?: string | null;
  email?: string | null;
  website_url?: string | null;
  official_domain?: string | null;
  official_site_status?: OfficialSiteStatusRaw;
  official_site_checked_at?: string | null;
}

/** Directories/social hosts that never count as an "official" domain. */
const NON_OFFICIAL_HOST_SUFFIXES = [
  "facebook.com","instagram.com","linkedin.com","twitter.com","x.com","youtube.com",
  "yelp.ca","yelp.com","pagesjaunes.ca","yellowpages.ca","homestars.com",
  "soumissionrenovation.ca","houzz.com","kijiji.ca","wixsite.com",
];

/** Cheap URL check — mirrors resolveOfficialDomain without re-importing it. */
export function hasUsableOfficialDomain(raw?: string | null): boolean {
  if (!raw) return false;
  let host: string;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    host = u.hostname.toLowerCase().replace(/^www\./, "");
  } catch { return false; }
  if (!host || !host.includes(".")) return false;
  return !NON_OFFICIAL_HOST_SUFFIXES.some(s => host === s || host.endsWith(`.${s}`));
}

export function hasContact(l: OfficialSiteGateInput): boolean {
  return !!(l.phone || l.phone_e164 || l.email);
}

/** Terminal statuses on the crawl side. `no_official_domain` and `blocked` too. */
const TERMINAL_STATUSES = new Set([
  "complete_with_contact","complete_no_contact","no_official_domain","blocked",
]);
const PENDING_STATUSES = new Set([
  "queued","crawling","running","retryable","required","official_site_enrichment_required",
]);

/**
 * Pure classifier. Returns the canonical state of a lead vis-à-vis the
 * official-site enrichment gate. Never mutates.
 */
export function classifyOfficialSiteState(l: OfficialSiteGateInput): OfficialSiteState {
  const s = (l.official_site_status ?? "").toString();

  if (s === "complete_with_contact") return "complete_with_contact";
  if (s === "complete_no_contact")   return "complete_no_contact";
  if (s === "no_official_domain")    return "no_official_domain";
  if (s === "blocked")               return "blocked";
  if (s === "retryable")             return "official_site_enrichment_retryable";
  if (s === "crawling" || s === "running") return "official_site_enrichment_running";
  if (s === "queued")                return "official_site_enrichment_queued";

  // No terminal status recorded yet.
  if (hasContact(l)) {
    // Contact already known from initial source. Enrichment not required to
    // clear missing_*, but crawl may still run later for provenance.
    return "complete_with_contact";
  }
  if (!hasUsableOfficialDomain(l.official_domain ?? l.website_url ?? null)) {
    return "no_official_domain";
  }
  return "official_site_enrichment_required";
}

/**
 * True when the record must NOT be finalized as missing_phone / missing_email /
 * missing_contact because an official-site crawl is required, queued, running,
 * or retryable and might still surface a valid contact.
 */
export function isEnrichmentPending(state: OfficialSiteState): boolean {
  return state === "official_site_enrichment_required"
      || state === "official_site_enrichment_queued"
      || state === "official_site_enrichment_running"
      || state === "official_site_enrichment_retryable";
}

/** True when missing_* is a legitimate terminal classification. */
export function allowsFinalMissing(state: OfficialSiteState): boolean {
  return state === "complete_no_contact"
      || state === "no_official_domain"
      || state === "blocked";
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Idempotent enqueue helper — invokes the enrich-official-website edge fn   */
/* fire-and-forget. Never throws. Skips if a recent (<15m) or terminal run   */
/* already exists on this canonical domain for the same lead.                */

// Deno-only side-effect helper; kept in same file so the classifier stays
// browser-safe (browser bundles never import an enqueue call).
export async function enqueueOfficialSiteCrawlIfNeeded(
  // deno-lint-ignore no-explicit-any
  sb: any,
  lead: { id: string; official_domain?: string | null; website_url?: string | null },
  opts: { supabaseUrl?: string; serviceKey?: string; minGapMs?: number } = {},
): Promise<{ enqueued: boolean; reason: string }> {
  try {
    const domain = lead.official_domain ?? lead.website_url ?? null;
    if (!hasUsableOfficialDomain(domain)) return { enqueued: false, reason: "no_official_domain" };

    const gap = opts.minGapMs ?? 15 * 60 * 1000;
    const since = new Date(Date.now() - gap).toISOString();
    const { data: recent } = await sb
      .from("official_site_crawl_runs")
      .select("id,status,created_at")
      .eq("contractor_lead_id", lead.id)
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) return { enqueued: false, reason: "recent_run_exists" };

    const { data: terminal } = await sb
      .from("official_site_crawl_runs")
      .select("id,status")
      .eq("contractor_lead_id", lead.id)
      .in("status", ["complete_with_contact","complete_no_contact","no_official_domain","blocked"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (terminal && terminal.length > 0) return { enqueued: false, reason: `terminal:${terminal[0].status}` };

    const url = opts.supabaseUrl
      ?? (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") : undefined);
    const key = opts.serviceKey
      ?? (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") : undefined);
    if (!url || !key) return { enqueued: false, reason: "no_backend_credentials" };

    // Mark as queued (idempotent update).
    await sb.from("contractor_leads")
      .update({ official_site_status: "queued" })
      .eq("id", lead.id)
      .or("official_site_status.is.null,official_site_status.eq.required,official_site_status.eq.retryable");

    // Fire-and-forget invocation.
    fetch(`${url}/functions/v1/enrich-official-website`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ lead_id: lead.id }),
    }).catch(() => {/* swallow */});

    return { enqueued: true, reason: "enqueued" };
  } catch (e) {
    return { enqueued: false, reason: `error:${(e as Error).message}` };
  }
}

// Ambient Deno declaration for cross-runtime type-check.
// deno-lint-ignore no-explicit-any
declare const Deno: any;
