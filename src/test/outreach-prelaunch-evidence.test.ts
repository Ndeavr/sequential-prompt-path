// Execute the existing handlers with synthetic in-memory adapters only.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import { classifyResendProbe } from "../../supabase/functions/_shared/providerHealthSemantics";
import { smsDeliveryConfirmed, funnelIncrementConfirmed, paymentProofError } from "../../supabase/functions/acq-e2e-real/assertions";

function load(path: string, context: Record<string, unknown>, suffix = "") {
  const source = readFileSync(path, "utf8").replace(/^import .*;\n/gm, "");
  runInNewContext(ts.transpileModule(source + suffix, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText, context);
}

function database(rows: unknown[], state: unknown = null) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "insert", "upsert", "update", "delete", "eq", "lt", "like", "contains", "order", "limit"]) {
        chain[method] = (value: unknown) => {
          if (table === "outreach_e2e_full_runs" && method === "insert") rows.push(value);
          return chain;
        };
      }
      chain.maybeSingle = async () => ({ data: table === "contractors" ? { email: "fixture@example.test", phone: "+15005550006" } : state });
      chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: "fixture-click" }], error: null, count: 1 }).then(resolve);
      return chain;
    },
    rpc: async () => ({ data: null }),
  };
}

describe("prelaunch evidence — no external provider or database", () => {
  it.each(["queued", "accepted", "sending", "sent", "failed", "undelivered"])("SMS %s never proves delivery", status => {
    expect(smsDeliveryConfirmed(true, status)).toBe(false);
  });
  it("only a successful delivered response proves delivery", () => {
    expect(smsDeliveryConfirmed(true, "delivered")).toBe(true);
    expect(smsDeliveryConfirmed(false, "delivered")).toBe(false);
  });
  it.each([0, null, -1, NaN, 1.5])("funnel count %s fails closed", count => {
    expect(funnelIncrementConfirmed(count)).toBe(false);
  });
  it("one genuine run event is necessary", () => {
    expect(funnelIncrementConfirmed(1)).toBe(true);
  });
  it.each([401, 403])("actual health agent classifies send-only HTTP %s yellow without recent send", async status => {
    const context: Record<string, unknown> = {
      createClient: () => database([]), classifyResendProbe,
      Deno: { env: { get: (key: string) => ({ SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "fixture", RESEND_API_KEY: "re_fixture_only" })[key] }, serve() {} },
      fetch: async () => new Response(JSON.stringify({ message: "This API key is restricted to only send emails" }), { status }),
      Response, Date, console: { log() {} },
    };
    load("supabase/functions/outreach-health-agent/index.ts", context, "\nglobalThis.probe = probeResend;");
    const result = await (context.probe as () => Promise<Record<string, unknown>>)();
    expect(result.status).toBe("yellow");
    expect(result.failure_reason).toBe("SENDING_CAPABLE_RESTRICTED_KEY");
    expect(result.repair_action).toBe("manual_required");
  });
  it("actual health agent retains red for an invalid key", async () => {
    const context: Record<string, unknown> = {
      createClient: () => database([]), classifyResendProbe,
      Deno: { env: { get: (key: string) => ({ SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "fixture", RESEND_API_KEY: "re_fixture_only" })[key] }, serve() {} },
      fetch: async () => new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 }),
      Response, Date, console: { log() {} },
    };
    load("supabase/functions/outreach-health-agent/index.ts", context, "\nglobalThis.probe = probeResend;");
    const result = await (context.probe as () => Promise<Record<string, unknown>>)();
    expect(result.status).toBe("red");
    expect(result.failure_reason).toBe("RESEND_AUTH_ERROR");
  });
  it("future send timestamp cannot manufacture a green restricted probe", () => {
    expect(classifyResendProbe({ keyPresent: true, httpStatus: 401, responseBody: "restricted_api_key", nowMs: 1000, lastSuccessfulSendAt: new Date(2000).toISOString() }).level).toBe("yellow");
  });
  it.each(["queued", "delivered"])("existing E2E handler never passes with %s SMS and connectivity-only Stripe", async smsStatus => {
    let handler: ((req: Request) => Promise<Response>) | undefined;
    const rows: unknown[] = [];
    const env: Record<string, string> = { SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "fixture", SUPABASE_ANON_KEY: "fixture", TWILIO_ACCOUNT_SID: "fixture", TWILIO_AUTH_TOKEN: "fixture", TWILIO_PHONE_NUMBER: "+15005550006", STRIPE_TEST_SECRET_KEY: "sk_test_fixture" };
    const context = {
      createClient: () => database(rows, { status: "sent" }), smsDeliveryConfirmed, funnelIncrementConfirmed, paymentProofError,
      Deno: { env: { get: (key: string) => env[key] }, serve: (fn: typeof handler) => { handler = fn; } },
      crypto: webcrypto, Request, Response, URLSearchParams, Date, btoa, console,
      setTimeout: (fn: () => void) => { fn(); return 0; },
      fetch: async (url: string) => {
        if (url.includes("r-redirect")) return new Response("", { status: 302, headers: { location: "https://example.test/qa-e2e-fixture" } });
        if (url.includes("qa-e2e-fixture")) return new Response("Fixture QA UNPRO");
        const body = url.includes("outreach-resend-send") ? { ok: true, resend_id: "fixture-email" }
          : url.includes("Messages") ? { sid: "fixture-sms", status: smsStatus }
          : url.includes("outreach-shortlink-resolve") ? { redirect_url: "https://example.test/qa-e2e-fixture" }
          : { id: "cs_test_fixture", livemode: false, status: "expired" };
        return new Response(JSON.stringify(body));
      },
    };
    load("supabase/functions/acq-e2e-real/index.ts", context);
    if (!handler) throw new Error("E2E handler missing");
    const result = await (await handler(new Request("https://example.test", { method: "POST" }))).json();
    expect(result.pass).toBe(false);
    expect(result.failed_step.step).toBe(smsStatus === "queued" ? "verify_sms_delivered" : "stripe_test_checkout");
    if (smsStatus === "delivered") expect(result.failed_step.error).toContain("signed_test_payment_unverified");
    expect(rows.some(row => (row as { pass?: boolean }).pass === true)).toBe(false);
  });
});