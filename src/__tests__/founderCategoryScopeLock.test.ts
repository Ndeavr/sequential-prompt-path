import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { checkFounderEligibility, type FounderEligibilityTransport } from "@/lib/founderEligibility";

const PROFESSIONAL_SLUGS = [
  "agent-courtier-immobilier",
  "arpenteur-geometre",
  "courtier-hypothecaire",
  "evaluateur-immobilier",
  "inspecteur-batiment",
  "notaire",
];

const serverPolicyMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260907152209_6ec1f902-3780-43e9-a68b-66438b1bef4e.sql"),
  "utf8",
);

function transportFor(data: unknown): FounderEligibilityTransport {
  return vi.fn().mockResolvedValue({ data, error: null });
}

describe("verrou de portée serveur de l'offre fondateur", () => {
  it("keeps the residential-service guard in the canonical server policy", () => {
    expect(serverPolicyMigration).toContain("public.check_founder_eligibility");
    expect(serverPolicyMigration).toContain("AND group_type = 'local_service'");
    expect(serverPolicyMigration).toContain("'category_not_eligible'");
  });

  it("passes a positive server response through the client transport boundary", async () => {
    const transport = transportFor({ eligible: true, reason: null, city_remaining: 6 });

    await expect(checkFounderEligibility("Laval", "lavage-de-vitres", transport)).resolves.toEqual({
      eligible: true,
      reason: null,
      cityRemaining: 6,
    });
    expect(transport).toHaveBeenCalledWith({
      p_city: "Laval",
      p_category_slug: "lavage-de-vitres",
    });
  });

  it.each(PROFESSIONAL_SLUGS)("does not turn a server rejection into eligibility for %s", async (slug) => {
    await expect(
      checkFounderEligibility(
        "Laval",
        slug,
        transportFor({ eligible: false, reason: "category_not_eligible", city_remaining: null }),
      ),
    ).resolves.toEqual({ eligible: false, reason: "category_not_eligible", cityRemaining: null });
  });

  it("fails closed for a malformed server response", async () => {
    await expect(checkFounderEligibility("Laval", "lavage-de-vitres", transportFor(null))).resolves.toEqual({
      eligible: false,
      reason: "invalid_response",
      cityRemaining: null,
    });
  });
});
