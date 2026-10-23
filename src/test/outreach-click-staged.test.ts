import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import Stripe from "stripe";

function stagedSource() {
  const lines = readFileSync("supabase/functions/acq-e2e-selftest/index.ts", "utf8").split("\n");
  const patch = readFileSync("docs/audits/20261023-outreach-click-qa.staged.patch", "utf8").split("\n");
  let offset = 0;
  for (let i = 0; i < patch.length; i++) {
    const match = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(patch[i]);
    if (!match) continue;
    const old: string[] = [], next: string[] = [];
    while (i + 1 < patch.length && !patch[i + 1].startsWith("@@")) {
      const line = patch[++i];
      if (line.startsWith(" ") || line.startsWith("-")) old.push(line.slice(1));
      if (line.startsWith(" ") || line.startsWith("+")) next.push(line.slice(1));
    }
    const at = Number(match[1]) - 1 + offset;
    expect(lines.slice(at, at + old.length)).toEqual(old);
    lines.splice(at, old.length, ...next);
    offset += next.length - old.length;
  }
  return lines.join("\n");
}

async function runCase(mode: string) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const writes: unknown[] = [], requests: string[] = [];
  const fixture = "https://example.test/functions/v1/qa-e2e-fixture?run=fixture1";
  const chain: Record<string, unknown> = {};
  chain.insert = () => chain;
  chain.update = (row: unknown) => { writes.push(row); return chain; };
  chain.select = chain.eq = () => chain;
  chain.single = async () => ({ data: { id: "fixture1-run" } });
  chain.maybeSingle = async () => ({ data: { delivered_at: "2026-10-23T00:00:00Z" } });
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve);
  const context = {
    Deno: { env: { get: () => "fixture-only" }, serve: (fn: typeof handler) => { handler = fn; } },
    createClient: () => ({ from: () => chain }),
    createTrackedLink: async () => "https://unpro.ca/r/fixture123",
    wrapAllUrls: async (body: string) => ({ body }),
    validateCta: () => ({ ok: true, cta_urls: ["https://unpro.ca/r/fixture123"], has_tracked_cta: true }),
    withReplyFooter: (html: string) => html, recordEmailEvent: async () => {}, sanitizeTags: (v: unknown) => v,
    Response, Date, console: { log() {} }, setTimeout: (fn: () => void) => { fn(); return 0; },
    fetch: async (url: string) => {
      requests.push(url);
      if (url.includes("outreach-shortlink-resolve")) return new Response(JSON.stringify({ redirect_url: mode === "wrong_target" ? "https://unpro.ca/" : fixture }), { status: mode === "resolver_error" ? 403 : 200 });
      if (url.includes("qa-e2e-fixture")) return new Response(mode === "blank_spa" ? "<html>App</html>" : "Fixture QA UNPRO", { status: mode === "landing_error" ? 500 : 200 });
      return new Response(JSON.stringify({ id: "synthetic-provider-id" }));
    },
  };
  const source = stagedSource().replace(/^import .*;\n/gm, "")
    .replace('const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;', 'const SUPABASE_URL = "https://example.test";');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context);
  if (!handler) throw new Error("missing handler");
  const result = await (await handler(new Request("https://example.test", { method: "POST", body: JSON.stringify({ auto_open_gate: false }) }))).json();
  return { result, writes, requests };
}

describe("staged existing selftest — synthetic adapters only", () => {
  it.each(["wrong_target", "resolver_error", "blank_spa", "landing_error"])("%s never proves click landing", async mode => {
    const { result, writes } = await runCase(mode);
    expect(result.ok).toBe(false);
    expect(result.failed_step).toBe("click_redirect");
    expect(writes.some(row => (row as { gated?: boolean }).gated === false)).toBe(false);
  });
  it("exact fixture content passes locally without opening any gate", async () => {
    const { result, writes, requests } = await runCase("valid");
    expect(result.ok).toBe(true);
    expect(requests.some(url => url.includes("qa-e2e-fixture"))).toBe(true);
    expect(writes.some(row => (row as { gated?: boolean }).gated === false)).toBe(false);
  });
});

describe("isolated Stripe signature verification, no Stripe API", () => {
  const stripe = new Stripe("sk_test_synthetic_only");
  const payload = JSON.stringify({ id: "evt_synthetic", object: "event", type: "checkout.session.expired", livemode: false, data: { object: { id: "cs_test_synthetic", status: "expired", payment_status: "unpaid" } } });
  const secret = "whsec_synthetic_only";
  it("authenticates an exact signed TEST payload without claiming a payment", () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = stripe.webhooks.constructEvent(payload, header, secret);
    expect(event.livemode).toBe(false);
    expect(event.type).toBe("checkout.session.expired");
  });
  it.each(["forged", "missing"])("rejects %s signature", mode => {
    const header = mode === "missing" ? "" : stripe.webhooks.generateTestHeaderString({ payload, secret: "wrong_synthetic_secret" });
    expect(() => stripe.webhooks.constructEvent(payload, header, secret)).toThrow();
  });
});