// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { benchmarkCategory, checkoutParity, publicQuoteView, quoteCheckoutTotals } from "../../supabase/staged/pricing-checkout-parity/pricingParity";
import { appointmentsNeeded } from "@/lib/pricing/planNeedsView";
import { annualPresenceLines } from "@/lib/pricing/annualPresenceView";

const PATCH = readFileSync("supabase/staged/pricing-checkout-parity/pricing-checkout-parity.patch", "utf8");
function patched(path: string) {
  const lines = readFileSync(path, "utf8").split("\n");
  const section = PATCH.split(`--- a/${path}\n`)[1]?.split("\ndiff --git ")[0];
  if (!section) throw new Error("missing staged section");
  let offset = 0;
  for (const hunk of section.split(/(?=^@@ )/m).slice(1)) {
    const h = /^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@.*\n/.exec(hunk)!;
    const body = hunk.slice(h[0].length).split("\n").filter((l) => /^[ +\-]/.test(l));
    const before = body.filter((l) => l[0] !== "+").map((l) => l.slice(1));
    const after = body.filter((l) => l[0] !== "-").map((l) => l.slice(1));
    const start = Number(h[1]) - 1 + offset;
    if (lines.slice(start, start + before.length).join("\n") !== before.join("\n")) throw new Error("stale staged patch");
    lines.splice(start, before.length, ...after);
    offset += after.length - before.length;
  }
  return lines.join("\n");
}

// Synthetic copy of the 25 active benchmark rows' relevant subset (cents).
const BENCH = [
  { category_slug: "isolation", market_slug: "montreal", final_appointment_price_cents: 9360, data_source: "x" },
  { category_slug: "isolation", market_slug: "laval", final_appointment_price_cents: 8450, data_source: "x" },
  { category_slug: "isolation", market_slug: "quebec", final_appointment_price_cents: 7800, data_source: "x" },
  { category_slug: "isolation", market_slug: "trois-rivieres", final_appointment_price_cents: 6240, data_source: "x" },
];
function unitPriceResolver() {
  const src = patched("supabase/functions/compute-pricing-quote/index.ts").replace(/^import[\s\S]*?;\n/gm, "") + "\nexports.__r = resolveAppointmentUnitPrice;";
  const ctx: any = { exports: {}, console, Date, Math, JSON, URL, Response, Request, crypto, Deno: { env: { get: () => undefined }, serve: () => undefined }, createClient: () => ({}), benchmarkCategory, publicQuoteView };
  runInNewContext(ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, ctx);
  const svc = (rows: any[]) => ({ from: (t: string) => {
    let cat = ""; const q: any = { select: () => q, order: () => q, eq: (k: string, v: any) => { if (k === "category_slug") cat = v; return q; } };
    q.then = (r: any) => Promise.resolve({ data: t === "appointment_pricing_benchmarks" ? rows.filter((x) => x.category_slug === cat) : [], error: null }).then(r);
    return q;
  } });
  return (trade: string, city: string, rows = BENCH) => ctx.exports.__r(svc(rows), { average_project_value: 0 }, 0.4, {}, trade, city);
}

describe("benchmark alias (internal lookup only)", () => {
  it("maps sub-services to existing canonical categories, never invents one", () => {
    expect(benchmarkCategory("isolation-d-entretoit")).toBe("isolation");
    expect(benchmarkCategory("toiture")).toBe("toiture");
    expect(benchmarkCategory("plomberie")).toBeNull();
    expect(benchmarkCategory("pavage-asphalte")).toBeNull();
  });
  it("Montréal / Laval isolation d'entretoit use the exact city×trade benchmark", async () => {
    const r = unitPriceResolver();
    expect(await r("isolation-d-entretoit", "montreal")).toMatchObject({ price_cents: 9360, status: "benchmark_trade_market" });
    expect(await r("isolation-d-entretoit", "laval")).toMatchObject({ price_cents: 8450, status: "benchmark_trade_market" });
  });
  it("unknown market falls back to the internal trade average; no benchmark → unavailable", async () => {
    const r = unitPriceResolver();
    expect(await r("isolation-d-entretoit", "sherbrooke")).toMatchObject({ price_cents: 7963, status: "benchmark_trade" });
    expect(await r("plomberie", "montreal", [])).toMatchObject({ price_cents: null, status: "unavailable" });
  });
});

describe("one-time 350 $ + monthly plan: screen = Stripe", () => {
  it("Montréal 500 $/mois + Présence due: 977,29 $ today, 574,88 $ after", () => {
    expect(quoteCheckoutTotals({ planCents: 50000, presenceIncluded: true, presenceCents: 35000 })).toEqual({ today_cents: 97729, recurring_cents: 57488 });
    const screen = annualPresenceLines(50000, { state: "required", expired: false });
    expect(screen.today.total).toBe(97729);
  });
  it("Présence already paid: 350 $ never charged again", () => {
    expect(quoteCheckoutTotals({ planCents: 50000, presenceIncluded: false, presenceCents: 35000 }).today_cents).toBe(57488);
    expect(annualPresenceLines(50000, { state: "covered", reason: "valid_annual_presence", validUntil: null }).today.total).toBe(57488);
    expect(PATCH).toContain("+    if (presenceIncluded || quoteRow) profileFeeCents = 0;");
  });
  it("mismatch between screen and server blocks checkout", () => {
    const server = { planCents: 50000, presenceIncluded: true, presenceCents: 35000 };
    expect(checkoutParity({ presenceIncluded: false, todayCents: 57488 }, server)).toMatchObject({ ok: false, code: "presence_mismatch", expected_today_cents: 97729 });
    expect(checkoutParity({ todayCents: 57488 }, server)).toMatchObject({ ok: false, code: "checkout_total_mismatch" });
    expect(checkoutParity({ presenceIncluded: true, todayCents: 97729 }, server)).toEqual({ ok: true, compared: true });
  });
  it("the plan page sends the displayed total and Présence to the server", () => {
    const ui = readFileSync("src/pages/contractor-funnel/PageContractorPersonalizedPlan.tsx", "utf8");
    expect(ui).toContain("displayedTodayCents: presenceLines.today.total");
    expect(ui).toContain("À payer aujourd'hui");
    expect(ui).toContain("Ensuite par mois (forfait, taxes incluses)");
  });
});

describe("contracts goal ≠ included appointments", () => {
  it("7 contracts at 40 % declared close → 18 appointments needed (not 3)", () => {
    expect(appointmentsNeeded(7, 0.4)?.needed).toBe(18);
    expect(appointmentsNeeded(4, 0.4)?.needed).toBe(10);
    expect(appointmentsNeeded(7, 0)).toBeNull();
    expect(appointmentsNeeded(null, 0.4)).toBeNull();
  });
  it("guest quote read hides internal sources, weights and margins", () => {
    const q = publicQuoteView({ id: "q", pricing_explanation: { entry_tier: { cents: 50000 }, appointment_recommendation: { contracts_per_month: 7 }, appointment_unit_basis: { benchmark: { source: "google_ads" } }, margin: { margin_ratio: 0.4 } } }) as any;
    expect(q.pricing_explanation.entry_tier).toEqual({ cents: 50000 });
    expect(q.pricing_explanation.appointment_recommendation).toBeTruthy();
    expect(q.pricing_explanation.appointment_unit_basis).toBeUndefined();
    expect(q.pricing_explanation.margin).toBeUndefined();
  });
});
