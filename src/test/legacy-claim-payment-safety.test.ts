import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const retired = readFileSync("supabase/functions/claim-create-checkout/index.ts", "utf8");
const claimPage = readFileSync("src/pages/entrepreneur/PageClaimWizard.tsx", "utf8");

describe("legacy profile-claim payment retirement", () => {
  it("fails closed on every non-preflight request without Stripe or database side effects", () => {
    expect(retired).toContain('error: "legacy_checkout_retired"');
    expect(retired).toMatch(/status:\s*410/);
    expect(retired).toContain('next_path: "/contractor/join"');
    expect(retired).not.toMatch(/import\s+Stripe\b|new\s+Stripe\(|checkout\.sessions\.create|createClient\(|SUPABASE_SERVICE_ROLE_KEY/);
    expect(retired).not.toMatch(/allow_promotion_codes|tax_rates|unit_amount/);
  });

  it("hands claim visitors to canonical identity-first enrollment, not legacy checkout", () => {
    expect(claimPage).toContain('to="/contractor/join"');
    expect(claimPage).not.toContain("claim-create-checkout");
    expect(claimPage).not.toMatch(/appointmentsLow|appointmentsHigh|revLow|revHigh|projectionRange|Rendez-vous estimés/);
    expect(claimPage).toContain("nom indicatif non vérifié");
    expect(claimPage).toContain("Aucun paiement sur cette page");
  });
});
