import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeEntry350, computePace, computeCohorts, computeDemand, torontoDate,
  type WebhookRow, type LedgerRow, type FunnelRow, type DemandRow,
} from "@/lib/kdd/kddV1";

const ev = (o: Partial<WebhookRow>): WebhookRow => ({
  stripe_event_id: "evt_1", event_type: "checkout.session.completed", livemode: true, session_id: "cs_1",
  payment_intent_id: "pi_1", created_at: "2026-11-01T15:00:00Z", payment_status: "paid", amount_subtotal: "35000",
  currency: "cad", offer: "entry_activation_350", test_mode: null, e2e_test: null, obj_payment_intent: "pi_1", ...o,
});
const led = (o: Partial<LedgerRow>): LedgerRow => ({
  contractor_id: "c1", action: "entry_activation_350_paid", source: "stripe_webhook", created_at: "2026-11-01T15:00:05Z",
  meta_livemode: "true", meta_event_id: "evt_1", meta_session_id: "cs_1", ...o,
});

describe("KDD v1 — 350 $ verified businesses", () => {
  it("counts one LIVE signed paid 350 CAD entitlement at its pretax amount", () => {
    const r = computeEntry350([ev({})], [led({})]);
    expect(r.verifiedBusinesses).toBe(1);
    expect(r.verifiedPretaxCents).toBe(35000);
  });

  it("dedupes replayed events, ledger replays and a second session for the same business", () => {
    const r = computeEntry350(
      [ev({}), ev({}), ev({ stripe_event_id: "evt_2", session_id: "cs_2", payment_intent_id: "pi_2", obj_payment_intent: "pi_2" })],
      [led({}), led({}), led({ meta_event_id: "evt_2", meta_session_id: "cs_2", created_at: "2026-11-02T00:00:00Z" })],
    );
    expect(r.verifiedBusinesses).toBe(1);
    expect(r.verifiedPretaxCents).toBe(35000);
    expect(r.duplicateEvents).toBe(1);
    expect(r.duplicatePaidSessionsSameBusiness).toBe(1);
  });

  it("excludes TEST events and test-marked metadata without double counting", () => {
    const r = computeEntry350(
      [ev({ livemode: false }), ev({ stripe_event_id: "evt_q", session_id: "cs_q", e2e_test: "true" })],
      [led({ meta_livemode: "false" })],
    );
    expect(r.verifiedBusinesses).toBe(0);
    expect(r.excluded.test).toBe(2);
  });

  it("excludes refunded, disputed and ledger-deactivated sessions", () => {
    const refunded = computeEntry350(
      [ev({}), ev({ stripe_event_id: "evt_r", event_type: "charge.refunded", session_id: null, obj_payment_intent: "pi_1", payment_intent_id: null })],
      [led({})],
    );
    expect(refunded.verifiedBusinesses).toBe(0);
    expect(refunded.excluded.reversed).toBe(1);
    const deactivated = computeEntry350([ev({})], [led({}), led({ action: "deactivated", meta_session_id: "cs_1" })]);
    expect(deactivated.verifiedBusinesses).toBe(0);
    expect(deactivated.excluded.reversed).toBe(1);
  });

  it("never counts unpaid/pending, $1 offers, other offers or paid sessions without entitlement", () => {
    const r = computeEntry350(
      [
        ev({ payment_status: "unpaid" }),
        ev({ stripe_event_id: "e1", session_id: "cs_d", offer: "activation_7d", amount_subtotal: "100" }),
        ev({ stripe_event_id: "e2", session_id: "cs_p", offer: null, amount_subtotal: "73078" }),
        ev({ stripe_event_id: "e3", session_id: "cs_x" }),
      ],
      [],
    );
    expect(r.verifiedBusinesses).toBe(0);
    expect(r.excluded.unpaidOrPending).toBe(1);
    expect(r.excluded.livePaidWithoutActivation).toBe(1);
    expect(r.otherPaidOffers.find((o) => o.offer === "activation_7d")?.excludedFromGoalReason).toBe("offre 1 $ ou gratuite");
    expect(r.otherPaidOffers.find((o) => o.offer === "sans_offre")?.amountSubtotalCents).toBe(73078);
  });

  it("labels missing live proof as unknown instead of verified", () => {
    const r = computeEntry350([ev({ livemode: null })], [led({}), led({ contractor_id: "c2", meta_event_id: "evt_missing", meta_session_id: "cs_9" })]);
    expect(r.verifiedBusinesses).toBe(0);
    expect(r.excluded.unknownLivemode).toBe(1);
    expect(r.excluded.ledgerProofMissing).toBe(1);
  });
});

