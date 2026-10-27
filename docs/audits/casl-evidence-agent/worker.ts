// Proposed colocated module: enrich-official-website/batchPhoneCapture.ts.
// STAGED ONLY: backup integrity has not been verified for the new ledger.
import { captureFirstPartyPhone, phoneCaptureService, safeUrl } from "./caslFirstParty.ts";
import { normalizePhone } from "../_shared/normalizePhone.ts";

export const CAPTURE_LIMITS = { perRun: 2, perDay: 20, scan: 250, retryHours: 24, maxAttempts: 2 } as const;
const UNCONTACTED = new Set(["none", "new", "pending", "not_contacted", "not_started"]);
const NON_PROVIDER = /hotel|hôtel|aquatique|piscine|public facility|government|ville de|municipalit|gouvernement|fondation|organisme|aqua club|entraide|écocentre|ecocentre|ameublement|parc du/i;
export function candidate(p: any): { id: string; phone: string; domain: string } | null {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id ?? "")) return null;
  if (!p.business_name?.trim() || NON_PROVIDER.test(p.business_name) || p.do_not_contact !== false || p.suppression_reason || p.needs_review || p.blocked_reason || p.rejection_reason || p.dedupe_matched_id) return null;
  if (!UNCONTACTED.has(p.outreach_status) || !phoneCaptureService(p)) return null;
  // This is publication capture, not a mobile classification. Known NON-SMS destinations fail closed.
  if (["landline", "fixed", "voip", "toll_free", "invalid"].includes(String(p.phone_type ?? "").toLowerCase()) || p.phone_sms_capable === false) return null;
  const phone = normalizePhone(p.phone_e164);
  if (!phone.valid || !phone.normalized || phone.normalized !== p.phone_e164 || /^\+1(?:800|833|844|855|866|877|888)/.test(p.phone_e164)) return null;
  if (!/^https:\/\//i.test(p.website_url ?? "")) return null;
  try { return { id: p.id, phone: phone.normalized, domain: safeUrl(p.website_url).hostname.replace(/^www\./, "") }; } catch { return null; }
}

export function retryable(reason: string): boolean {
  // Only bounded transport/database unavailability retries; refusal, ambiguous
  // identity, DNS safety and missing publication require review, never a loop.
  return ["unreachable_or_redirect", "stale_content", "empty_page", "check_failed", "phone_evidence_capture_failed", "evidence_dedupe_unreadable"].includes(reason)
    || /^(?:timeout|connection_reset|connection_refused|socket_closed|TLS connection closed|The operation was aborted)/i.test(reason);
}

async function rpc(sb: any, name: string, args: Record<string, unknown>) {
  const { data, error } = await sb.rpc(name, args);
  if (error) throw new Error("capture_ledger_unavailable");
  return data;
}

// Keep the canonical capture helper unchanged. Only its evidence INSERT is
// routed into the lease-fenced transaction; the helper's exact row is preserved.
export function fencedClient(sb: any, run: string, prospect: string) {
  return {
    rpc: sb.rpc.bind(sb),
    from(table: string) {
      const original = sb.from(table);
      if (table !== "casl_consent_evidence") return original;
      return new Proxy(original, { get(target, prop) {
        if (prop === "insert") return (row: unknown) => ({ select: () => ({ maybeSingle: async () => {
          const { data, error } = await sb.rpc("persist_casl_phone_capture", { p_run: run, p_prospect: prospect, p_evidence: row });
          return { data: data ? { id: data } : null, error };
        } }) });
        const value = Reflect.get(target, prop); return typeof value === "function" ? value.bind(target) : value;
      } });
    },
  };
}

export async function runPhoneCaptureBatch(sb: any, io: Parameters<typeof captureFirstPartyPhone>[2], input: { dry_run: boolean; limit: number }) {
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > CAPTURE_LIMITS.perRun) throw new Error("invalid_batch_limit");
  const fields = "id,business_name,phone_e164,website_url,category_slug,trade,trade_category,do_not_contact,suppression_reason,outreach_status,needs_review,blocked_reason,rejection_reason,dedupe_matched_id,phone_type,phone_sms_capable";
  if (input.dry_run) {
    const { data, error } = await sb.from("contractor_prospects").select(fields).order("id").limit(CAPTURE_LIMITS.scan);
    if (error || !data) throw new Error("candidate_read_failed");
    return { dry_run: true, candidates: data.map(candidate).filter(Boolean).slice(0, input.limit), writes: 0, sent: 0, legal_consent_established: false };
  }
  const run = crypto.randomUUID();
  const state = await rpc(sb, "begin_casl_phone_capture_run", { p_run: run });
  if (!state.acquired) return { dry_run: false, status: state.reason, captured: 0, sent: 0, legal_consent_established: false };
  let results: any[] = [];
  try {
    if (!state.discovery_complete) {
      let q = sb.from("contractor_prospects").select(fields).order("id").limit(CAPTURE_LIMITS.scan);
      if (state.cursor) q = q.gt("id", state.cursor);
      const { data, error } = await q;
      if (error || !data) throw new Error("candidate_read_failed");
      await rpc(sb, "seed_casl_phone_capture_jobs", { p_run: run, p_candidates: data.map(candidate).filter(Boolean), p_cursor: data.at(-1)?.id ?? state.cursor, p_complete: data.length < CAPTURE_LIMITS.scan });
    }
    const jobs = await rpc(sb, "claim_casl_phone_capture_jobs", { p_run: run, p_limit: input.limit });
    for (const job of jobs ?? []) {
      let evidence: string | null = null, reason = "check_failed", retry = false;
      try {
        const result = await captureFirstPartyPhone(fencedClient(sb, run, job.contractor_prospect_id), job.contractor_prospect_id, io, false);
        evidence = result.evidence_id; reason = result.observation.reason;
        retry = !evidence && retryable(reason);
      } catch (e) {
        const raw = e instanceof Error ? e.message : "check_failed";
        retry = retryable(raw);
        // Do not persist raw transport errors containing URLs/addresses.
        reason = /^[a-z_]{3,100}$/.test(raw) ? raw : "transport_failed_requires_review";
      }
      await rpc(sb, "finish_casl_phone_capture_job", { p_run: run, p_prospect: job.contractor_prospect_id, p_evidence: evidence, p_reason: reason, p_retry: retry });
      results.push({ prospect_id: job.contractor_prospect_id, evidence_id: evidence, reason });
    }
    return { dry_run: false, results, captured: results.filter(r => r.evidence_id).length, sent: 0, human_review_required: true, legal_consent_established: false };
  } finally {
    await rpc(sb, "end_casl_phone_capture_run", { p_run: run });
  }
}