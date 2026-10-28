import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const legacyGuest = readFileSync(
  "supabase/functions/pro-founder-checkout-guest/index.ts", "utf8",
);
const privateOnboarding = readFileSync(
  "src/pages/pro/PageProPrivateOnboarding.tsx", "utf8",
);

describe("P0: legacy founder guest Checkout is retired", () => {
  it("fails closed without creating any payment or granting any status", () => {
    expect(legacyGuest).toContain("Deno.serve");
    expect(legacyGuest).toContain("status: 410");
    expect(legacyGuest).toContain('next_path: "/contractor/join"');
    expect(legacyGuest).not.toMatch(/new Stripe\s*\(|checkout\.sessions\.create|from\(["']founder_score_prospects["']\)/);
    expect(legacyGuest).not.toContain("spots_remaining");
    expect(legacyGuest).not.toContain("rendez-vous exclusifs garantis");
  });

  it("the existing private onboarding page does not invoke the retired checkout", () => {
    expect(privateOnboarding).not.toMatch(/functions\.invoke\(["']pro-founder-checkout-guest["']/);
    expect(privateOnboarding).toContain("/entrepreneurs/audit-ia");
  });
});
