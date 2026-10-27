// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

function stagedHandlerSource() {
  const path = "supabase/functions/enrich-official-website/index.ts";
  const lines = readFileSync(path, "utf8").split("\n");
  const patch = readFileSync("docs/audits/issue-56-prospect-phone-collision.patch", "utf8");
  let offset = 0;
  for (const hunk of patch.split(/(?=^@@ )/m).slice(1)) {
    const header = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@.*\n/.exec(hunk);
    if (!header) throw new Error("invalid patch");
    const body = hunk.slice(header[0].length).split("\n").filter(l => /^[ +\-]/.test(l));
    const before = body.filter(l => l[0] !== "+").map(l => l.slice(1));
    const after = body.filter(l => l[0] !== "-").map(l => l.slice(1));
    const start = Number(header[1]) - 1 + offset;
    if (lines.slice(start, start + before.length).join("\n") !== before.join("\n")) throw new Error("stale patch");
    lines.splice(start, before.length, ...after);
    offset += after.length - before.length;
  }
  return lines.join("\n");
}

const phone = "+14502345678"; // Synthetic, never sent or queried remotely.
const source = "https://synthetic.test/";
type Row = { id: string; phone_e164: string | null; affiliate_id: string; website_url: string };
function harness(options: { race?: boolean; changed?: boolean; lookupError?: boolean; updateError?: boolean } = {}) {
  const rows: Row[] = [
    { id: "a", phone_e164: null, affiliate_id: "affiliate-a", website_url: source },
    { id: "b", phone_e164: null, affiliate_id: "affiliate-b", website_url: source },
  ];
  const evidence: unknown[] = [];
  const updates: Record<string, unknown>[] = [];
  let ownerReads = 0;
  let release: (() => void) | undefined;
  const barrier = new Promise<void>(r => { release = r; });
  const sb = { from(table: string) {
    let op = "select";
    let payload: Record<string, unknown> = {};
    const predicates: ((r: Row) => boolean)[] = [];
    const q = {
      select: (_fields?: string) => q,
      eq: (key: string, value: unknown) => { predicates.push(r => (r as unknown as Record<string, unknown>)[key] === value); return q; },
      neq: (key: string, value: unknown) => { predicates.push(r => (r as unknown as Record<string, unknown>)[key] !== value); return q; },
      is: (key: string, value: unknown) => { predicates.push(r => (r as unknown as Record<string, unknown>)[key] === value); return q; },
      limit: (_n: number) => q,
      insert: (p: Record<string, unknown>) => { op = "insert"; payload = p; return q; },
      update: (p: Record<string, unknown>) => { op = "update"; payload = p; return q; },
      maybeSingle: async () => table === "official_site_crawl_runs"
        ? { data: { id: "synthetic-run" }, error: null }
        : { data: { ...rows.find(r => predicates.every(p => p(r))) }, error: null },
      then: (resolve: (v: unknown) => unknown) => (async () => {
        if (table === "official_site_enrichment_evidence") { evidence.push(payload); return { data: [], error: null }; }
        if (op === "select") {
          const owners = rows.filter(r => predicates.every(p => p(r))).map(r => ({ id: r.id }));
          if (options.race) { ownerReads++; if (ownerReads === 2) release?.(); await barrier; }
          return { data: owners, error: options.lookupError ? { code: "XX000" } : null };
        }
        updates.push(payload);
        if (options.changed) rows[0].phone_e164 = "+14502345679";
        const targets = rows.filter(r => predicates.every(p => p(r)));
        if (options.updateError) return { data: null, error: { code: "XX000", message: "private database detail" } };
        if (targets.some(t => rows.some(r => r.id !== t.id && r.phone_e164 === payload.phone_e164))) {
          return { data: null, error: { code: "23505", message: `private detail ${phone}` } };
        }
        for (const target of targets) Object.assign(target, payload);
        return { data: targets.map(r => ({ id: r.id })), error: null };
      })().then(resolve),
    };
    return q;
  } };
  let handler: ((r: Request) => Promise<Response>) | undefined;
  const capture = vi.fn(async () => ({ observation: { status: "pending" }, dry_run: true, legal_consent_established: false, sent: 0 }));
  const code = stagedHandlerSource().replace(/^import[\s\S]*?;\n/gm, "");
  runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: {}, Deno: { env: { get: () => "synthetic" }, serve: (h: typeof handler) => { handler = h; } },
    crypto, Request, Response, TextEncoder, console: { error: vi.fn() }, corsHeaders: {},
    createClient: () => sb, requireAdminCaller: async () => ({ ok: true, kind: "admin" }),
    resolveOfficialDomain: () => ({ canonical: source }),
    crawlOfficialSite: async () => ({ complete: true, had_transient_failure: false, ok_pages: [source], pages_attempted: [{ url: source, ok: true }], fields: [{ kind: "phone", normalized: phone, raw: phone, source_url: source, method: "visible" }] }),
    sanitizeEmail: () => null, captureFirstPartyPhone: capture, pinnedPublicFetch: vi.fn(),
    z,
  });
  async function run(id = "a", extra: Record<string, unknown> = {}) {
    if (!handler) throw new Error("missing handler");
    const body = extra.action ? extra : { prospect_id: id, ...extra };
    const response = await handler(new Request(source, { method: "POST", body: JSON.stringify(body) }));
    return { status: response.status, body: await response.json() };
  }
  return { rows, evidence, updates, run, capture };
}

