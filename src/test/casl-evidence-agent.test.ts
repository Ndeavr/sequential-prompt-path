// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { normalizePhone } from "../../supabase/functions/_shared/normalizePhone";
import { normalizeServiceCategory } from "../../supabase/functions/_shared/localServiceCategories";

const id = "11111111-1111-4111-8111-111111111111";
const source = readFileSync("docs/audits/casl-evidence-agent/worker.ts", "utf8");
function harness() {
  const captureFirstPartyPhone = vi.fn(async () => ({ evidence_id: id, observation: { reason: "publication_observed_human_review_required" } }));
  const ctx: any = { exports: {}, crypto, URL, normalizePhone, captureFirstPartyPhone,
    phoneCaptureService: (p: any) => { const slug = normalizeServiceCategory(p.category_slug ?? p.trade); return slug === "lavage-de-vitres" ? slug : null; },
    safeUrl: (s: string) => { const u = new URL(s); if (u.protocol !== "https:" || u.username || /^[\d.]+$/.test(u.hostname)) throw Error("unsafe_source"); return u; },
  };
  runInNewContext(ts.transpileModule(source.replace(/^import[^\n]*\n/gm, ""), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  return { m: ctx.exports, capture: captureFirstPartyPhone };
}
const prospect = { id, business_name: "Synthetic Windows", trade: "Lavage de vitres", website_url: "https://synthetic.test/", phone_e164: "+14502345678", do_not_contact: false, outreach_status: "not_started" };
describe("capture-ledger migration accepted by the Cloud migration validator", () => {
  const migration = readFileSync("docs/migrations-staged/20261027_casl_phone_capture_jobs.sql", "utf8");
  it("initializes exactly one disabled control row using INSERT SELECT, never INSERT VALUES", () => {
    expect(migration).toMatch(/INSERT INTO public\.casl_phone_capture_jobs\(status, enabled, daily_attempts, run_attempts\)\s*SELECT 'control', false, 0, 0\s*WHERE NOT EXISTS\s*\(/);
    expect(migration).not.toMatch(/INSERT INTO public\.casl_phone_capture_jobs\(status\) VALUES/i);
    expect(migration).toMatch(/ON CONFLICT DO NOTHING;/);
    expect((migration.match(/INSERT INTO public\.casl_phone_capture_jobs/g) || []).length).toBe(1);
  });
  it("keeps service-only permission, safe default and per-run/day quota", () => {
    expect(migration).toContain("enabled boolean NOT NULL DEFAULT false");
    expect(migration).toContain("daily_attempts integer NOT NULL DEFAULT 0 CHECK (daily_attempts BETWEEN 0 AND 20)");
    expect(migration).toContain("run_attempts integer NOT NULL DEFAULT 0 CHECK (run_attempts BETWEEN 0 AND 2)");
    expect(migration).toContain("ALTER TABLE public.casl_phone_capture_jobs ENABLE ROW LEVEL SECURITY");
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.begin_casl_phone_capture_run/);
    expect(migration).toMatch(/TO service_role;/);
  });
});

describe("bounded pending-evidence agent", () => {
  it("has concrete founder crawl limits, not SMS quotas", () => { expect(harness().m.CAPTURE_LIMITS.perRun).toBe(2); expect(harness().m.CAPTURE_LIMITS.perDay).toBe(20); expect(harness().m.CAPTURE_LIMITS.maxAttempts).toBe(2); });
  it("allows unknown mobile only as publication, never changes line type", () => { const p = { ...prospect }; expect(harness().m.candidate(p)?.id).toBe(id); expect(p).not.toHaveProperty("has_mobile"); });
  it.each([{ phone_type: "landline" }, { phone_sms_capable: false }, { trade: "Toiture" }, { do_not_contact: true }, { outreach_status: "sent" }, { dedupe_matched_id: id }, { needs_review: true }, { phone_e164: "+18002345678" }, { website_url: "http://synthetic.test" }, { website_url: "https://127.0.0.1" }, { id: "malformed" }])("refuses unsafe candidate %j", patch => { expect(harness().m.candidate({ ...prospect, ...patch })).toBeNull(); });
  it("dry preview performs no RPC, crawl or writes", async () => {
    const h = harness(), rpc = vi.fn(); const q: any = { select: () => q, order: () => q, limit: async () => ({ data: [prospect], error: null }) };
    const result = await h.m.runPhoneCaptureBatch({ from: () => q, rpc }, {}, { dry_run: true, limit: 2 });
    expect(result.candidates).toHaveLength(1); expect(result.writes).toBe(0); expect(rpc).not.toHaveBeenCalled(); expect(h.capture).not.toHaveBeenCalled(); expect(result.sent).toBe(0);
  });
  it.each([0, 3, 20, 1.5])("rejects batch limit %s", async limit => { await expect(harness().m.runPhoneCaptureBatch({}, {}, { dry_run: false, limit })).rejects.toThrow("invalid_batch_limit"); });
  it.each(["solicitation_refused", "unsafe_dns", "dns_changed", "invalid_sms_destination", "service_fit_requires_review", "company_or_service_ambiguous", "exact_phone_not_visible"])("never retries permanent reason %s", reason => { expect(harness().m.retryable(reason)).toBe(false); });
  it("permits only delayed ledger retry for transient transport failure", () => { expect(harness().m.retryable("connection_reset")).toBe(true); });
  it("paused control exits without any capture", async () => { const h = harness(); const r = await h.m.runPhoneCaptureBatch({ rpc: async () => ({ data: { acquired: false, reason: "paused" }, error: null }) }, {}, { dry_run: false, limit: 2 }); expect(h.capture).not.toHaveBeenCalled(); expect(r.status).toBe("paused"); });
  it("routes exact evidence row into fenced persistence without reviewer", async () => {
    const h = harness(), rpc = vi.fn(async () => ({ data: id, error: null })), row = { contractor_prospect_id: id, auto_captured: true };
    const client = h.m.fencedClient({ rpc, from: () => ({}) }, id, id);
    const result = await client.from("casl_consent_evidence").insert(row).select("id").maybeSingle();
    expect(rpc).toHaveBeenCalledWith("persist_casl_phone_capture", { p_run: id, p_prospect: id, p_evidence: row }); expect(result.data.id).toBe(id); expect(row).not.toHaveProperty("reviewer_id");
  });
  it("crashed capture releases single-flight lease", async () => {
    const h = harness(); h.capture.mockRejectedValueOnce(Error("connection_reset"));
    const calls: any[] = [];
    const sb = { rpc: async (name: string, args: any) => { calls.push([name,args]); return { data: name === "begin_casl_phone_capture_run" ? { acquired: true, discovery_complete: true } : name === "claim_casl_phone_capture_jobs" ? [{ contractor_prospect_id: id }] : null, error: null }; }, from: () => ({}) };
    const result = await h.m.runPhoneCaptureBatch(sb, {}, { dry_run: false, limit: 1 });
    expect(calls.find(c => c[0] === "finish_casl_phone_capture_job")[1].p_retry).toBe(true); expect(calls.at(-1)[0]).toBe("end_casl_phone_capture_run"); expect(result.captured).toBe(0); expect(result.sent).toBe(0); expect(result.legal_consent_established).toBe(false);
  });
});