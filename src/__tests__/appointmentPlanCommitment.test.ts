import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEFAULT_MARGIN_CONFIG,
  appointmentPlanPayable,
  resolveTierCommitment,
  type PricedTarget,
} from "../../supabase/functions/_shared/pricingModes";

/** Synthetic canonical chain: base + per-appointment price. */
const chain = (perAppt: number, base = 4900) => (target: number): PricedTarget => ({
  target,
  plan_code: "pro_v2",
  monthly_price_cents: base + target * perAppt,
  capacity_capped: false,
});
const tier = (over: Partial<Parameters<typeof resolveTierCommitment>[0]> = {}) => ({
  tier_cents: 50000,
  target_monthly_appointments: 80,
  market_ceiling: null,
  contractor_capacity: 80,
  market_unavailable: false,
  margin: DEFAULT_MARGIN_CONFIG,
  ...over,
});

describe("monthly appointment plan commitment (P0 2026-11-09)", () => {
  it("500 $ tier without market capacity never yields a payable plan", () => {
    const c = resolveTierCommitment(tier({ market_ceiling: 0 }), chain(9000));
    expect(c.monthly_appointments).toBe(0);
    expect(c.status).toBe("unresolved");
    expect(appointmentPlanPayable(50000, c.monthly_appointments).payable).toBe(false);
  });

  it("500 $ tier with a closed market is unresolved", () => {
    const c = resolveTierCommitment(tier({ market_unavailable: true }), chain(9000));
    expect(c.monthly_appointments).toBe(0);
    expect(appointmentPlanPayable(50000, 0).payable).toBe(false);
  });

  it("old unpaid quote with 0 included is refused at checkout", () => {
    expect(appointmentPlanPayable(50000, 0)).toEqual({ payable: false, monthly_appointments: 0 });
    expect(appointmentPlanPayable(50000, null).payable).toBe(false);
  });

  it("capable 500 $ tier carries the exact solved volume, never the 80 target", () => {
    // 4900 + n*9000 <= 50000 → n = 5 ; margin check passes at default config.
    const c = resolveTierCommitment(tier(), chain(9000));
    expect(c.monthly_appointments).toBe(5);
    expect(c.period).toBe("month");
    const gate = appointmentPlanPayable(50000, c.monthly_appointments);
    expect(gate).toEqual({ payable: true, monthly_appointments: 5 });
  });

  it("other trade with costlier appointments resolves fewer included", () => {
    const c = resolveTierCommitment(tier(), chain(20000));
    expect(c.monthly_appointments).toBe(2);
  });

  it("included volume is capped by contractor capacity and declared target", () => {
    expect(resolveTierCommitment(tier({ contractor_capacity: 3 }), chain(9000)).monthly_appointments).toBe(3);
    expect(resolveTierCommitment(tier({ target_monthly_appointments: 2 }), chain(9000)).monthly_appointments).toBe(2);
  });

  it("server wiring: quote attaches the tier commitment and checkout gates + forwards it", () => {
    const q = readFileSync("supabase/functions/compute-pricing-quote/index.ts", "utf8");
    expect(q).toContain("entryTier ? (tierCommitment?.monthly_appointments ?? 0)");
    const c = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
    expect(c).toContain("appointmentPlanPayable(q.recommended_monthly_price, q.guaranteed_appointments)");
    expect(c).toContain('code: "appointment_commitment_missing"');
    expect(c).toContain("guaranteed_appointments: String(quoteIncludedAppointments)");
    // 350 $ activation never inherits a monthly plan volume.
    expect(c).toContain("entryGuaranteed = null;");
  });
});
