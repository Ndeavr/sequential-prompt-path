import { describe, expect, it } from "vitest";
import { entry350PaymentBlockReason } from "../../supabase/functions/_shared/checkoutGuards";
import { readFileSync } from "node:fs";

// Source-only P0 sentinel: no Stripe call, DB, user information, live charge,
// webhook delivery or simulated success is performed. An isolated signed
// Stripe TEST / Auth / RLS E2E test remains required before payment release.
const invitedCheckout = readFileSync("supabase/functions/create-activation-checkout/index.ts", "utf8");
const signedWebhook = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");

describe("CAD 350 invited checkout must not enter legacy SMS $1 fulfillment", () => {
  it("keeps a paid entry_pack_350 invitation out of the historical sms_outreach branch", () => {
    // Source contract: a landing-token invitation can carry *both* fields.
    expect(invitedCheckout).toContain('offer: "entry_pack_350"');
    expect(invitedCheckout).toContain('landing_token: landing_token ?? ""');
    expect(invitedCheckout).toContain('source: source ?? (isOutreach ? "sms_outreach" : "")');

    const syntheticSession = {
      metadata: {
        offer: "entry_pack_350",
        source: "sms_outreach",
        landing_token: "synthetic-no-real-recipient",
      },
      payment_status: "paid",
      amount_subtotal: 35000,
      currency: "cad",
    };
    // This fixture qualifies for the 350 flow AND the original legacy guard.
    const legacyPredicate =
      syntheticSession.metadata.source === "sms_outreach" &&
      Boolean(syntheticSession.metadata.landing_token);
    const entryPackPredicate = syntheticSession.metadata.offer === "entry_pack_350";
    expect(legacyPredicate && entryPackPredicate).toBe(true);

    const legacyBranch = signedWebhook.indexOf("// SMS OUTREACH flow:");
    const entryPackBranch = signedWebhook.indexOf("// ENTRY PACK 350 $ flow");
    expect(entryPackBranch).toBeGreaterThan(-1);

    // Fail closed if an earlier legacy handler lacks a specific exclusion.
    // Once the source is corrected, either dispatch the paid 350 offer first
    // or explicitly exclude it from the legacy SMS branch.
    const legacyBeforePack = legacyBranch !== -1 && legacyBranch < entryPackBranch;
    const earlierLegacyBlock = legacyBeforePack
      ? signedWebhook.slice(legacyBranch, entryPackBranch)
      : "";
    const excludesEntryPack = /metadata\?\.offer\s*!==\s*["']entry_pack_350["']/.test(earlierLegacyBlock)
      || /metadata\?\.offer\s*===\s*["']entry_pack_350["']/.test(earlierLegacyBlock)
        && /(?:return|break)\s*;/.test(earlierLegacyBlock.slice(0, 600));
    expect(
      legacyBeforePack && !excludesEntryPack,
      "A 350 $ invited checkout would be swallowed by the earlier legacy SMS branch before the 12-month ledger."
    ).toBe(false);
  });

  it("also excludes alternate $350 offer metadata from the earlier $1 handler", () => {
    // Source-only guard for two documented paid $350 variants. A future refactor
    // must keep their metadata out of the historical SMS $1 path too.
    const legacyStart = signedWebhook.indexOf("// SMS OUTREACH flow:");
    const entryStart = signedWebhook.indexOf("// ENTRY PACK 350 $ flow");
    expect(legacyStart).toBeGreaterThanOrEqual(0);
    expect(entryStart).toBeGreaterThan(legacyStart);
    const legacyCode = signedWebhook.slice(legacyStart, entryStart);
    expect(legacyCode).toMatch(/session\.metadata\?\.offer\s*!==\s*["']entry_activation_350["']/);
    expect(legacyCode).toMatch(/session\.metadata\?\.offer_kind\s*!==\s*["']pack_350["']/);
  });
});


// Additional source-only guard for the active UI. A real Stripe TEST/Auth/RLS
// signed-webhook E2E gate remains required before any live payment change.
describe("CAD 350 active founder payment screen", () => {
  it("does not reintroduce guest founder checkout before canonical activation", () => {
    const screen = readFileSync("src/pages/entrepreneur/activation/ScreenPayment.tsx", "utf8");
    const start = screen.indexOf("const handlePay = async () => {");
    const nextPath = screen.indexOf("setProcessing(true);", start);
    expect(start).toBeGreaterThan(-1);
    expect(nextPath).toBeGreaterThan(start);
    const founderPath = screen.slice(start, nextPath);
    expect(founderPath).toContain("if (isFounder) {");
    expect(founderPath).toMatch(/navigate\(buildActivation350Links\(searchParams\)\.activate\);\s*return;/);
    expect(founderPath).not.toContain("create-founder-activation-checkout");
    expect(founderPath).not.toContain("create-stripe-checkout-session");
  });
});


describe("CAD 350 founder legacy checkout must use durable entry-pack fulfillment", () => {
  it("sends canonical metadata instead of the obsolete kind-only path", () => {
    const founderCaller = readFileSync(
      "supabase/functions/create-founder-activation-checkout/index.ts", "utf8"
    );
    const metadataStart = founderCaller.indexOf("metadata: {");
    expect(metadataStart).toBeGreaterThan(-1);
    const metadata = founderCaller.slice(metadataStart, founderCaller.indexOf("},", metadataStart));
    expect(metadata).toContain('offer: "entry_pack_350"');
    expect(metadata).toContain('offer_kind: "pack_350"');
    expect(metadata).toContain('amount_cents: String(OFFER_350.price_cents)');
    expect(founderCaller).toContain('mode: "payment"');
    expect(founderCaller).toContain('automatic_tax: { enabled: true }');

    // This same canonical offer is checked for real payment and exact
    // pre-tax amount before the existing 12-month entitlement ledger.
    expect(signedWebhook).toContain("const block = entry350PaymentBlockReason(session);");
    expect(signedWebhook).toContain('if (session.metadata?.offer === "entry_pack_350") {');
    expect(signedWebhook).toContain('action: "entry_activation_350_paid"');
    // Source guard only: signed Stripe TEST + Auth/RLS E2E is still required.
  });
});

// Pure synthetic guard: this does not call Stripe, create a sale, or test a
// signed event in an isolated E2E environment.
describe("CAD 350 net pretax fulfillment guard", () => {
  it("rejects discounted non-PROMO sessions even if the subtotal is 35000", () => {
    const fullPrice = {
      payment_status: "paid", mode: "payment", currency: "cad",
      amount_subtotal: 35000, amount_total: 40241,
      total_details: { amount_tax: 5241, amount_discount: 0 },
      metadata: { offer: "entry_pack_350" },
    };
    expect(entry350PaymentBlockReason(fullPrice)).toBeNull();
    // Fail closed even if another charge masks a Stripe Checkout discount.
    expect(entry350PaymentBlockReason({
      ...fullPrice, total_details: { amount_tax: 5241, amount_discount: 100 },
    })).toBe("ignored_amount_mismatch");
    // Realistic $10 reduction also decreases the taxable amount.
    expect(entry350PaymentBlockReason({
      ...fullPrice, amount_total: 39103,
      total_details: { amount_tax: 5103, amount_discount: 1000 },
    })).toBe("ignored_amount_mismatch");
    expect(entry350PaymentBlockReason({
      ...fullPrice, metadata: { offer: "entry_pack_350", entry_tax_contract: "qc-exclusive-v1" },
      total_details: { amount_tax: 5241, amount_discount: 100 },
    })).toBe("ignored_amount_mismatch");
    expect(entry350PaymentBlockReason({
      ...fullPrice, payment_status: "no_payment_required", amount_total: 0,
    })).toBe("ignored_unpaid");
  });
});
