// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as fts from "../../supabase/staged/first-touch-score/firstTouchScore";
import { validateSmsBody } from "../../supabase/functions/_shared/smsGreeting";
import { smsWithLink } from "../../supabase/functions/_shared/outreachLink";
import { assertCommercialOutreachAllowed } from "../../supabase/functions/_shared/outreachGate";
import { firstTouchScoreSms } from "../../supabase/functions/_shared/offerCopy";

// Synthetic identities only.
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-11-19T15:00:00Z");
const row = (o: Partial<fts.AuditScoreRow> = {}): fts.AuditScoreRow => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  prospect_id: A,
  source: "outreach_first_touch",
  status: "completed",
  readiness_score: 62,
  completed_at: "2026-11-10T12:00:00Z",
  baseline: { matched: { prospect_id: A } },
  ...o,
});

describe("verified first-touch score — only the exact, recent, anchored UNPRO score", () => {
  it("existing score: quoted with exact value and date", () => {
    const d = fts.resolveFirstTouchScore(A, [row()], NOW);
    expect(d).toMatchObject({ ok: true, score: 62 });
    const body = smsWithLink(fts.verifiedScoreFirstTouchSms("Toiture Synthétique", d as fts.VerifiedScore), "https://unpro.ca/unpro/audit/tok");
    expect(body).toContain("votre score de visibilité IA UNPRO est de 62/100");
    expect(body).toContain("calcul UNPRO du 10 novembre 2026");
    expect(body).toContain("https://unpro.ca/unpro/audit/tok");
    expect(body).toContain("STOP");
    expect(body).not.toMatch(fts.OVERPROMISE_RE);
    expect(validateSmsBody(body, { commercial: true }).ok).toBe(true);
  });
  it("missing score: no quotable value", () => {
    expect(fts.resolveFirstTouchScore(A, [], NOW)).toEqual({ ok: false, reason: "missing" });
  });
  it("stale score (> 30 days) is refused", () => {
    expect(fts.resolveFirstTouchScore(A, [row({ completed_at: "2026-09-26T03:31:35Z" })], NOW)).toEqual({ ok: false, reason: "stale" });
  });
  it("another company's score is never attributed", () => {
    expect(fts.resolveFirstTouchScore(A, [row({ prospect_id: B, baseline: { matched: { prospect_id: B } } })], NOW)).toEqual({ ok: false, reason: "wrong_prospect" });
    expect(fts.resolveFirstTouchScore(A, [row({ baseline: { matched: { prospect_id: B } } })], NOW)).toEqual({ ok: false, reason: "unanchored" });
  });
  it("name-resolved public audits and other scores are not quotable", () => {
    expect(fts.resolveFirstTouchScore(A, [row({ source: "public_audit_ia" })], NOW)).toEqual({ ok: false, reason: "untrusted_source" });
    expect(fts.resolveFirstTouchScore(A, [row({ readiness_score: 101 })], NOW)).toEqual({ ok: false, reason: "invalid_score" });
    expect(fts.resolveFirstTouchScore(A, [row({ readiness_score: "62" as unknown })], NOW)).toEqual({ ok: false, reason: "invalid_score" });
  });
  it("precompute is accepted only when the engine anchored the exact prospect", () => {
    const resp = { ok: true, audit_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", readiness_score: 47, generated_at: "2026-11-19T14:59:00Z", baseline: { matched: { prospect_id: A } } };
    expect(fts.acceptPrecomputedAudit(A, resp, NOW)).toMatchObject({ ok: true, score: 47, source: "outreach_precompute" });
    expect(fts.acceptPrecomputedAudit(A, { ...resp, baseline: { matched: { prospect_id: B } } }, NOW).ok).toBe(false);
    expect(fts.acceptPrecomputedAudit(A, { ok: false }, NOW).ok).toBe(false);
  });
});

// ---- Patched send-verified-batch, reconstructed in isolation (dry_run). ----
function patched(path: string, patch: string) {
  const lines = readFileSync(path, "utf8").split("\n");
  const section = patch.split(`--- a/${path}\n`)[1]?.split("\ndiff --git ")[0];
  if (!section) throw new Error("missing staged section");
  let offset = 0;
  for (const hunk of section.split(/(?=^@@ )/m).slice(1)) {
    const h = /^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@.*\n/.exec(hunk);
    if (!h) throw new Error("invalid hunk");
    const body = hunk.slice(h[0].length).split("\n").filter((l) => /^[ +\-]/.test(l));
    const before = body.filter((l) => l[0] !== "+").map((l) => l.slice(1));
    const after = body.filter((l) => l[0] !== "-").map((l) => l.slice(1));
    const start = Number(h[1]) - 1 + offset;
    if (lines.slice(start, start + before.length).join("\n") !== before.join("\n")) throw new Error("stale staged patch");
    lines.splice(start, before.length, ...after);
    offset += after.length - before.length;
  }
  return lines.join("\n");
}
function harness(audits: fts.AuditScoreRow[]) {
  let handler: any;
  const writes: unknown[] = [];
  const sends = vi.fn();
  const fetch = vi.fn();
  const prospect = { id: A, business_name: "Toiture Synthétique", phone_e164: "+14502345678", phone_line_type: "mobile", sms_eligibility_tier: "A", outreach_status: "none", verification_status: "verified", data_quality_score: 90, website_url: "https://synthetique.test/" };
  const sb = { rpc: vi.fn(async () => { writes.push("rpc"); return { data: null, error: null }; }), from: (table: string) => {
    const q: any = {};
    for (const m of ["select", "eq", "gte", "or", "order", "limit", "in", "not", "ilike"]) q[m] = () => q;
    for (const m of ["insert", "update", "upsert", "delete"]) q[m] = (v: unknown) => { writes.push({ table, v }); return q; };
    q.maybeSingle = async () => ({ data: table === "system_flags" ? { value: true } : { gated: false, operational_score: 95 }, error: null });
    q.then = (r: any) => Promise.resolve({ data: table === "verified_contractor_prospects" ? [prospect] : table === "ai_recommendation_audits" ? audits : [], error: null }).then(r);
    return q;
  } };
  const src = patched("supabase/functions/send-verified-batch/index.ts", readFileSync("supabase/staged/first-touch-score/first-touch-score.patch", "utf8"));
  const ctx: any = { exports: {}, crypto, Response, Request, URL, Date, setTimeout, clearTimeout, AbortController, AbortSignal, TextDecoder, TextEncoder, console, fetch,
    Deno: { env: { get: (k: string) => (k === "SUPABASE_SERVICE_ROLE_KEY" ? "synthetic-service" : k === "SUPABASE_URL" ? "https://synthetic.test" : undefined) }, serve: (f: any) => { handler = f; } },
    createClient: () => sb, assertCommercialOutreachAllowed, sendSms: sends, logPipelineEvent: vi.fn(() => writes.push("log")), sanitizeEmail: (e: any) => e,
    buildOutreachUrl: (u: string) => u, smsWithLink, firstTouchScoreSms, ...fts };
  runInNewContext(ts.transpileModule(src.replace(/^import[\s\S]*?;\n/gm, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, ctx);
  const run = async () => (await handler(new Request("https://synthetic.test", { method: "POST", headers: { Authorization: "Bearer synthetic-service" }, body: JSON.stringify({ dry_run: true, prospect_ids: [A] }) }))).json();
  return { run, writes, sends, fetch };
}

describe("staged send-verified-batch dry_run transmits nothing", () => {
  it("previews the exact verified score without sending, writing or precomputing", async () => {
    const h = harness([row({ completed_at: "2026-11-18T12:00:00Z" })]);
    const r = await h.run();
    expect(r.dry_run).toBe(true);
    expect(r.eligible[0].first_touch_score).toMatchObject({ status: "verified", score: 62 });
    expect(r.eligible[0].sms_preview).toContain("est de 62/100");
    expect(h.sends).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(0);
  });
  it("stale or foreign score → truthful copy without any score claim", async () => {
    const h = harness([row({ completed_at: "2026-08-25T00:00:00Z" }), row({ prospect_id: B })]);
    const r = await h.run();
    expect(r.eligible[0].first_touch_score.status).not.toBe("verified");
    expect(r.eligible[0].sms_preview).not.toMatch(/\/100|score|analys/i);
    expect(r.eligible[0].sms_preview).toContain("Voyez la proposition pour votre entreprise");
    expect(h.sends).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(0);
  });
});
