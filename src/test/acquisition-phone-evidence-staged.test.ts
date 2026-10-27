// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { normalizePhone } from "../../supabase/functions/_shared/normalizePhone";
import { normalizeCaslDestination, sha256Hex } from "../../supabase/functions/_shared/caslEvidence";
import { resolveOfficialDomain, parseRobots, isAllowedByRobots, UNPRO_USER_AGENT } from "../../supabase/functions/_shared/officialSiteCrawler";
import { normalizeServiceCategory } from "../../supabase/functions/_shared/localServiceCategories";
import { assertCommercialOutreachAllowed } from "../../supabase/functions/_shared/outreachGate";

// Active source (patch now applied); kept name for history.
function proposed(path: string) { return readFileSync(path, "utf8"); }
function _unusedStaged(patch: string, path: string) {
  const lines = readFileSync(path, "utf8").split("\n");
  const section = patch.split(`--- a/${path}\n`)[1]?.split("\n--- a/")[0];
  if (!section) throw new Error("missing staged section");
  let offset = 0;
  const hunks = section.split(/(?=^@@ )/m).slice(1);
  for (const hunk of hunks) {
    const header = /^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@.*\n/.exec(hunk);
    if (!header) throw new Error("invalid hunk");
    const body = hunk.slice(header[0].length).split("\n").filter(l => /^[ +\-]/.test(l));
    const before = body.filter(l => l[0] !== "+").map(l => l.slice(1));
    const after = body.filter(l => l[0] !== "-").map(l => l.slice(1));
    const start = Number(header[1]) - 1 + offset;
    if (lines.slice(start, start + before.length).join("\n") !== before.join("\n")) throw new Error("stale staged patch");
    lines.splice(start, before.length, ...after); offset += after.length - before.length;
  }
  return lines.join("\n");
}
function load(source: string, extras: Record<string, unknown>) {
  const context: any = { exports: {}, crypto, Response, Request, URL, Date, setTimeout, clearTimeout, AbortController, TextDecoder, TextEncoder, console, ...extras };
  runInNewContext(ts.transpileModule(source.replace(/^import[\s\S]*?;\n/gm, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context;
}
const id = "11111111-1111-4111-8111-111111111111";
const company = { id, business_name: "Synthetic Cleaning", website_url: "https://synthetic-cleaning.test/", phone_e164: "+14502345678", category_slug: null, trade: "Lavage de vitres", outreach_status: "not_started", do_not_contact: false };
const document = '<h1>Synthetic Cleaning</h1><p>Lavage de vitres 450-234-5678</p><a href="/contact">Contact</a><a href="/privacy">Politique</a>';
function moduleHarness(options: Record<string, any> = {}) {
  const writes: any[] = []; const capture = vi.fn(async (_sb, input) => { writes.push(input); return { ok: true, evidence_id: id }; });
  const m = load(proposed("supabase/functions/enrich-official-website/caslFirstParty.ts"), { normalizePhone, normalizeCaslDestination, sha256Hex, captureCaslEvidence: capture, resolveOfficialDomain, parseRobots, isAllowedByRobots, UNPRO_USER_AGENT, normalizeServiceCategory }).exports;
  const fetch = vi.fn(async (u: string) => new Response(u.endsWith("robots.txt") ? "User-agent: *\nDisallow:" : options.html ?? document, { headers: { "content-type": u.endsWith("robots.txt") ? "text/plain" : "text/html" } }));
  (fetch as any)[m.PINNED_TRANSPORT] = true;
  const io = { fetch, resolve: async () => ["93.184.216.34"] };
  const sb = { rpc: vi.fn(async () => ({ data: options.suppressed ?? false, error: null })), from: (table: string) => {
    const q: any = {};
    for (const name of ["select", "eq", "in", "limit"]) q[name] = () => q;
    q.maybeSingle = async () => ({ data: { ...company, ...options.company }, error: null });
    q.then = (resolve: any) => Promise.resolve({ data: table === "contractor_prospects" ? (options.duplicates ?? [{ id }]) : table === "sms_opt_outs" ? (options.opted ? [{}] : []) : ("existing" in options ? options.existing : []), error: (table === "casl_consent_evidence" && "existing" in options && options.existing === null ? { message: "x" } : null) }).then(resolve);
    return q;
  } };
  return { m, io, sb, writes, capture, fetch };
}
describe("staged first-party phone evidence — no consent or provider", () => {
  it("dry run observes an exact visible phone, hashes sources and never writes", async () => {
    const h = moduleHarness(); const r = await h.m.captureFirstPartyPhone(h.sb, id, h.io, true);
    expect(r.observation.status).toBe("machine_verified"); expect(r.observation.pages[0].page_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(r.legal_consent_established).toBe(false); expect(r.observation.policy.auto_eligibility_enabled).toBe(false); expect(r.sent).toBe(0); expect(h.writes).toHaveLength(0);
  });
  it("recognizes Clean Vents-style CALL US NOW first-party publication without /contact or privacy anchors", async () => {
    const html = '<h1>Synthetic Cleaning</h1><p>CALL US NOW: 450-234-5678</p><nav><a href="/about-us">About Us</a><a href="/instant-quote/">Instant Quote</a></nav><p>Lavage de vitres</p>';
    const h = moduleHarness({ html });
    const r = await h.m.captureFirstPartyPhone(h.sb, id, h.io, true);
    expect(r.observation.status).toBe("machine_verified");
    expect(r.observation.reason).toBe("publication_observed_human_review_required");
    expect(r.human_review_required).toBe(true);
    expect(r.legal_consent_established).toBe(false);
    expect(r.sent).toBe(0);
    expect(h.writes).toHaveLength(0);
  });
  it("allows only a PENDING proposal from that publication, never a CASL human approval", async () => {
    const html = '<h1>Synthetic Cleaning</h1><p>CALL US NOW: 450-234-5678</p><p>Lavage de vitres</p><a href="/instant-quote">Instant Quote</a>';
    const h = moduleHarness({ html });
    const r = await h.m.captureFirstPartyPhone(h.sb, id, h.io, false);
    expect(r.observation.status).toBe("machine_verified");
    expect(r.legal_consent_established).toBe(false);
    expect(h.writes).toHaveLength(1);
    expect(h.writes[0]).not.toHaveProperty("reviewer_id");
    expect(h.writes[0].verification_method).toBe("first_party_phone_pending_human_review");
    expect(r.sent).toBe(0);
  });
  it("rejects a phone dumped into arbitrary body text without contact wording", async () => {
    const html = '<h1>Synthetic Cleaning</h1><p>Lavage de vitres</p><p>Inventory 450-234-5678 archive number</p>';
    const h = moduleHarness({ html });
    const r = await h.m.captureFirstPartyPhone(h.sb, id, h.io, false);
    expect(r.observation.status).toBe("pending");
    expect(r.observation.reason).toBe("phone_publication_context_missing");
    expect(h.writes).toHaveLength(0);
  });
  it("blocks direct first-party phone evidence if that page prohibits commercial solicitation", async () => {
    const html = '<h1>Synthetic Cleaning</h1><p>CALL US NOW: 450-234-5678</p><p>Lavage de vitres</p><p>No unsolicited marketing.</p>';
    const h = moduleHarness({ html });
    const r = await h.m.captureFirstPartyPhone(h.sb, id, h.io, false);
    expect(r.observation.status).toBe("rejected");
    expect(r.observation.reason).toBe("solicitation_refused");
    expect(h.writes).toHaveLength(0);
  });
  it("captures only pending evidence via the canonical helper, never a reviewer", async () => {
    const h = moduleHarness(); await h.m.captureFirstPartyPhone(h.sb, id, h.io, false);
    expect(h.writes).toHaveLength(1); expect(h.writes[0].contractor_prospect_id).toBe(id);
    expect(h.writes[0].verification_method).toBe("first_party_phone_pending_human_review"); expect(h.writes[0]).not.toHaveProperty("reviewer_id");
  });
  it("existing evidence remains untouched", async () => { const h = moduleHarness({ existing: [{ id }] }); await h.m.captureFirstPartyPhone(h.sb, id, h.io, false); expect(h.writes).toHaveLength(0); });
  it("uses the existing ten-digit evidence normalization consistently", () => { expect(normalizeCaslDestination("phone_sms", company.phone_e164)).toBe("4502345678"); expect(company.phone_e164.slice(2)).toBe("4502345678"); });
  it.each(["(450) 234-5678", "+1 450 234 5678", "450.234.5678"])("observes exact formatting variant %s", async phone => { const h = moduleHarness({ html: document.replace("450-234-5678", phone) }); const r = await h.m.captureFirstPartyPhone(h.sb, id, h.io, true); expect(r.observation.status).toBe("machine_verified"); expect(h.writes).toHaveLength(0); });
  it("hidden phone is not visible evidence", async () => { const h = moduleHarness({ html: document.replace("450-234-5678", "") + "<script>450-234-5678</script>" }); const r = await h.m.captureFirstPartyPhone(h.sb, id, h.io, false); expect(r.observation.reason).toBe("exact_phone_not_visible"); expect(h.writes).toHaveLength(0); });
  it.each([
    { company: { do_not_contact: true } }, { opted: true }, { suppressed: true }, { duplicates: [{ id }, { id: "other" }] },
    { company: { trade: "Toiture" } }, { company: { trade: null } }, { company: { outreach_status: "sent" } }, { company: { business_name: "Hôtel Synthetic" } },
    { company: { phone_e164: "+18002345678" } }, { company: { phone_e164: "invalid" } },
  ])("blocks invalid fit/contact before fetch: %j", async options => { const h = moduleHarness(options); await expect(h.m.captureFirstPartyPhone(h.sb, id, h.io, false)).rejects.toThrow(); expect(h.fetch).not.toHaveBeenCalled(); expect(h.writes).toHaveLength(0); });
  it.each([document.replace("450-234-5678", "450-234-5679"), document + " Aucune sollicitation commerciale"])("absent phone or refusal never captures", async html => { const h = moduleHarness({ html }); await h.m.captureFirstPartyPhone(h.sb, id, h.io, false); expect(h.writes).toHaveLength(0); });
  it.each([["Entretien ménager", "entretien-menager"], ["Nettoyage de conduits d air", "nettoyage-conduits"], ["Lavage de vitres", "lavage-de-vitres"], ["Plomberie", null], ["Portes et fenêtres", null]])("maps real trade text %s via canonical categories", (trade, slug) => {
    expect(moduleHarness().m.phoneCaptureService({ category_slug: null, trade })).toBe(slug);
  });
  it("official-site company name mismatch fails closed", async () => { const h = moduleHarness({ company: { business_name: "Autre Nom Inc" } }); const r = await h.m.captureFirstPartyPhone(h.sb, id, h.io, false); expect(r.observation.status).toBe("pending"); expect(h.writes).toHaveLength(0); });
  it("dedupe read error fails closed", async () => { const h = moduleHarness({ existing: null }); await expect(h.m.captureFirstPartyPhone(h.sb, id, h.io, false)).rejects.toThrow("evidence_dedupe_unreadable"); expect(h.writes).toHaveLength(0); });
  it("unpinned transport is refused", async () => { const h = moduleHarness(); delete (h.fetch as any)[h.m.PINNED_TRANSPORT]; const r = await h.m.captureFirstPartyPhone(h.sb, id, h.io, false); expect(r.observation.reason).toBe("unpinned_transport"); expect(h.writes).toHaveLength(0); });
  it("third-party phone is refused without fetching", async () => {
    const h = moduleHarness(); const r = await h.m.observeFirstParty({ id, destination_type: "phone_sms", destination_normalized: company.phone_e164, source_type: "google_business_profile", source_url: company.website_url }, company, h.io);
    expect(r.status).toBe("pending"); expect(h.fetch).not.toHaveBeenCalled();
  });
});
function batchHarness({ gate = false, missing = false, line = "unknown" } = {}) {
  let handler: any; const writes: any[] = []; const sends = vi.fn(); const row = { id, business_name: "Synthetic Cleaning", phone_e164: company.phone_e164, phone_line_type: line, sms_eligibility_tier: "C", outreach_status: "none", verification_status: "verified", data_quality_score: 90, website_url: company.website_url };
  const sb = { from: (table: string) => {
    const q: any = {}; let selected = "";
    for (const method of ["select", "eq", "gte", "or", "order", "limit", "in", "not", "ilike"]) q[method] = (value: any) => { if (method === "select") selected = value; return q; };
    for (const method of ["insert", "update", "upsert", "delete"]) q[method] = (value: any) => { writes.push({ table, value }); return q; };
    q.maybeSingle = async () => ({ data: table === "system_flags" ? { value: gate } : { gated: false, operational_score: 95 }, error: null });
    q.then = (resolve: any) => Promise.resolve({ data: table === "verified_contractor_prospects" ? (missing && selected.includes("retry_count") ? [] : [row]) : [], error: null }).then(resolve);
    return q;
  } };
  load(proposed("supabase/functions/send-verified-batch/index.ts"), { Deno: { env: { get: (k: string) => k === "SUPABASE_SERVICE_ROLE_KEY" ? "synthetic-service" : k === "SUPABASE_URL" ? "https://synthetic.test" : undefined }, serve: (f: any) => { handler = f; } }, createClient: () => sb, assertCommercialOutreachAllowed, sendSms: sends, logPipelineEvent: vi.fn(() => { writes.push("log"); }), sanitizeEmail: (e: any) => e, buildOutreachUrl: (u: string) => u, smsWithLink: (s: string, u: string) => `${s} ${u}`, firstTouchScoreSms: () => "Synthetic", });
  return { writes, sends, run: async () => (await handler(new Request("https://synthetic.test", { method: "POST", headers: { Authorization: "Bearer synthetic-service" }, body: JSON.stringify({ dry_run: true, prospect_ids: [id] }) }))).json() };
}
describe("staged batch preview never confuses tier C with provider readiness", () => {
  it.each(["unknown", "landline", "mobile"])("gate OFF produces zero ready/sends/writes for %s", async line => { const h = batchHarness({ line }); const r = await h.run(); expect(r.sms_provider_ready_count).toBe(0); expect(r.eligible_count).toBe(0); expect(r.candidate_count).toBe(1); expect(r.readiness_status).toBe("blocked"); expect(h.sends).not.toHaveBeenCalled(); expect(h.writes).toHaveLength(0); });
  it("even gate ON/mobile is not certified without full sender checks", async () => { const h = batchHarness({ gate: true, line: "mobile" }); const r = await h.run(); expect(r.sms_provider_ready_count).toBe(0); expect(r.readiness_status).toBe("not_verified"); expect(h.writes).toHaveLength(0); });
  it("explicit missing candidates do not mutate rejection fields or logs on dry run", async () => { const h = batchHarness({ missing: true }); const r = await h.run(); expect(r.skipped).toHaveLength(1); expect(h.writes).toHaveLength(0); expect(h.sends).not.toHaveBeenCalled(); });
});