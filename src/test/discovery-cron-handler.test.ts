// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { evaluateRecruitmentLocks, resolveTriggerSource } from "../../supabase/functions/_shared/recruitmentLocks";

function harness(controls: unknown, readError: unknown = null) {
  let handler: ((r: Request) => Promise<Response>) | undefined;
  const fetch = vi.fn(() => { throw new Error("unexpected external call"); });
  const mutations = vi.fn();
  const campaign = vi.fn();
  const env = { get: (k: string) => k === "SUPABASE_SERVICE_ROLE_KEY" ? "fixture-service" : k === "SUPABASE_ANON_KEY" ? "fixture-anon" : "https://fixture.invalid" };
  const client = { auth: { getUser: async () => ({ data: { user: { id: "fixture-user" } }, error: null }) }, from: (table: string) => {
    const q: any = { select: () => q, eq: () => q, limit: () => q, maybeSingle: async () => ({ data: table === "recruitment_controls" ? controls : null, error: table === "recruitment_controls" ? readError : null }), insert: (...args: unknown[]) => { mutations(table, ...args); return Promise.resolve({ error: null }); }, update: mutations, upsert: mutations };
    return q;
  } };
  const guardContext: any = { exports: {}, Deno: { env }, Response, atob, console, createClient: () => client };
  const compile = (source: string) => ts.transpileModule(source.replace(/^import .*;\r?\n/gm, ""), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compile(readFileSync("supabase/functions/_shared/requireAdminCaller.ts", "utf8")), guardContext);
  runInNewContext(compile(readFileSync("supabase/functions/acquisition-discovery-cycle/index.ts", "utf8")), { exports: {}, Deno: { env, serve: (f: typeof handler) => { handler = f; } }, Response, console, createClient: () => client, requireAdminCaller: guardContext.exports.requireAdminCaller, evaluateRecruitmentLocks, resolveTriggerSource, isFlagEnabled: async () => true, freeCampaignStatus: campaign, fetch });
  return { fetch, mutations, campaign, run: async (authorization?: string) => {
    if (!handler) throw new Error("handler missing");
    return handler(new Request("https://fixture.invalid", { method: "POST", headers: authorization ? { Authorization: authorization } : {}, body: JSON.stringify({ caller: "cron", trigger_source: "cron" }) }));
  } };
}

describe("existing handler + real caller guard, synthetic IO only", () => {
  it.each([undefined, "Bearer fixture-anon", "Bearer fixture-user"])("rejects caller %s regardless of cron body", async (authorization) => {
    const h = harness({ global_enabled: true, autonomous_enqueue_enabled: true });
    expect((await h.run(authorization)).status).toBe(authorization === "Bearer fixture-user" ? 403 : 401);
    expect(h.fetch).not.toHaveBeenCalled(); expect(h.campaign).not.toHaveBeenCalled();
    // Existing guard writes an access audit only; it never writes discovery/queue.
    expect(h.mutations.mock.calls.every(([table]) => table === "platform_operation_outcomes")).toBe(true);
  });
  it.each([
    [{ global_enabled: false, autonomous_enqueue_enabled: true }, null, "recruitment_global_disabled"],
    [{ global_enabled: true, autonomous_enqueue_enabled: false }, null, "autonomous_enqueue_disabled"],
    [null, { message: "synthetic read failure" }, "recruitment_controls_unreadable"],
  ])("authenticated cron with closed/unreadable locks has zero discovery effects", async (controls, error, reason) => {
    const h = harness(controls, error);
    const response = await h.run("Bearer fixture-service");
    expect((await response.json()).blocked_reason).toBe(reason);
    expect(h.fetch).not.toHaveBeenCalled(); expect(h.campaign).not.toHaveBeenCalled();
    expect(h.mutations.mock.calls.filter(([table]) => table !== "platform_operation_outcomes")).toHaveLength(0);
  });
});