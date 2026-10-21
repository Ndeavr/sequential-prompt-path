// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { transform } from "esbuild";

const source = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
const branch = source.slice(source.indexOf('if (session.metadata?.offer === "entry_activation_350")'), source.indexOf("// ── OFFRE DE REPLI"));

// Execute the real production branch with in-memory adapters only.
async function fixture(options: { failRole?: boolean; lookupError?: boolean; live?: boolean; qa?: boolean } = {}) {
  const state = { receipts: [] as Record<string, any>[], roles: 0, activated: false, paid: false, successEvents: 0 };
  let failRole = options.failRole === true;
  const db = {
    auth: { admin: { getUserById: async () => ({ data: { user: { email: options.qa ? "e2e+fixture@unpro.ca" : "fixture@example.invalid" } } }) } },
    from(table: string) {
      let operation = "read", payload: any, other = false;
      const query: any = {
        select: () => query, eq: () => query, limit: () => query,
        neq: (key: string) => { other = key === "metadata->>stripe_session_id"; return query; },
        insert: (value: any) => { operation = "insert"; payload = value; return query; },
        update: (value: any) => { operation = "update"; payload = value; return query; },
        upsert: (value: any) => { operation = "upsert"; payload = value; return query; },
        maybeSingle: async () => {
          if (options.lookupError) return { data: null, error: { message: "lookup unavailable" } };
          if (table === "contractors") return { data: { user_id: "fixture-owner", activation_status: state.activated ? "activated" : "pending" }, error: null };
          return { data: other ? null : state.receipts[0] ?? null, error: null };
        },
        then(resolve: (value: any) => unknown, reject: (reason: any) => unknown) {
          let error = null;
          if (table === "contractor_activation_ledger" && operation === "insert") state.receipts.push(payload);
          if (table === "user_roles") {
            if (failRole) { error = { message: "role write unavailable" }; failRole = false; }
            else state.roles = 1;
          }
          if (table === "contractors" && operation === "update") state.activated = true;
          if (table === "contractor_pricing_quotes" && operation === "update") state.paid = true;
          if (table === "contractor_funnel_events") state.successEvents++;
          return Promise.resolve({ error }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const { code } = await transform(branch, { loader: "ts", target: "es2022" });
  const { entryActivationDecision, addCalendarMonths, entry350CommissionArgs } = await import("../../supabase/functions/_shared/checkoutGuards");
  // Le vrai webhook importe addCalendarMonths et entry350CommissionArgs (checkoutGuards) : on les injecte dans la portée de la branche extraite.
  const runBranch = new Function("supabase", "session", "event", "entryActivationDecision", "addCalendarMonths", "entry350CommissionArgs", `return (async () => { ${code} })()`);
  const session = { id: "cs_fixture", mode: "payment", amount_subtotal: 35000, amount_total: 40241, currency: "cad", payment_status: "paid", metadata: { offer: "entry_activation_350", contractor_id: "fixture-contractor", quote_id: "fixture-quote" } };
  return { state, session, run: () => runBranch(db, session, { id: "evt_fixture", livemode: options.live !== false }, entryActivationDecision, addCalendarMonths, entry350CommissionArgs) };
}

describe("350 CAD — interrupted real webhook branch", () => {
  it("rejects an unsigned webhook even when its signing secret is missing, before DB access", async () => {
    let handler: ((request: Request) => Promise<Response>) | undefined;
    let dbCalls = 0;
    const raw = source.replace(/^import[^\n]*\n/gm, "");
    const { code } = await transform(raw, { loader: "ts", target: "es2022" });
    class StripeFixture {}
    const deno = { env: { get: (name: string) => name === "STRIPE_SECRET_KEY" ? "fixture" : undefined }, serve: (fn: typeof handler) => { handler = fn; } };
    const guards = await import("../../supabase/functions/_shared/checkoutGuards");
    new Function("Deno", "Stripe", "createClient", "shouldSkipRedelivery", "entryActivationDecision", code)(deno, StripeFixture, () => { dbCalls++; throw new Error("DB forbidden"); }, guards.shouldSkipRedelivery, guards.entryActivationDecision);
    if (!handler) throw new Error("Handler not registered");
    const result = await handler(new Request("https://fixture.invalid", { method: "POST", body: "{}" }));
    expect(result.status).toBe(503);
    expect(dbCalls).toBe(0);
  });
  it("resumes after a role failure without a second receipt or extending 12-month presence", async () => {
    const f = await fixture({ failRole: true });
    await expect(f.run()).rejects.toThrow("role write unavailable");
    expect(f.state.receipts).toHaveLength(1);
    expect(f.state.activated).toBe(false);
    const expiry = f.state.receipts[0].after_state.presence_ia_until;
    await f.run();
    expect(f.state).toMatchObject({ roles: 1, activated: true, paid: true });
    expect(f.state.receipts).toHaveLength(1);
    expect(f.state.receipts[0].after_state.presence_ia_until).toBe(expiry);
    await f.run();
    expect(f.state.receipts).toHaveLength(1);
    expect(f.state.successEvents).toBe(0);
  });
  it("fails closed on ownership/ledger lookup failure before any activation", async () => {
    const f = await fixture({ lookupError: true });
    await expect(f.run()).rejects.toThrow("ownership or ledger lookup failed");
    expect(f.state.receipts).toHaveLength(0);
    expect(f.state.activated).toBe(false);
  });
  it("does not activate a TEST payment on a non-QA account", async () => {
    const f = await fixture({ live: false });
    await f.run();
    expect(f.state.receipts).toHaveLength(0);
    expect(f.state.activated).toBe(false);
  });
  it("does not activate wrong amounts, currencies or unpaid sessions", async () => {
    for (const change of [{ amount_subtotal: 100 }, { currency: "usd" }, { payment_status: "unpaid" }]) {
      const f = await fixture();
      Object.assign(f.session, change);
      await f.run();
      expect(f.state.receipts).toHaveLength(0);
      expect(f.state.activated).toBe(false);
    }
  });
});