/**
 * UNPRO — Public surface protection (anonymous visitor)
 *
 * Guards that no publicly reachable code path selects internal contractor
 * columns. Anonymous visitors only hold column-level grants on public fields;
 * any internal column in a public query would break the page AND signal a leak.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const INTERNAL_COLUMNS = [
  "admin_note",
  "verification_notes",
  "internal_verified_score",
  "internal_notes",
  "booking_base_lat",
  "booking_base_lng",
  "postal_code",
  "insurance_info",
  "account_status",
  "activation_status",
  "stripe_customer_id",
  "user_id",
  "email",
  "address",
];

/** Files that render or query contractor data for anonymous visitors. */
const PUBLIC_SURFACES = [
  "src/hooks/usePublicContractors.ts",
  "src/hooks/useContractorPublicPage.ts",
  "src/pages/aipp/PageContractorAippProfile.tsx",
  "src/features/contractorProfile/recommendationPage/hooks/useContractorRecommendation.ts",
  "src/pages/PublicBookingPage.tsx",
  "src/lib/mcp/tools/get-contractor.ts",
  "src/lib/mcp/tools/search-contractors.ts",
];

/** Extract the `.select("...")` literal of every query on the contractors table. */
function contractorSelectLiterals(source: string): string[] {
  const out: string[] = [];
  const re = /from\(\s*"contractors"\s*\)[\s\S]{0,200}?\.select\(\s*(?:\n\s*)?"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  return out;
}


describe("public contractor surfaces expose no internal fields", () => {
  for (const file of PUBLIC_SURFACES) {
    it(`${file} selects only public-safe columns`, () => {
      const source = readFileSync(file, "utf8");
      const selects = contractorSelectLiterals(source);

      // A blanket select("*") would return every internal column.
      expect(selects.length, `${file} has no contractors query`).toBeGreaterThan(0);
      expect(selects, `${file} must not use select("*") on contractors`).not.toContain("*");

      for (const literal of selects) {
        const columns = literal.split(",").map((c) => c.trim());
        for (const internal of INTERNAL_COLUMNS) {
          expect(
            columns,
            `${file} selects internal column "${internal}"`,
          ).not.toContain(internal);
        }
      }
    });
  }
});
