// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHmac, webcrypto } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const tsOpts = { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } };
const BASE = "https://example.test";
const TOKEN = "test-auth-token";
const CB = "cb-secret";
const URL_SIGNED = `${BASE}/functions/v1/twilio-status-v2?token=${CB}`;

function load(env: Record<string, string>, row: { id: string; status: string } | null, dbStatus?: { v: string }) {
  const helper: any = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync("supabase/functions/_shared/twilioSignature.ts", "utf8"), tsOpts).outputText,
    { exports: helper.exports, crypto: webcrypto, TextEncoder, Uint8Array, btoa });
  const writes: string[] = []; const payloads: any[] = []; const events: string[] = [];
  const db = dbStatus ?? { v: row?.status ?? "" };
  const sb = { from(table: string) {
    const c: any = {}; let upd: any = null; let allowed: string[] | null = null;
    for (const op of ["select", "eq", "in", "limit", "order", "upsert"]) c[op] = () => { if (op === "upsert") writes.push(table); return c; };
    c.or = (f: string) => { allowed = (f.match(/status\.in\.\(([^)]*)\)/)?.[1] ?? "").split(","); return c; };
    c.insert = (v: any) => { writes.push(table); if (v?.payload) payloads.push(v.payload); return c; };
    c.update = (v: any) => { upd = v; if (v?.provider_response) payloads.push(v.provider_response.payload); return c; };
    c.maybeSingle = async () => ({ data: table === "sms_events_v2" ? row : null, error: null });
    c.single = c.maybeSingle;
    c.then = (r: any) => {
      let data: any[] = [];
      if (upd) {
        if (table === "sms_events_v2" && allowed) { if (allowed.includes(db.v)) { db.v = upd.status; data = [{ id: "e", metadata: {} }]; writes.push(table); } }
        else writes.push(table);
      }
      return Promise.resolve({ data, error: null }).then(r);
    };
    return c;
  } };
  let handler: any;
  const src = readFileSync("supabase/functions/twilio-status-v2/index.ts", "utf8").replace(/^import[\s\S]*?;\n/gm, "");
  runInNewContext(ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, {
    Deno: { env: { get: (k: string) => env[k] }, serve: (f: any) => { handler = f; } },
    createClient: () => sb, Response, Request, URL, URLSearchParams, console: { warn() {}, error() {}, log() {} },
    isValidTwilioSignature: helper.exports.isValidTwilioSignature, isStatusRegression: helper.exports.isStatusRegression, priorStatusesBelow: helper.exports.priorStatusesBelow, redactCallbackPayload: helper.exports.redactCallbackPayload, canonicalSmsKind: helper.exports.canonicalSmsKind,
    logServerFunnelEvent: async () => {}, recordSmsEvent: async (_s: string, k: string) => { events.push(k); }, attributionFromLog: () => ({}), classifyTwilio: () => ({ retryable: false }),
  });
  return { writes, payloads, events, db, async send(params: Record<string, string>, opts: { sign?: boolean; tamper?: boolean; url?: string; ct?: string } = {}) {
    const url = opts.url ?? URL_SIGNED;
    const data = Object.keys(params).sort().reduce((a, k) => a + k + params[k], url);
    const sig = createHmac("sha1", TOKEN).update(data).digest("base64");
    const body = new URLSearchParams(opts.tamper ? { ...params, MessageStatus: "delivered" } : params).toString();
    const headers: Record<string, string> = { "Content-Type": opts.ct ?? "application/x-www-form-urlencoded" };
    if (opts.sign !== false) headers["X-Twilio-Signature"] = sig;
    return handler(new Request(`http://internal/twilio-status-v2?token=${CB}`, { method: "POST", headers, body }));
  } };
}
const env = { SUPABASE_URL: BASE, SUPABASE_SERVICE_ROLE_KEY: "x", SMS_STATUS_CALLBACK_SECRET: CB, TWILIO_AUTH_TOKEN: TOKEN };
const P = { MessageSid: "SMtest", MessageStatus: "sent", To: "+15005550006" };

