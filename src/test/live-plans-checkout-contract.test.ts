import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const ui = readFileSync("src/pages/entrepreneur/activation/ScreenPayment.tsx", "utf8");
const legacy = readFileSync("supabase/functions/create-stripe-checkout-session/index.ts", "utf8");
const personalized = readFileSync("src/pages/contractor-funnel/PageContractorPersonalizedPlan.tsx", "utf8");
const canonical = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");

describe("UNPRO LIVE payments across existing offers", () => {
  it("never marks a subscription paid without a real Stripe checkout and webhook", () => {
    expect(ui).toContain('throw new Error("checkout_url_missing")');
    expect(ui).not.toContain('payment_status: "paid"');
    expect(ui).toContain("redirectToCheckout(data.url)");
    expect(personalized).toContain("quoteId: quote.id");
    expect(personalized).toContain("redirectToCheckout(url)");
  });
  it("honors the actual selected monthly or annual interval and disclosed amount", () => {
    expect(ui).toContain('state.billing_cycle === "monthly"');
    expect(ui).toContain("isAnnual ? plan.yearly : plan.monthly");
    expect(ui).toContain("periodLabel");
    expect(legacy).toContain('from("plans")');
    expect(legacy).toContain('.eq("active", true)');
    expect(legacy).toContain('.eq("audience", "contractor")');
    expect(legacy).toContain('plan.legacy === true');
    expect(legacy).toContain("const taxRates = await ensureQuebecTaxRates(stripe)");
    expect(legacy).toContain("product_data:");
    expect(legacy).toContain('mode: "subscription"');
  });
  it("protects money, identity and recovery, not speculative launch gates", () => {
    expect(legacy).toContain('stripe.prices.retrieve(publishedPriceId)');
    expect(legacy).toContain("const amountCents");
    expect(legacy).toContain("allowedOrigins.has(requestedOrigin)");
    expect(legacy).toContain("idempotencyKey: requestKey");
    expect(legacy).toContain('"plan_checkout_attempted"');
    expect(legacy).toContain('"plan_checkout_failed"');
    expect(legacy).toContain('"plan_checkout_created"');
    expect(legacy).toContain('stripe_checkout_session_id: session.id');
    expect(legacy).not.toContain('const planPrices:');
    expect(canonical).toContain('entry350TaxCollectionApproved');
    expect(canonical).toContain('const isEntryActivation = entryActivation === true');
  });
});
