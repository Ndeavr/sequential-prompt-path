/**
 * Agent autonome de collecte de preuves CASL : PAS un consentement présumé.
 * L'agent vérifie les publications PREMIÈRE PARTIE sans demander au fondateur
 * de chercher chaque site. Les cas non probants sont écartés, jamais approuvés.
 *
 * Aucune levée de OUTREACH_ENABLED, aucune signature reviewer_id, aucun SMS,
 * aucun courriel, aucun appel Twilio Lookup et aucun paiement.
 */
import { captureFirstPartyPhone, phoneCaptureService } from "./caslFirstParty.ts";
import { normalizePhone } from "../_shared/normalizePhone.ts";

export const AUTO_CASL_BATCH = { maxPerRun: 2, maxPerDay: 20, maxScan: 1000 } as const;
const UNCONTACTED = new Set(["none", "new", "pending", "not_contacted", "not_started"]);
const BAD_LINE = new Set(["landline", "fixed", "voip", "toll_free", "invalid"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_HTTPS = /^https:\/\//i;

export type Candidate = {
  id?: string; business_name?: string | null; website_url?: string | null;
  phone_e164?: string | null; trade?: string | null; trade_category?: string | null;
  category_slug?: string | null; do_not_contact?: boolean | null;
  suppression_reason?: string | null; outreach_status?: string | null;
  needs_review?: boolean | null; blocked_reason?: string | null;
  rejection_reason?: string | null; dedupe_matched_id?: string | null;
  phone_type?: string | null; phone_sms_capable?: boolean | null;
};

export function machineCaptureCandidate(p: Candidate): boolean {
  if (!UUID.test(p.id ?? "") || !p.business_name?.trim() || !p.phone_e164 || !p.website_url) return false;
  if (!PUBLIC_HTTPS.test(p.website_url) || p.do_not_contact !== false) return false;
  if (p.suppression_reason || p.needs_review || p.blocked_reason || p.rejection_reason || p.dedupe_matched_id) return false;
  if (!UNCONTACTED.has(p.outreach_status ?? "")) return false;
  if (BAD_LINE.has(String(p.phone_type ?? "").toLowerCase()) || p.phone_sms_capable === false) return false;
  if (!phoneCaptureService(p)) return false; // Never auto-capture regulated construction categories.
  const phone = normalizePhone(p.phone_e164);
  return phone.valid && phone.normalized === p.phone_e164
    && !/^\+1(?:800|833|844|855|866|877|888)/.test(p.phone_e164);
}

export type BatchIO = Parameters<typeof captureFirstPartyPhone>[2];

export async function runAgentEvidenceBatch(
  sb: any,
  io: BatchIO,
  input: { dry_run: boolean; limit: number },
): Promise<Record<string, unknown>> {
  const { limit, dry_run } = input;
  if (!Number.isInteger(limit) || limit < 1 || limit > AUTO_CASL_BATCH.maxPerRun) {
    throw new Error("invalid_agent_batch_limit");
  }
  // Separate safe switch, NEVER the commercial outreach switch.
  const { data: flag, error: flagErr } = await sb.from("system_flags")
    .select("value").eq("key", "AUTO_CASL_EVIDENCE_CAPTURE_ENABLED").maybeSingle();
  if (flagErr || !flag || flag.value !== true) {
    return { ok: true, blocked: true, reason: "auto_evidence_capture_disabled", dry_run, checked: 0, captured: 0, sent: 0 };
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  // UTC midnight precedes Toronto midnight: a conservative overcount,
  // including on DST transitions; it cannot exceed the daily capture cap.
  const startUTC = `${today}T00:00:00.000Z`;
  // This read-only quota is a SECOND line of defense. The controlled worker
  // must be invoked sequentially; do not run concurrent commercial batches.
  const { count, error: quotaErr } = await sb.from("casl_consent_evidence")
    .select("id", { count: "exact", head: true }).eq("capture_agent", "enrich-official-website")
    .eq("destination_type", "phone_sms").gte("created_at", startUTC);
  if (quotaErr || typeof count !== "number" || !Number.isFinite(count)) throw new Error("agent_capture_quota_unavailable");
  const allowance = Math.max(0, AUTO_CASL_BATCH.maxPerDay - count);
  if (!allowance) return { ok: true, blocked: true, reason: "daily_capture_cap", dry_run, checked: 0, captured: 0, sent: 0 };

  const fields = "id,business_name,website_url,phone_e164,trade,trade_category,category_slug,do_not_contact,suppression_reason,outreach_status,needs_review,blocked_reason,rejection_reason,dedupe_matched_id,phone_type,phone_sms_capable";
  const { data: prospects, error: readErr } = await sb.from("contractor_prospects")
    .select(fields).eq("do_not_contact", false).not("website_url", "is", null)
    .not("phone_e164", "is", null).order("created_at", { ascending: true }).limit(AUTO_CASL_BATCH.maxScan);
  if (readErr || !prospects) throw new Error("agent_candidates_unreadable");
  // A declined/ambiguous site must not be recrawled every 15 minutes.
  // Reuse the existing agent log for a 24h source-check cooldown; no new DB.
  const { data: priorChecks, error: historyErr } = await sb.from("agent_logs")
    .select("metadata").eq("agent_name", "casl-firstparty-evidence-agent")
    .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
    .order("created_at", { ascending: false }).limit(1000);
  if (historyErr || !priorChecks) throw new Error("agent_recent_checks_unreadable");
  const attempted = new Set<string>();
  for (const row of priorChecks) {
    const ids = row?.metadata?.candidate_ids;
    if (Array.isArray(ids)) for (const id of ids) if (typeof id === "string") attempted.add(id);
  }
  const candidates = prospects.filter(machineCaptureCandidate).filter((p: Candidate) => !attempted.has(p.id ?? ""));
  const ids = candidates.map((c: Candidate) => c.id as string);
  const { data: prior, error: priorErr } = ids.length
    ? await sb.from("casl_consent_evidence").select("contractor_prospect_id")
      .in("contractor_prospect_id", ids).eq("destination_type", "phone_sms")
      .eq("source_type", "company_website")
    : { data: [], error: null };
  if (priorErr || !prior) throw new Error("agent_evidence_dedupe_unavailable");
  const seen = new Set(prior.map((x: any) => x.contractor_prospect_id));
  const selected = candidates.filter((c: Candidate) => !seen.has(c.id)).slice(0, Math.min(limit, allowance));

  if (dry_run) return {
    ok: true, dry_run: true, source_checked: 0, candidate_count: candidates.length,
    selected_count: selected.length, captured: 0, sent: 0,
    human_signature_claimed: false, legal_consent_established: false,
  };

  let checked = 0, captured = 0;
  const outcomes: Record<string, number> = {};
  for (const p of selected) {
    checked++;
    try {
      const r = await captureFirstPartyPhone(sb, p.id, io, false);
      if (r.evidence_id) captured++;
      const reason = String(r.observation?.reason ?? "unknown").slice(0, 80);
      outcomes[reason] = (outcomes[reason] ?? 0) + 1;
    } catch (e) {
      // Do not emit source URLs, phone numbers, or personal contact details.
      const code = e instanceof Error && /^[a-z_]{3,70}$/.test(e.message) ? e.message : "capture_failed";
      outcomes[code] = (outcomes[code] ?? 0) + 1;
    }
  }
  const { error: logErr } = await sb.from("agent_logs").insert({
    agent_name: "casl-firstparty-evidence-agent",
    log_type: captured ? "info" : "warning",
    message: `Agent CASL : ${checked} source(s) vérifiée(s), ${captured} preuve(s) collectée(s); aucun envoi ni consentement inventé.`,
    metadata: { candidate_ids: selected.map((p: Candidate) => p.id), checked, captured, outcomes, legal_consent_established: false, sent: 0 },
  });
  return {
    ok: !logErr, dry_run: false, checked, captured, outcomes,
    audit_logged: !logErr, sent: 0, legal_consent_established: false,
    human_signature_claimed: false,
  };
}
