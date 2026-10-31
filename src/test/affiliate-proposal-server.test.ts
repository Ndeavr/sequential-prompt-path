// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const token = "a".repeat(64);
const context = { id: "proposal-1", prospect_id: "prospect-1", affiliate_entity_id: "affiliate-1", ref: "QA-REF", offer_type: "personnalise" };
function harness(file: string, rows: Record<string, unknown>, anonymous = false) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  let writes = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: anonymous ? null : { id: "client-1", email: "qa@example.invalid", user_metadata: {} } }, error: null }) },
    rpc: async () => ({ data: context, error: null }),
    from: (table: string) => {
      const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: rows[table] ?? null, error: null }), single: async () => ({ data: rows[table] ?? null, error: null }), insert: () => { writes++; throw new Error("unexpected write"); } };
      return q;
    },
  };
  const source = readFileSync(file, "utf8").replace(/^import[\s\S]*?;\s*$/gm, "");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: {}, Deno: { env: { get: () => "fixture-only" }, serve: (f: typeof handler) => { handler = f; } }, createClient: () => client, Response, console,
  });
  return { writes: () => writes, run: async (body: Record<string, unknown>) => {
    if (!handler) throw new Error("handler missing");
    return handler(new Request("https://fixture.invalid", { method: "POST", headers: { Authorization: "Bearer fixture-local-only" }, body: JSON.stringify(body) }));
  } };
}
describe("real proposal server handlers, synthetic IO without provider calls", () => {
  const checkout = "supabase/functions/create-checkout-session/index.ts";
  it("refuses pairing a token with an unrelated quote", async () => {
    const h = harness(checkout, { contractor_pricing_quotes: { user_id: "client-1", input_payload: {} } });
    expect((await h.run({ quoteId: "quote-1", affiliateProposalToken: token })).status).toBe(403);
    expect(h.writes()).toBe(0);
  });
  it("refuses another client's quote before proposal lookup or Stripe", async () => {
    const h = harness(checkout, { contractor_pricing_quotes: { user_id: "other-client", input_payload: {} } });
    expect((await h.run({ quoteId: "quote-1" })).status).toBe(403);
    expect(h.writes()).toBe(0);
  });
  it("refuses a persisted prospect mismatch", async () => {
    const h = harness(checkout, { contractor_pricing_quotes: { user_id: "client-1", input_payload: { affiliate_proposal_id: context.id, affiliate_prospect_id: "other-prospect" } }, affiliate_proposals: { client_draft_token: token }, affiliates: { user_id: "affiliate-owner" } });
    expect((await h.run({ quoteId: "quote-1" })).status).toBe(403);
    expect(h.writes()).toBe(0);
  });
  it("affiliate owner cannot create a client quote from their own proposal", async () => {
    const h = harness("supabase/functions/compute-pricing-quote/index.ts", { affiliates: { user_id: "client-1" } });
    const response = await h.run({ affiliate_proposal_token: token });
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("client_confirmation_required");
    expect(h.writes()).toBe(0);
  });
  it("invalid query token never reaches quote writes", async () => {
    const h = harness("supabase/functions/compute-pricing-quote/index.ts", {}, true);
    expect((await h.run({ affiliate_proposal_token: "malformed" })).status).toBe(403);
    expect(h.writes()).toBe(0);
  });
});