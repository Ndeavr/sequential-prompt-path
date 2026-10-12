import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHmac, webcrypto } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync("supabase/functions/twilio-inbound/index.ts", "utf8");
const url = "https://example.test/functions/v1/twilio-inbound";
const token = "test-only-signature-secret";

function harness(authToken = token) {
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const writes: { table: string; operation: string }[] = [];
  const invocations: string[] = [];
  const sb = {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const operation of ["insert", "upsert", "update", "select", "eq", "or", "limit", "in"]) {
        chain[operation] = () => {
          if (["insert", "upsert", "update"].includes(operation)) writes.push({ table, operation });
          return chain;
        };
      }
      chain.single = chain.maybeSingle = async () => ({ data: table === "outreach_replies" ? { id: "test-reply" } : null });
      chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null }).then(resolve);
      return chain;
    },
    functions: { invoke: async (name: string) => { invocations.push(name); return {}; } },
  };
  const javascript = ts.transpileModule(source.replace(/^import .*;\n/gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const env: Record<string, string> = {
    SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "test-only", TWILIO_AUTH_TOKEN: authToken,
  };
  runInNewContext(javascript, {
    serve: (callback: typeof handler) => { handler = callback; },
    createClient: () => sb, Request, Response, URL, TextEncoder, Uint8Array,
    crypto: webcrypto, btoa, console: { warn() {}, error() {} },
    Deno: { env: { get: (key: string) => env[key] } },
  });
  return {
    writes, invocations,
    async request(body: string, extra: Record<string, string> = {}, signed = true) {
      const params: Record<string, string> = { From: "+15005550006", To: "+14503286776", Body: body, MessageSid: "SM_TEST_ONLY", ...extra };
      const payload = Object.keys(params).sort().reduce((sum, key) => sum + key + params[key], url);
      const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
      if (signed) headers["X-Twilio-Signature"] = createHmac("sha1", token).update(payload).digest("base64");
      if (!handler) throw new Error("Handler not registered");
      return handler(new Request(url, { method: "POST", headers, body: new URLSearchParams(params).toString() }));
    },
  };
}

describe("inbound HELP — simulated handler, no real SMS/database", () => {
  it("rejects unsigned requests before writes", async () => {
    const h = harness();
    expect((await h.request("HELP", {}, false)).status).toBe(403);
    expect(h.writes).toHaveLength(0);
  });
  it("fails closed without a signature secret", async () => {
    expect((await harness("").request("HELP")).status).toBe(403);
  });
  it("signed HELP returns exactly one GSM-7 segment with public SMS contact", async () => {
    const h = harness();
    const response = await h.request("HELP");
    expect(response.status).toBe(200);
    const xml = await response.text();
    const text = xml.match(/<Message>(.*?)<\/Message>/)?.[1];
    expect(text).toContain("unpro.ca/contact");
    expect(text).toContain("Questions par SMS: 450-328-6776");
    expect(text).not.toContain("1-800-UNPRO");
    expect(text).not.toContain("9522");
    expect(text?.length).toBeLessThanOrEqual(160);
    expect(text).toMatch(/^[\x20-\x7Eé]+$/);
    expect(xml.match(/<Message>/g)).toHaveLength(1);
    expect(h.invocations).toHaveLength(0);
  });
  it.each(["HELP", "START", "STOP"])("no double reply for provider OptOutType %s", async (OptOutType) => {
    const h = harness();
    expect(await (await h.request(OptOutType, { OptOutType })).text()).not.toContain("<Message>");
    expect(h.invocations).toHaveLength(0);
  });
  it.each(["STOP", "UNSUBSCRIBE", "ARRÊT"])("preserves suppression for %s", async (body) => {
    const h = harness();
    expect(await (await h.request(body)).text()).not.toContain("<Message>");
    expect(h.writes).toContainEqual({ table: "sms_opt_outs", operation: "upsert" });
    expect(h.writes).toContainEqual({ table: "outreach_suppressions", operation: "insert" });
    expect(h.invocations).toHaveLength(0);
  });
  it("preserves ordinary reply routing without touching OTP", async () => {
    const h = harness();
    await h.request("bonjour");
    expect(h.invocations).toEqual(["agent-activation-reply"]);
    expect(source).not.toMatch(/invoke\("(?:send-otp|verify-otp|auth-otp-dispatch)"/);
  });
});