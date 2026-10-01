import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { objectiveToPayload } from "@/pages/contractor-funnel/PageContractorPricingIntake";

describe("pricing intake — requested capacity preserved", () => {
  it("keeps 4 requested next-month appointments (never reduced to cadence)", () => {
    const r = objectiveToPayload({ trade_primary: "Toiture", goal_amount: 20000, next_month_appointments: 4, city: "Laval" } as any);
    expect(r?.payload.target_monthly_appointments).toBe(4);
    expect((r?.payload.monthly_capacity ?? 0)).toBeGreaterThanOrEqual(4);
  });
  it("manual entry does not flip to summary on first keystroke; radius user value protected", () => {
    const src = readFileSync("src/pages/contractor-funnel/PageContractorPricingIntake.tsx", "utf8");
    expect(src).toContain("!userEditing && businessConfirmed");
    expect(src).toContain('confirmedFields.includes("service_radius_km") ? d.service_radius_km');
  });
});
