import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const checkout = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
const webhook = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");

describe("entry350 trusted Stripe TEST identity", () => {
  it("never authorizes a test Checkout from self-editable user_metadata", () => {
    expect(checkout).toContain("userData.user.app_metadata ?? {}");
    expect(checkout).not.toContain("userData.user.user_metadata ?? {}");
    expect(checkout).toContain('meta.e2e_test === true || meta.e2e_test === "true"');
    expect(checkout).toContain("const activeStripeKey = useTestMode ? stripeTestKey : stripeKey");
    expect(checkout).toContain("qa_test_key_missing");
  });

  it("does not accept self-declared QA metadata for TEST webhook entitlement", () => {
    expect(webhook).toContain("u?.user?.app_metadata ?? {}");
    expect(webhook).not.toContain("u?.user?.user_metadata ?? {}");
    expect(webhook).toContain('md.e2e_test === true || md.e2e_test === "true"');
    expect(webhook).toContain('decision === "test_on_non_qa"');
    expect(webhook).toContain("entryActivationDecision({");
  });
});
