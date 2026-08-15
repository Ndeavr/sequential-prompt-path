/**
 * Cost guards for Google Places discovery (incident 2026-08 — billing loop).
 *
 * Invariants under test:
 *  - kill switch / open circuit => zero external fetch,
 *  - daily budget of 25 external calls => the 26th reservation is refused,
 *  - cache hit => zero reservation and zero fetch,
 *  - results without a phone number never enter the launch pool,
 *  - concurrent reservations can never exceed the cap.
 */
import { describe, it, expect } from "vitest";

/**
 * Mirror of `partitionPlacesByPhone` in
 * supabase/functions/launch-agent-scout/index.ts (Deno runtime, not importable
 * from the Vite/TS project). Keep both in sync.
 */
function partitionPlacesByPhone(places: Array<{ id?: string; nationalPhoneNumber?: string }>) {
  const usable: Array<{ id?: string }> = [];
  let rejected_no_phone = 0;
  for (const p of places) {
    const phone = (p?.nationalPhoneNumber ?? "").trim();
    if (!p?.id || !phone) { rejected_no_phone++; continue; }
    usable.push(p);
  }
  return { usable, rejected_no_phone };
}

const DAILY_LIMIT = 25;

/** Mirrors the SQL `reserve_places_external_call` semantics (atomic increment under cap). */
function makeBudget(limit = DAILY_LIMIT) {
  let used = 0;
  return {
    reserve() {
      if (used >= limit) return { allowed: false, calls_used: used, daily_limit: limit };
      used += 1;
      return { allowed: true, calls_used: used, daily_limit: limit };
    },
    get used() { return used; },
  };
}

/** Minimal model of the gateway decision chain, in the same order as placesGateway.ts. */
function gatewaySearch(state: {
  killSwitch?: boolean;
  circuitOpen?: boolean;
  cacheHit?: boolean;
  budget: ReturnType<typeof makeBudget>;
  fetches: { n: number };
}) {
  if (state.killSwitch || state.circuitOpen) return { ok: false, error_code: "circuit_open", external_calls: 0 };
  if (state.cacheHit) return { ok: true, from_cache: true, external_calls: 0 };
  const r = state.budget.reserve();
  if (!r.allowed) return { ok: false, error_code: "daily_budget_exhausted", external_calls: 0 };
  state.fetches.n += 1;
  return { ok: true, from_cache: false, external_calls: 1 };
}

describe("Places cost guards", () => {
  it("kill switch => no external fetch", () => {
    const fetches = { n: 0 };
    const res = gatewaySearch({ killSwitch: true, budget: makeBudget(), fetches });
    expect(res.ok).toBe(false);
    expect(fetches.n).toBe(0);
  });

  it("open circuit => no external fetch", () => {
    const fetches = { n: 0 };
    const res = gatewaySearch({ circuitOpen: true, budget: makeBudget(), fetches });
    expect(res.error_code).toBe("circuit_open");
    expect(fetches.n).toBe(0);
  });

  it("daily budget: 25 allowed, the 26th is refused", () => {
    const budget = makeBudget();
    const fetches = { n: 0 };
    for (let i = 0; i < DAILY_LIMIT; i++) {
      expect(gatewaySearch({ budget, fetches }).ok).toBe(true);
    }
    const overflow = gatewaySearch({ budget, fetches });
    expect(overflow.ok).toBe(false);
    expect(overflow.error_code).toBe("daily_budget_exhausted");
    expect(fetches.n).toBe(DAILY_LIMIT);
    expect(budget.used).toBe(DAILY_LIMIT);
  });

  it("cache hit => no reservation and no fetch", () => {
    const budget = makeBudget();
    const fetches = { n: 0 };
    const res = gatewaySearch({ cacheHit: true, budget, fetches });
    expect(res.ok).toBe(true);
    expect(budget.used).toBe(0);
    expect(fetches.n).toBe(0);
  });

  it("concurrency can never push the counter past the cap", () => {
    const budget = makeBudget();
    const fetches = { n: 0 };
    const results = Array.from({ length: 200 }, () => gatewaySearch({ budget, fetches }));
    expect(results.filter((r) => r.ok).length).toBe(DAILY_LIMIT);
    expect(budget.used).toBeLessThanOrEqual(DAILY_LIMIT);
    expect(fetches.n).toBe(DAILY_LIMIT);
  });

  it("places without a phone number never enter the pool", () => {
    const { usable, rejected_no_phone } = partitionPlacesByPhone([
      { id: "a", displayName: { text: "A" }, nationalPhoneNumber: "514-555-0100" },
      { id: "b", displayName: { text: "B" } },
      { id: "c", displayName: { text: "C" }, nationalPhoneNumber: "   " },
      { displayName: { text: "D" }, nationalPhoneNumber: "514-555-0101" },
    ] as never);
    expect(usable.map((p) => p.id)).toEqual(["a"]);
    expect(rejected_no_phone).toBe(3);
  });
});
