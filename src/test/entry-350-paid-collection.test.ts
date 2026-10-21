// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { transform } from "esbuild";
import * as guards from "../../supabase/functions/_shared/checkoutGuards";
import { verifyEntry350TaxContract } from "../../supabase/functions/_shared/entry350Tax";

const source = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");

// Execute the complete real handler; only Stripe verification and DB I/O are
// adapters. No network, accounts, payments or production database writes.
async function run(session: Record<string, unknown>, livemode = true) {
  const writes: { table: string; value: Record<string, unknown> }[] = [];
  let sensitiveCalls = 0;
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const sensitive = new Set(["contractors", "user_roles", "contractor_subscriptions", "contractor_activation_ledger", "billing_checkout_sessions", "verified_contractor_prospects"]);
  const db = {
    auth: { admin: { createUser: () => { sensitiveCalls++; throw new Error("Provisioning forbidden"); } } },
    rpc: () => { sensitiveCalls++; throw new Error("RPC forbidden"); },
    from(table: string) {
      if (sensitive.has(table)) { sensitiveCalls++; throw new Error("Activation forbidden"); }
      let value: Record<string, unknown> | undefined;
      const q: any = {
        select: () => q, eq: () => q, limit: () => q,
        insert: (v: Record<string, unknown>) => { value = v; return q; },
        update: (v: Record<string, unknown>) => { value = v; return q; },
        maybeSingle: async () => ({ data: null, error: null }),
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
          if (value) writes.push({ table, value });
          return Promise.resolve({ data: null, error: null }).then(res, rej);
        },
      };
      return q;
    },
  };
  const event = { id: "evt_fixture", type: "checkout.session.completed", livemode, data: { object: session } };
  class StripeFixture {
    webhooks = { constructEventAsync: async () => event };
  }
  const deno = {
    env: { get: () => "fixture-only" },
    serve: (fn: typeof handler) => { handler = fn; },
  };
  const { code } = await transform(source.replace(/^import[^\n]*\n/gm, ""), { loader: "ts", target: "es2022" });
  new Function("Deno", "Stripe", "createClient", ...Object.keys(guards), "revokeEntry350", "verifyEntry350TaxContract", "reverseEntry350Commission", "entry350SessionRevoked", code)(
    deno, StripeFixture, () => db, ...Object.values(guards), () => { throw new Error("Unexpected revocation"); }, verifyEntry350TaxContract, async () => "test_ignored", async () => false,
  );
  if (!handler) throw new Error("Handler missing");
  const response = await handler(new Request("https://fixture.invalid", {
    method: "POST", headers: { "stripe-signature": "fixture-only" }, body: "{}",
  }));
  return { status: response.status, body: await response.json(), writes, sensitiveCalls };
}

const session = (offer: string) => ({
  id: "cs_fixture", object: "checkout.session", status: "complete", mode: "payment",
  payment_status: "paid", currency: "cad", amount_subtotal: 35000,
  amount_total: offer === "entry_activation_350" ? 40241 : 35000,
  metadata: { offer, contractor_id: "fixture-contractor" },
});

describe.each(["entry_activation_350", "entry_pack_350"])("%s — actual webhook collection gate", (offer) => {
  it.each([
    ["free 100% discount", { payment_status: "no_payment_required", amount_total: 0 }],
    ["unpaid", { payment_status: "unpaid" }],
    ["zero paid", { amount_total: 0 }],
    ["discounted paid", { amount_total: 34999 }],
    ["wrong mode", { mode: "subscription" }],
    ["wrong currency", { currency: "usd" }],
    ["wrong subtotal", { amount_subtotal: 100 }],
    ["tax underpayment", { amount_total: 35000, total_details: { amount_tax: 5241 } }],
  ])("blocks %s before activation and paid telemetry", async (_label, changes) => {
    const result = await run({ ...session(offer), ...changes });
    expect(result.status).toBe(200);
    expect(result.body.ignored).toMatch(/^ignored_/);
    expect(result.sensitiveCalls).toBe(0);
    expect(result.writes.some(w => w.value.step === "stripe_payment_succeeded")).toBe(false);
    expect(result.writes.some(w => w.value.payment_status === "paid")).toBe(false);
    expect(result.writes.some(w => w.value.processing_status === "processed")).toBe(false);
  });
  it("accepts its actual creation contract payable amount", () => {
    expect(guards.entry350PaymentBlockReason(session(offer))).toBeNull();
  });
});

describe("tax contracts and legacy separation", () => {
  it("personalized requires 40241 cents, invited requires 35000 cents", () => {
    expect(guards.entry350PaymentBlockReason({ ...session("entry_activation_350"), amount_total: 40240 })).toBe("ignored_amount_mismatch");
    expect(guards.entry350PaymentBlockReason({ ...session("entry_pack_350"), amount_total: 35000 })).toBeNull();
  });
  it("legacy free-session semantics remain unchanged", () => {
    expect(guards.isSessionPaid({ payment_status: "no_payment_required" })).toBe(true);
  });
  it("rejects missing/invalid totals and tax", () => {
    for (const values of [{ amount_total: null }, { amount_total: NaN }, { total_details: { amount_tax: -1 } }]) {
      expect(guards.entry350PaymentBlockReason({ ...session("entry_pack_350"), ...values })).toBe("ignored_amount_mismatch");
    }
  });
});