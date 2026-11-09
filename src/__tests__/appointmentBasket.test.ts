import { describe, it, expect } from "vitest";
import {
  composeBasketQuote,
  seasonForMonth,
  type TaskSizeRate,
  type TradeSizeDefinition,
} from "../../supabase/functions/_shared/appointmentBasket";

// Synthetic, admin-validated registers for a landscaper (test values only).
const T = "paysagiste";
const size = (service_slug: string, s: TradeSizeDefinition["size"], validated = true): TradeSizeDefinition =>
  ({ trade_slug: T, service_slug, size: s, min_value_cents: 100_00, max_value_cents: 900_00, validated });
const rate = (service_slug: string, s: TaskSizeRate["size"], cents: number, season: TaskSizeRate["season"] = null, validated = true): TaskSizeRate =>
  ({ trade_slug: T, service_slug, size: s, season, zone_slug: null, unit_price_cents: cents, validated });

const sizes = [size("pave", "l"), size("pave", "xl"), size("lumieres-noel", "xs"), size("lumieres-noel", "s"), size("nettoyage", "m")];
const rates = [rate("pave", "l", 120_00, "ete"), rate("pave", "xl", 180_00, "ete"), rate("lumieres-noel", "xs", 25_00, "hiver"), rate("lumieres-noel", "s", 35_00), rate("nettoyage", "m", 40_00, "automne")];

const lines = [
  { service_slug: "pave", size: "l" as const, season: "ete" as const, monthly_qty: 2 },
  { service_slug: "pave", size: "xl" as const, season: "ete" as const, monthly_qty: 1 },
  { service_slug: "lumieres-noel", size: "xs" as const, season: "hiver" as const, monthly_qty: 4 },
  { service_slug: "lumieres-noel", size: "s" as const, season: "hiver" as const, monthly_qty: 2 },
];

describe("custom appointment basket", () => {
  it("summer and winter previews compute exact lines and totals", () => {
    const ete = composeBasketQuote({ trade_slug: T, season: "ete", lines, sizes, rates });
    expect(ete.status).toBe("payable");
    expect(ete.included_appointments).toBe(3);
    expect(ete.total_cents).toBe(2 * 120_00 + 180_00);
    const hiver = composeBasketQuote({ trade_slug: T, season: "hiver", lines, sizes, rates });
    expect(hiver.included_appointments).toBe(6);
    expect(hiver.total_cents).toBe(4 * 25_00 + 2 * 35_00);
  });

  it("budget cap trims the costliest line first and stays positive", () => {
    const q = composeBasketQuote({ trade_slug: T, season: "ete", lines, sizes, rates, monthly_budget_cents: 300_00 });
    expect(q.budget_adjusted).toBe(true);
    expect(q.total_cents).toBe(240_00);
    expect(q.included_appointments).toBe(2);
    expect(q.status).toBe("payable");
  });

  it("budget too low for any appointment blocks the plan sale", () => {
    const q = composeBasketQuote({ trade_slug: T, season: "ete", lines, sizes, rates, monthly_budget_cents: 50_00 });
    expect(q.included_appointments).toBe(0);
    expect(q.status).toBe("blocked");
  });

  it("XXS without a validated trade definition stays to confirm", () => {
    const q = composeBasketQuote({ trade_slug: T, season: "hiver", sizes, rates, lines: [{ service_slug: "lumieres-noel", size: "xxs", season: "hiver", monthly_qty: 3 }] });
    expect(q.lines[0].status).toBe("size_to_confirm");
    expect(q.status).toBe("to_confirm");
    expect(q.included_appointments).toBe(0);
  });

  it("never applies another trade's sizes or rates", () => {
    const q = composeBasketQuote({ trade_slug: "couvreur", season: "ete", lines, sizes, rates });
    expect(q.lines.every((l) => l.status === "size_to_confirm")).toBe(true);
    expect(q.status).toBe("to_confirm");
  });

  it("unvalidated or out-of-season rates are not used", () => {
    const q = composeBasketQuote({ trade_slug: T, season: "automne", sizes, rates: [rate("nettoyage", "m", 40_00, "automne", false)], lines: [{ service_slug: "nettoyage", size: "m", season: "automne", monthly_qty: 2 }] });
    expect(q.lines[0].status).toBe("rate_to_confirm");
    const off = composeBasketQuote({ trade_slug: T, season: "printemps", sizes, rates, lines: [{ service_slug: "pave", size: "l", season: "printemps", monthly_qty: 1 }] });
    expect(off.lines[0].status).toBe("rate_to_confirm");
  });

  it("maps Quebec months to seasons", () => {
    expect([1, 4, 7, 10, 12].map(seasonForMonth)).toEqual(["hiver", "printemps", "ete", "automne", "hiver"]);
  });
});
