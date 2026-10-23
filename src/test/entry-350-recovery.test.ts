// @vitest-environment node
import { describe, expect, it } from "vitest";
import { compileWebhookBranch, loadWebhookHandler, realSharedImports } from "./support/stripeWebhookHarness";

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
  // Real branch compiled as a function body (it may `return` a Response); every
  // real shared helper it references is injected, only DB/side effects are adapters.
  const shared = await realSharedImports(undefined, { entry350SessionRevoked: async () => false });
  const params = ["supabase", "session", "event", "corsHeaders", ...Object.keys(shared)];
  const runBranch = await compileWebhookBranch('if (session.metadata?.offer === "entry_activation_350")', "// ── OFFRE DE REPLI", params);
  const session = { id: "cs_fixture", mode: "payment", amount_subtotal: 35000, amount_total: 40241, currency: "cad", payment_status: "paid", metadata: { offer: "entry_activation_350", contractor_id: "fixture-contractor", quote_id: "fixture-quote" } };
  return { state, session, run: () => runBranch(db, session, { id: "evt_fixture", livemode: options.live !== false }, {}, ...Object.values(shared)) };
}

describe("350 CAD — interrupted real webhook branch", () => {
  it("rejects an unsigned webhook even when its signing secret is missing, before DB access", async () => {
    let dbCalls = 0;
    class StripeFixture { webhooks = { constructEventAsync: async () => { throw new Error("must not verify without secret"); } }; }
    const handler = await loadWebhookHandler({
      Deno: { env: { get: (name: string) => name === "STRIPE_SECRET_KEY" ? "fixture" : undefined } },
      Stripe: StripeFixture, createClient: () => { dbCalls++; throw new Error("DB forbidden"); },
    });
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