describe("KDD v1 — pace (America/Toronto)", () => {
  it("computes gap and required daily pace to Dec 31 inclusive", () => {
    const p = computePace(0, [], new Date("2026-11-07T15:25:00Z"));
    expect(p.today).toBe("2026-11-07");
    expect(p.daysRemaining).toBe(55);
    expect(p.gap).toBe(3000);
    expect(p.requiredPerDay).toBeCloseTo(3000 / 55, 6);
  });

  it("uses the Toronto calendar day, not UTC", () => {
    expect(torontoDate(new Date("2026-11-08T03:00:00Z"))).toBe("2026-11-07");
    const p = computePace(10, ["2026-11-01", "2026-09-01"], new Date("2026-11-08T03:00:00Z"));
    expect(p.gap).toBe(2990);
    expect(p.observedLast30PerDay).toBeCloseTo(1 / 30, 6);
  });
});

describe("KDD v1 — cohorts", () => {
  it("marks never-instrumented stages unknown (no fake 0 %) and joins verified payments", () => {
    const rows: FunnelRow[] = [
      { contractor_id: "c1", created_at: "2026-10-05T12:00:00Z", current_stage: "paid", contacted_at: "x", paid_at: "x" },
      { contractor_id: "c2", created_at: "2026-10-06T12:00:00Z", current_stage: "contacted", contacted_at: "x" },
      { contractor_id: "c2", created_at: "2026-10-06T12:00:00Z", current_stage: "contacted" },
    ];
    const r = computeCohorts(rows, new Set(["c1", "c9"]));
    const oct = r.cohorts[0];
    expect(oct.size).toBe(2);
    expect(r.duplicateRows).toBe(1);
    expect(oct.stages.find((s) => s.stage === "contacted_at")?.rate).toBe(1);
    expect(oct.stages.find((s) => s.stage === "opened_at")?.status).toBe("unknown");
    expect(oct.stages.find((s) => s.stage === "opened_at")?.rate).toBeNull();
    expect(oct.verifiedPaid).toBe(1);
    expect(r.verifiedNotInFunnel).toBe(1);
  });
});

describe("KDD v1 — unmet demand", () => {
  const d = (o: Partial<DemandRow>): DemandRow => ({
    source: "alex_no_match_cases", id: "1", session_id: "s1", user_id: null, service: "Plomberie", city: "Montréal",
    status: null, created_at: "2026-04-07T13:00:00Z", synthetic: false, ...o,
  });
  it("dedupes same identity across sources, separates events from unique demands, excludes synthetic/resolved", () => {
    const r = computeDemand([
      d({}),
      d({ id: "2", source: "alex_waitlist_requests", status: "active", service: "plomberie", city: "Montreal" }),
      d({ id: "3", session_id: null }),
      d({ id: "4", session_id: "e2e-abc", synthetic: true }),
      d({ id: "5", session_id: "s5", source: "alex_waitlist_requests", status: "resolved" }),
    ]);
    expect(r.priorities).toHaveLength(1);
    expect(r.priorities[0].events).toBe(3);
    expect(r.priorities[0].uniqueDemands).toBe(1);
    expect(r.priorities[0].unidentifiedEvents).toBe(1);
    expect(r.excludedSynthetic).toBe(1);
    expect(r.excludedResolved).toBe(1);
  });
});

/* ------------------------- admin denial (loader) ------------------------- */
const fromSpy = vi.fn();
const rpcSpy = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })) },
    rpc: (...a: unknown[]) => rpcSpy(...a),
    from: (...a: unknown[]) => fromSpy(...a),
  },
}));

describe("KDD v1 — admin authorization", () => {
  beforeEach(() => { fromSpy.mockReset(); rpcSpy.mockReset(); });
  it("rejects non-admins before reading any table", async () => {
    rpcSpy.mockResolvedValue({ data: false, error: null });
    const { loadKddV1, KddAccessDeniedError } = await import("@/services/kddV1Service");
    await expect(loadKddV1()).rejects.toBeInstanceOf(KddAccessDeniedError);
    expect(rpcSpy).toHaveBeenCalledWith("has_role", { _user_id: "u1", _role: "admin" });
    expect(fromSpy).not.toHaveBeenCalled();
  });
  it("fails closed when the role check errors", async () => {
    rpcSpy.mockResolvedValue({ data: null, error: { message: "denied" } });
    const { loadKddV1, KddAccessDeniedError } = await import("@/services/kddV1Service");
    await expect(loadKddV1()).rejects.toBeInstanceOf(KddAccessDeniedError);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
