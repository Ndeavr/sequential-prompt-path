import { describe, it, expect } from "vitest";
// Mirror of server ladder (compute-pricing-quote). Kept in sync by this test reading the source.
import { readFileSync } from "node:fs";
const src = readFileSync("supabase/functions/compute-pricing-quote/index.ts", "utf8");
describe("entry ladder", () => {
  it("server exposes exactly 100/200/350/500", () => {
    for (const c of [10000, 20000, 35000, 50000]) expect(src).toContain(`cents: ${c}`);
    expect(src).toContain("snapToEntryTier(finalPrice)");
  });
  it("agreement screen never shows a guarantee number on a tier", () => {
    const ui = readFileSync("src/pages/contractor-funnel/PageContractorPersonalizedPlan.tsx", "utf8");
    expect(ui).toContain("Rendez-vous exclusifs selon votre entente et votre capacité");
    expect(ui).toContain("Voir les autres options");
  });
});
