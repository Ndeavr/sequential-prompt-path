import { describe, expect, it } from "vitest";
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
});
