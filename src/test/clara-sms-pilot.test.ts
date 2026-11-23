import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("supabase/functions/clara-sms/index.ts", "utf8");
const TOKEN = "synthetic-service-role-key";
const PHONE = "+15145550123";
const SID = "SM" + "a".repeat(32);

function harness(opts: { enabled?: boolean; allowlist?: string; existing?: boolean; key?: string } = {}) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const changes: string[] = [];
  let aiCalls = 0;
  let sends = 0;
  const table = {
    update(value: Record<string, unknown>) { changes.push(String(value.status ?? "update")); return this; },
    eq() { return this; },
    select() { return this; },
    maybeSingle: async () => ({ data: opts.existing ? { id: "synthetic-id" } : null, error: null }),
  };
  const client = { from: () => table };
  const javascript = ts.transpileModule(source.replace(/^import .*;\n/gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const vars: Record<string, string> = {
    SUPABASE_URL: "https://example.test",
    SUPABASE_SERVICE_ROLE_KEY: TOKEN,
    CLARA_SMS_ENABLED: opts.enabled ? "true" : "false",
    CLARA_SMS_PILOT_ALLOWLIST: opts.allowlist ?? "",
    OPENAI_API_KEY: opts.key ?? "",
  };
  runInNewContext(javascript, {
    Deno: { env: { get: (key: string) => vars[key] }, serve: (cb: typeof handler) => { handler = cb; } },
    createClient: () => client,
    sendSms: async () => { sends++; return { status: "sending", twilio_sid: "SM" + "b".repeat(32) }; },
    fetch: async () => { aiCalls++; throw new Error("unexpected network"); },
    console: { error() {} }, Request, Response, AbortSignal, TextEncoder, Date,
    Set, String, RegExp, JSON, Promise,
  });
  return {
    changes, get aiCalls() { return aiCalls; }, get sends() { return sends; },
    call(headers: Record<string, string> = { authorization: "Bearer " + TOKEN }, body: Record<string, string> = {
      from: PHONE, to: "+14503286776", message_sid: SID, body: "Ma toiture coule.",
    }) {
      if (!handler) throw new Error("handler not mounted");
      return handler(new Request("https://example.test/functions/v1/clara-sms", {
        method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
      }));
    },
  };
}

describe("Clara SMS pilot — isolated synthetic checks (no real calls)", () => {
  it("blocks external callers even when enabled", async () => {
    const h = harness({ enabled: true, allowlist: PHONE });
    const res = await h.call({ authorization: "Bearer public-anon-key" });
    expect(res.status).toBe(401);
    expect(h.changes).toHaveLength(0);
    expect(h.aiCalls).toBe(0);
    expect(h.sends).toBe(0);
  });
  it("defaults to disabled, with no side effects", async () => {
    const h = harness({ allowlist: PHONE });
    const res = await h.call();
    expect((await res.json()).status).toBe("disabled");
    expect(h.changes).toHaveLength(0);
  });
  it("requires an explicit allowlist", async () => {
    const h = harness({ enabled: true, allowlist: "+15145559999" });
    const res = await h.call();
    expect((await res.json()).status).toBe("not_allowlisted");
    expect(h.changes).toHaveLength(0);
  });
  it("does not resend for an already-claimed inbound SID", async () => {
    const h = harness({ enabled: true, allowlist: PHONE });
    const res = await h.call();
    expect((await res.json()).status).toBe("already_processed_or_missing");
    expect(h.aiCalls).toBe(0);
    expect(h.sends).toBe(0);
  });
  it("fails closed without a direct OpenAI key; does not use Lovable gateway", async () => {
    const h = harness({ enabled: true, allowlist: PHONE, existing: true });
    const res = await h.call();
    expect(res.status).toBe(500);
    expect(h.changes).toEqual(["processing_clara", "clara_failed"]);
    expect(h.aiCalls).toBe(0);
    expect(h.sends).toBe(0);
    expect(source).toContain("https://api.openai.com/v1/chat/completions");
    expect(source).not.toContain("ai.gateway.lovable.dev");
  });
});
