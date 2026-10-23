// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
function harness(status: number | null) {
  let handler: ((r: Request) => Promise<Response>) | undefined;
  const createClient = vi.fn(() => ({})); const recheckCasl = vi.fn(async () => ({ status: "pending", legal_consent_established: false })); const fetch = vi.fn();
  const guardSource = readFileSync("supabase/functions/_shared/requireAdminCaller.ts", "utf8").replace(/^import .*;\n/gm, "");
  const guardContext: any = { exports: {}, Deno: { env: { get: (k: string) => k === "SUPABASE_SERVICE_ROLE_KEY" ? "synthetic-service" : k === "SUPABASE_ANON_KEY" ? "synthetic-anon" : "https://synthetic.test" } }, Response, atob, createClient: () => ({ auth: { getUser: async () => ({ data: { user: status === 401 ? null : { id: "synthetic-user" } } }) }, from: () => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: status === 403 ? null : { role: "admin" }, error: null }) }; return q; } }) };
  runInNewContext(ts.transpileModule(guardSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, guardContext);
  const source = readFileSync("supabase/functions/enrich-official-website/index.ts", "utf8").replace(/^import[\s\S]*?;\n/gm, "");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, { Deno: { env: guardContext.Deno.env, serve: (f: typeof handler) => { handler = f; } }, crypto, Response, Request, console, createClient, corsHeaders: {}, requireAdminCaller: guardContext.exports.requireAdminCaller, recheckCasl, pinnedPublicFetch: fetch, z });
  return { createClient, recheckCasl, fetch, run: async (body: any = { action: "verify_casl", evidence_id: "11111111-1111-4111-8111-111111111111", dry_run: true }) => {
    if (!handler) throw new Error("missing handler");
    return handler(new Request("https://synthetic.test", { method: "POST", headers: status === 401 ? {} : { Authorization: "Bearer synthetic-user-token" }, body: JSON.stringify(body) }));
  } };
}
describe("actual existing endpoint with actual admin guard, mocked auth/database", () => {
  it("anonymous is 401 before lookup, fetch or write", async () => { const h = harness(401); expect((await h.run()).status).toBe(401); expect(h.createClient).not.toHaveBeenCalled(); expect(h.recheckCasl).not.toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled(); });
  it("non-admin is 403 before lookup, fetch or write", async () => { const h = harness(403); expect((await h.run()).status).toBe(403); expect(h.recheckCasl).not.toHaveBeenCalled(); expect(h.fetch).not.toHaveBeenCalled(); });
  it("admin uses only the existing mechanical path", async () => { const h = harness(null); const r = await h.run(); expect(r.status).toBe(200); expect((await r.json()).sent).toBe(0); expect(h.recheckCasl).toHaveBeenCalledTimes(1); expect(h.recheckCasl.mock.calls[0][3]).toBe(true); expect(h.fetch).not.toHaveBeenCalled(); });
  it("malformed input cannot trigger analysis", async () => { const h = harness(null); expect((await h.run({ action: "verify_casl", evidence_id: "bad" })).status).toBe(400); expect(h.recheckCasl).not.toHaveBeenCalled(); });
});