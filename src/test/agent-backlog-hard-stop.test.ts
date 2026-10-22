import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { agentQueueEmissionStop, assertAgentQueueEmissionStopped, AGENT_QUEUE_QUARANTINE_REASON } from "../../supabase/functions/agent-send-outreach/quarantine";
import { assertCommercialOutreachAllowed } from "../../supabase/functions/_shared/outreachGate";

// Real handler + real final-send functions, synthetic adapters; no network/DB.
function harness(file = "agent-send-outreach", gateGreen = true, providerStatus = 201) {
  const calls = { database: 0, providers: 0, gates: 0 };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const context: Record<string, unknown> = {
    agentQueueEmissionStop, assertAgentQueueEmissionStopped,
    corsHeaders: {}, Request, Response, console,
    adminClient: () => { calls.database++; throw new Error("database must not be touched"); },
    createClient: () => { calls.database++; throw new Error("database must not be touched"); },
    recordAgentRun: () => { calls.database++; throw new Error("run must not be created"); },
    assertOutreachEnabled: async () => { calls.gates++; return { allowed: gateGreen }; },
    assertSmsHealthy: async () => ({ ok: true }),
    sharedSendSms: async () => { calls.providers++; return { status: "sent" }; },
    fetch: async () => { calls.providers++; return new Response("provider failure", { status: providerStatus }); },
    Deno: { env: { get: () => "fixture-only" }, serve: (fn: typeof handler) => { handler = fn; } },
  };
  const source = readFileSync(`supabase/functions/${file}/index.ts`, "utf8").replace(/^import .*;\n/gm, "");
  const suffix = file === "agent-send-outreach"
    ? "\nglobalThis.smsBoundary = sendTwilioSms; globalThis.emailBoundary = sendResendEmail;"
    : "\nglobalThis.dispatchBoundary = dispatchOne;";
  runInNewContext(ts.transpileModule(source + suffix, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText, context);
  return {
    calls, context,
    async request(payload: unknown = {}) {
      if (!handler) throw new Error("Handler missing");
      return handler(new Request("https://fixture.test", { method: "POST", body: JSON.stringify(payload) }));
    },
  };
}

describe("legacy agent backlog circuit breaker (isolated)", () => {
  it.each([30, 94, null, "100", NaN])("commercial gate rejects unsafe score %s even if gated=false", async score => {
    const client = { from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === "system_flags" ? { value: true } : { gated: false, operational_score: score } }) }) }) }) };
    const result = await assertCommercialOutreachAllowed(client as never);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("OUTREACH_OPERATIONAL_SCORE_BELOW_95");
  });
  it("95 permits only the general gate, never releases the legacy queue", async () => {
    const client = { from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === "system_flags" ? { value: true } : { gated: false, operational_score: 95 } }) }) }) }) };
    expect((await assertCommercialOutreachAllowed(client as never)).allowed).toBe(true);
    expect(agentQueueEmissionStop().status).toBe(423);
  });
  it("all 5698 pending rows remain unsent even with a green gate", async () => {
    const h = harness();
    const pending = Array.from({ length: 5698 }, (_, id) => ({ id, status: "pending", lead_id: "same-fixture" }));
    for (const row of pending) {
      const response = await h.request({ lead_id: row.lead_id, message_id: row.id, limit: 5698, founder_override: true });
      expect(response.status).toBe(423);
    }
    expect(pending.every(row => row.status === "pending")).toBe(true);
    expect(h.calls).toEqual({ database: 0, providers: 0, gates: 0 });
  });
  it("two concurrent workers cannot claim, consume or send the backlog", async () => {
    const h = harness();
    const responses = await Promise.all([h.request(), h.request()]);
    expect(responses.map(r => r.status)).toEqual([423, 423]);
    expect(h.calls.providers).toBe(0);
    expect(h.calls.database).toBe(0);
  });
  it.each([
    { attempts: 2, next_attempt_at: "2026-10-12T00:00:00Z" },
    { operational_score: 30, gated: true },
    { reviewer_id: null, consent_to_contact: false },
    { phone_type: "unknown", phone_validation_status: "pending_validation" },
    { status: "pending", created_at: "2026-10-12T00:00:00Z", gated: false, operational_score: 100 },
    { approved: true, idempotency_key: "forged-by-browser", campaign_id: "fixture" },
  ])("stale/unsafe or forged request stays stopped: %j", async payload => {
    const h = harness();
    const body = await (await h.request(payload)).json();
    expect(body.reason).toBe(AGENT_QUEUE_QUARANTINE_REASON);
    expect(body.sent).toBe(0);
    expect(body.retryable).toBe(false);
    expect(h.calls.providers).toBe(0);
  });
  it("gate 30 stays blocked without reading or changing that gate", async () => {
    const h = harness("agent-send-outreach", false);
    expect((await h.request()).status).toBe(423);
    expect(h.calls.gates).toBe(0);
  });
  it("provider 500 never triggers retries or an email fallback", async () => {
    const h = harness("agent-send-outreach", true, 500);
    expect((await h.request()).status).toBe(423);
    expect(h.calls.providers).toBe(0);
  });
  it("both final provider boundaries reject direct calls", async () => {
    const h = harness();
    await expect((h.context.smsBoundary as (to: string, body: string) => Promise<unknown>)("+15005550006", "fixture")).rejects.toThrow(AGENT_QUEUE_QUARANTINE_REASON);
    await expect((h.context.emailBoundary as (to: string, subject: string, body: string) => Promise<unknown>)("fixture@example.test", "fixture", "fixture")).rejects.toThrow(AGENT_QUEUE_QUARANTINE_REASON);
    expect(h.calls.providers).toBe(0);
  });
  it("activation dispatch cannot create Checkout or pending rows", async () => {
    const h = harness("agent-activation-dispatch");
    expect((await h.request({ lead_id: "fixture" })).status).toBe(423);
    await expect((h.context.dispatchBoundary as (id: string, by: string) => Promise<unknown>)("fixture", "cron")).rejects.toThrow(AGENT_QUEUE_QUARANTINE_REASON);
    expect(h.calls).toEqual({ database: 0, providers: 0, gates: 0 });
  });
});