describe("twilio-status-v2 signature receipts (synthetic)", () => {
  it("rejects missing signature without writes", async () => { const h = load(env, { id: "e", status: "queued" }); expect((await h.send(P, { sign: false })).status).toBe(401); expect(h.writes).toHaveLength(0); });
  it("rejects forged/tampered body", async () => { const h = load(env, { id: "e", status: "sent" }); expect((await h.send(P, { tamper: true })).status).toBe(401); expect(h.writes).toHaveLength(0); });
  it("rejects signature computed for another URL", async () => { const h = load(env, { id: "e", status: "sent" }); expect((await h.send(P, { url: `${BASE}/other` })).status).toBe(401); });
  it("fails closed without auth token", async () => { const h = load({ ...env, TWILIO_AUTH_TOKEN: "" }, { id: "e", status: "sent" }); expect((await h.send(P)).status).toBe(401); });
  it("fails closed without callback token secret", async () => { const h = load({ ...env, SMS_STATUS_CALLBACK_SECRET: "" }, { id: "e", status: "sent" }); expect((await h.send(P)).status).toBe(401); });
  it("rejects JSON payloads", async () => { const h = load(env, { id: "e", status: "sent" }); expect((await h.send(P, { ct: "application/json" })).status).toBe(415); expect(h.writes).toHaveLength(0); });
  it("unknown SID is ignored without writes", async () => { const h = load(env, null); const r = await h.send(P); expect(r.status).toBe(200); expect((await r.json()).ignored).toBe("unknown_sid"); expect(h.writes).toHaveLength(0); });
  it("delivered is never regressed to sent (replay/out-of-order)", async () => { const h = load(env, { id: "e", status: "delivered" }); const r = await h.send(P); expect((await r.json()).ignored).toBe("non_monotonic"); expect(h.writes).toHaveLength(0); });
  it("valid signed receipt updates existing SID", async () => { const h = load(env, { id: "e", status: "queued" }); expect((await h.send(P)).status).toBe(200); expect(h.writes).toContain("sms_events_v2"); });

  it("concurrent: delivered then stale sent (both read queued) keeps delivered", async () => {
    const db = { v: "queued" };
    const a = load(env, { id: "e", status: "queued" }, db); const b = load(env, { id: "e", status: "queued" }, db);
    await a.send({ ...P, MessageStatus: "delivered" }); await b.send(P);
    expect(db.v).toBe("delivered"); expect(b.events).toHaveLength(0);
  });
  it("delivered after sent is accepted", async () => { const db = { v: "queued" }; const h = load(env, { id: "e", status: "queued" }, db); await h.send(P); await h.send({ ...P, MessageStatus: "delivered" }); expect(db.v).toBe("delivered"); expect(h.events).toEqual(["sent", "delivered"]); });
  it("duplicate sent/queued callbacks emit once", async () => { const db = { v: "queued" }; const h = load(env, { id: "e", status: "queued" }, db); await h.send(P); await h.send(P); await h.send({ ...P, MessageStatus: "queued" }); expect(h.events).toEqual(["sent"]); });
  it("queued/sending never fabricate sent", async () => { const db = { v: "" }; const h = load(env, { id: "e", status: "" }, db); await h.send({ ...P, MessageStatus: "queued" }); await h.send({ ...P, MessageStatus: "sending" }); expect(h.events).toHaveLength(0); });
  it("failed/undelivered emit failed", async () => { const h = load(env, { id: "e", status: "sent" }); await h.send({ ...P, MessageStatus: "undelivered", ErrorCode: "30003" }); expect(h.events).toEqual(["failed"]); });
  it("stored payloads never contain To/From, keep SID", async () => {
    const h = load(env, { id: "e", status: "queued" }); await h.send({ ...P, From: "+15005550001", MessageStatus: "delivered" });
    expect(h.payloads.length).toBeGreaterThanOrEqual(2);
    for (const p of h.payloads) { expect(p.To).toBeUndefined(); expect(p.From).toBeUndefined(); expect(p.MessageSid).toBe("SMtest"); expect(JSON.stringify(p)).not.toContain("+1500555"); }
  });
});
