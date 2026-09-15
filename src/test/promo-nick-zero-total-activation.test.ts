/**
 * NICK / 100 % promo — production activation at 0 $.
 *
 * These tests lock the regressions that made a 100 % promo report success
 * without activating anything, and guarantee the checkout never asks for a
 * card when the plan is fully covered.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const intentFn = read("supabase/functions/create-subscription-intent/index.ts");
const checkoutPage = read("src/pages/checkout/PageCheckoutNativeScrollable.tsx");

describe("zero-total activation (edge function)", () => {
  it("never writes the non-existent contractors columns", () => {
    expect(intentFn).not.toMatch(/status:\s*"active",\s*\n\s*subscription_plan:/);
    expect(intentFn).not.toContain("subscription_plan: planCode");
  });

  it("writes the real contractor status columns", () => {
    expect(intentFn).toContain('account_status: "active"');
    expect(intentFn).toContain('activation_status: "activated"');
  });

  it("surfaces activation failures instead of reporting a false success", () => {
    expect(intentFn).toContain("zero_total_activation_failed");
    expect(intentFn).toContain("zero_total_subscription_failed");
  });

  it("persists a real production subscription at 0 $", () => {
    expect(intentFn).toContain('payment_method: "promo_code"');
    expect(intentFn).toContain("amount_paid_cents: 0");
    expect(intentFn).toContain('status: "active"');
  });

  it("writes the full audit trail with the canonical event name", () => {
    expect(intentFn).toContain("contractor_activation_ledger");
    expect(intentFn).toContain("unpro_payment_activation_audit");
    expect(intentFn).toContain("contractor_activation_events");
    expect(
      intentFn.match(/contractor_plan_activated_with_promo/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
  });

  it("records the promo economics required for audit", () => {
    expect(intentFn).toContain("original_price_cents");
    expect(intentFn).toContain("final_price_cents: 0");
    expect(intentFn).toContain("discount_percent: 100");
    expect(intentFn).toContain('account_mode: "production"');
  });

  it("is idempotent on replay", () => {
    expect(intentFn).toContain("already_active");
    expect(intentFn).toContain('{ onConflict: "contractor_id" }');
  });

  it("consumes the promo reservation", () => {
    expect(intentFn).toContain('.update({ status: "consumed" })');
  });

  it("never labels the activation as a test account", () => {
    const zeroBranch = intentFn.slice(intentFn.indexOf("Zero-total activation"));
    expect(zeroBranch.toLowerCase()).not.toMatch(/\b(test|demo|démo|trial|essai|sandbox)\b/);
  });
});

describe("checkout UI when the plan is fully covered", () => {
  it("detects a fully covered plan from backend pricing only", () => {
    expect(checkoutPage).toContain("const fullyCovered =");
    expect(checkoutPage).toContain("pricing.total_due_today === 0");
  });

  it("never mounts the Stripe Payment Element at 0 $", () => {
    expect(checkoutPage).toContain("{!fullyCovered && clientSecret && stripePromise && (");
    expect(checkoutPage).toContain("{!fullyCovered && intentLoading && (");
  });

  it("requires an explicit CTA before activating", () => {
    expect(checkoutPage).toContain("Activer mon forfait");
    expect(checkoutPage).toContain("activateCoveredPlan");
  });

  it("waits for pricing to match the applied coupon before any intent", () => {
    expect(checkoutPage).toContain("pricingInSync");
  });

  it("shows the crossed-out price, 0 $ and the covered wording", () => {
    expect(checkoutPage).toContain("line-through");
    expect(checkoutPage).toContain("Votre forfait est entièrement offert grâce au code");
    expect(checkoutPage).toContain("Code {pricing.coupon?.code} appliqué");
  });

  it("uses no trial or test wording", () => {
    expect(checkoutPage.toLowerCase()).not.toContain("compte gratuit temporaire");
    expect(checkoutPage.toLowerCase()).not.toContain("période d'essai");
    expect(checkoutPage.toLowerCase()).not.toContain("sandbox");
  });

  it("keeps the normal paid checkout intact", () => {
    expect(checkoutPage).toContain("<PaymentElement");
    expect(checkoutPage).toContain("stripe.confirmPayment");
  });
});