describe("#56 staged actual enrichment handler, isolated database adapter", () => {
  it("refuses another prospect's phone without update or exposed number; keeps independent crawl evidence", async () => {
    const h = harness(); h.rows[1].phone_e164 = phone;
    const before = structuredClone(h.rows);
    const r = await h.run();
    expect(r.status).toBe(409); expect(r.body.ok).toBe(false); expect(r.body.code).toBe("prospect_phone_collision");
    expect(JSON.stringify(r.body)).not.toContain(phone); expect(h.updates).toHaveLength(0);
    expect(h.rows).toEqual(before); expect(h.evidence).toHaveLength(1);
  });
  it("is idempotent for the same prospect and preserves affiliate ownership", async () => {
    const h = harness(); h.rows[0].phone_e164 = phone;
    expect((await h.run()).status).toBe(200); expect((await h.run()).body.ok).toBe(true);
    expect(h.rows[0].phone_e164).toBe(phone); expect(h.rows[0].affiliate_id).toBe("affiliate-a");
    expect(h.rows[1].phone_e164).toBeNull();
  });
  it("lets the unchanged unique constraint arbitrate a concurrent claim after two empty preflights", async () => {
    const h = harness({ race: true });
    const results = await Promise.all([h.run("a"), h.run("b")]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const rejected = results.find(r => r.status === 409);
    expect(rejected?.body.ok).toBe(false); expect(rejected?.body.code).toBe("prospect_unique_collision");
    expect(JSON.stringify(rejected?.body)).not.toContain(phone);
    expect(h.rows.filter(r => r.phone_e164 === phone)).toHaveLength(1); expect(h.evidence).toHaveLength(2);
    expect(h.rows.map(r => r.affiliate_id)).toEqual(["affiliate-a", "affiliate-b"]);
  });
  it("does not overwrite an already different phone", async () => {
    const h = harness(); h.rows[0].phone_e164 = "+14502345679";
    expect((await h.run()).body.code).toBe("prospect_phone_change_requires_review");
    expect(h.updates).toHaveLength(0); expect(h.rows[0].phone_e164).toBe("+14502345679");
  });
  it("does not overwrite a phone changed between lookup and update", async () => {
    const h = harness({ changed: true });
    expect((await h.run()).body.code).toBe("prospect_changed_during_enrichment");
    expect(h.rows[0].phone_e164).toBe("+14502345679");
  });
  it("fails closed on lookup errors", async () => {
    const h = harness({ lookupError: true }); const r = await h.run();
    expect(r.status).toBe(503); expect(r.body.ok).toBe(false); expect(h.updates).toHaveLength(0);
  });
  it("never reports success on other update errors or exposes database details", async () => {
    const h = harness({ updateError: true }); const r = await h.run();
    expect(r.status).toBe(503); expect(r.body.code).toBe("prospect_update_failed");
    expect(r.body.ok).toBe(false); expect(JSON.stringify(r.body)).not.toContain("private database detail");
    expect(h.rows[0].phone_e164).toBeNull();
  });
  it("dry-run never updates or inserts evidence", async () => {
    const h = harness(); expect((await h.run("a", { dry_run: true })).status).toBe(200);
    expect(h.updates).toHaveLength(0); expect(h.evidence).toHaveLength(0);
  });
  it("keeps the independent phone-CASL action outside prospect update handling", async () => {
    const h = harness(); const r = await h.run("a", { action: "capture_phone_casl", contractor_prospect_id: "11111111-1111-4111-8111-111111111111", dry_run: true });
    expect(r.status).toBe(200); expect(r.body.legal_consent_established).toBe(false); expect(r.body.sent).toBe(0);
    expect(h.capture).toHaveBeenCalledTimes(1); expect(h.updates).toHaveLength(0); expect(h.evidence).toHaveLength(0);
  });
});