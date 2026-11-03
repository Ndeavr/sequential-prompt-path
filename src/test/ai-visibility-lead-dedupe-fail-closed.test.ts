// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const source = readFileSync("supabase/functions/visibilite-ia-lead/index.ts", "utf8");
const stripped = source.replace(/^import\s+.*?;\s*$/gm, "");
const compiled = ts.transpileModule(stripped, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness(mode: "read_error" | "duplicate" | "new", options?: { notify?: boolean; companyName?: string; requestHeaders?: Record<string, string>; bodyOverrides?: Record<string, unknown> }) {
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const inserts: unknown[] = [];
  const outbound = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 202 }));
  const db = {
    from: (table: string) => {
      expect(table).toBe("leads");
      const query = {
        select: () => query,
        eq: () => query,
        gte: () => query,
        contains: () => query,
        limit: async () => ({
          data: mode === "duplicate" ? [{ id: "synthetic-existing" }] : [],
          error: mode === "read_error" ? { message: "synthetic db read failed" } : null,
        }),
        insert: (record: unknown) => {
          inserts.push(record);
          return {
            select: () => ({
              single: async () => ({
                data: { id: "synthetic-created" },
                error: null,
              }),
            }),
          };
        },
      };
      return query;
    },
  };
  const Deno = {
    serve: (fn: (request: Request) => Promise<Response>) => { handler = fn; },
    env: { get: (key: string) =>
      key === "SUPABASE_URL" ? "https://synthetic.test"
        : key === "SUPABASE_SERVICE_ROLE_KEY" ? "synthetic-only"
        : key === "RESEND_API_KEY" && options?.notify ? "synthetic-only" : undefined },
  };
  runInNewContext(compiled, {
    Deno, z, createClient: () => db, Date, Request, Response, URL,
    console: { log: vi.fn(), error: vi.fn() }, fetch: outbound,
  });
  if (!handler) throw new Error("Deno handler not registered");
  const run = async () => handler!(new Request("https://synthetic.test/form", {
    method: "POST",
    headers: { "content-type": "application/json", ...(options?.requestHeaders ?? {}) },
    body: JSON.stringify({
      company_name: options?.companyName ?? "Synthetic Services",
      contact_name: "Example Tester",
      phone: "450 234 5678",
      primary_service: "Entretien ménager",
      company_website_confirm: "",
      ...(options?.bodyOverrides ?? {}),
    }),
  }));
  return { run, inserts, outbound };
}

describe("Public AI visibility lead — dedupe read is a hard prerequisite", () => {
  it("returns 503 and creates no lead when the dedupe read fails", async () => {
    const h = harness("read_error");
    const response = await h.run();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "duplicate_check_unavailable" });
    expect(h.inserts).toHaveLength(0);
    expect(h.outbound).not.toHaveBeenCalled();
  });

  it("does not recreate an existing lead within the 24-hour window", async () => {
    const h = harness("duplicate");
    const response = await h.run();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: true });
    expect(h.inserts).toHaveLength(0);
    expect(h.outbound).not.toHaveBeenCalled();
  });

  it("inserts exactly once after a successful empty dedupe read", async () => {
    const h = harness("new");
    const response = await h.run();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, duplicate: false });
    expect(h.inserts).toHaveLength(1);
    expect(h.outbound).not.toHaveBeenCalled();
  });

  it("does not store raw request IP or browser User-Agent inside the CRM lead", async () => {
    const h = harness("new", { requestHeaders: {
      "x-forwarded-for": "192.0.2.42",
      "user-agent": "SyntheticBrowser/1.0",
    } });
    const response = await h.run();
    expect(response.status).toBe(200);
    expect(h.inserts).toHaveLength(1);
    const payload = (h.inserts[0] as { payload: Record<string, unknown> }).payload;
    expect(payload).not.toHaveProperty("ip");
    expect(payload).not.toHaveProperty("user_agent");
    expect(payload).toMatchObject({ source: "visibilite_ia_entrepreneurs" });
  });

  it("does not treat browser-supplied paid, CASL or marketing flags as verified evidence", async () => {
    const h = harness("new", {
      bodyOverrides: {
        marketing_opt_in: true,
        consent_signed: true,
        casl_reviewer_id: "forged-reviewer",
        payment_status: "paid",
        onboarding_token: "forged-access-token",
      },
    });
    const response = await h.run();
    expect(response.status).toBe(200);
    expect(h.inserts).toHaveLength(1);
    const record = h.inserts[0] as {
      status: string;
      matching_status: string;
      payload: Record<string, unknown>;
    };
    expect(record.status).toBe("new");
    expect(record.matching_status).toBe("manual");
    for (const key of [
      "marketing_opt_in", "consent_signed", "casl_reviewer_id",
      "payment_status", "onboarding_token",
    ]) {
      expect(record).not.toHaveProperty(key);
      expect(record.payload).not.toHaveProperty(key);
    }
    // Not a verified marketing opt-in; no automatic outbound message.
    expect(h.outbound).not.toHaveBeenCalled();
  });

  it("silently ignores honeypot submissions before any dedupe read or notification", async () => {
    // A failing dedupe read would return 503 if the bot input reached the DB.
    const h = harness("read_error", {
      notify: true,
      bodyOverrides: { company_website_confirm: "https://bot.example" },
    });
    const response = await h.run();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: false });
    expect(h.inserts).toHaveLength(0);
    expect(h.outbound).not.toHaveBeenCalled();
  });

  it("rejects an invalid phone before touching CRM or notifying anyone", async () => {
    const h = harness("read_error", { notify: true, bodyOverrides: { phone: "1234567" } });
    const response = await h.run();
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_input" });
    expect(h.inserts).toHaveLength(0);
    expect(h.outbound).not.toHaveBeenCalled();
  });

  it("rejects an invalid website before touching CRM or notifying anyone", async () => {
    const h = harness("read_error", { notify: true, bodyOverrides: { website: "https://localhost" } });
    const response = await h.run();
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_input" });
    expect(h.inserts).toHaveLength(0);
    expect(h.outbound).not.toHaveBeenCalled();
  });

  it("normalizes Canadian dial formats to one E.164 phone in the CRM payload", async () => {
    const h = harness("new", { bodyOverrides: { phone: "+1 (450) 234-5678" } });
    const response = await h.run();
    expect(response.status).toBe(200);
    expect(h.inserts).toHaveLength(1);
    const record = h.inserts[0] as { payload: Record<string, unknown> };
    expect(record.payload.phone).toBe("+14502345678");
    expect(h.outbound).not.toHaveBeenCalled();
  });

  it("HTML-escapes user-controlled lead fields in the internal notification", async () => {
    const companyName = "<script>alert('x')</script> & Services";
    const h = harness("new", { notify: true, companyName });
    const response = await h.run();
    expect(response.status).toBe(200);
    expect(h.inserts).toHaveLength(1);
    expect(h.outbound).toHaveBeenCalledTimes(1);
    const requestInit = h.outbound.mock.calls[0]?.[1];
    const email = JSON.parse(String(requestInit?.body));
    expect(email.html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; Services");
    expect(email.html).not.toContain("<script>");
  });
});
