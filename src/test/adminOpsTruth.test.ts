import { describe, it, expect } from "vitest";
import { classifyContractor, formatSpecialty } from "@/components/admin/leak-detectors/paidLiveClassifier";
import { smsBannerState } from "@/components/admin/SmsInfrastructureBanner";

const now = Date.parse("2026-11-02T18:00:00Z");
const old = "2026-10-01T00:00:00Z", recent = "2026-10-31T00:00:00Z";
const sub = (id: string, sid: string | null = "sub_1") => ({ contractor_id: id, status: "active", stripe_subscription_id: sid, created_at: old });
const ev = (id: string, live: boolean | null, type = "checkout.session.completed", at = old, eid = "evt") => ({ contractor_id: id, event_type: type, livemode: live, success: true, session_id: "cs350", stripe_event_id: eid, created_at: at });
const led = (id: string, at = old) => ({ contractor_id: id, action: "entry_activation_350_paid", source: "stripe_webhook", created_at: at, metadata: { livemode: true, amount_subtotal_cents: 35000, amount_discount_cents: 0, stripe_event_id: "evt350", stripe_session_id: "cs350" } });

describe("paid LIVE classification", () => {
  it("LIVE subscription counts", () => expect(classifyContractor("a", [sub("a")], [], [ev("a", true)], now)).toMatchObject({ kind: "live_paid", source: "subscription", new_lt_7d: false }));
  it("test mode excluded", () => expect(classifyContractor("a", [sub("a")], [], [ev("a", false)], now)).toEqual({ kind: "excluded", reason: "test_mode" }));
  it("free/coupon without Stripe excluded", () => expect(classifyContractor("a", [sub("a", null)], [], [], now)).toEqual({ kind: "excluded", reason: "no_stripe_proof" }));
  it("refunded excluded", () => expect(classifyContractor("a", [sub("a")], [], [ev("a", true), ev("a", true, "charge.refunded")], now)).toEqual({ kind: "excluded", reason: "refunded_or_cancelled" }));
  it("one-time 350 counts without subscription", () => expect(classifyContractor("b", [], [led("b")], [ev("b", true, "checkout.session.completed", old, "evt350")], now)).toMatchObject({ kind: "live_paid", source: "activation_350" }));

  it("does not trust a historical string LIVE flag or a discounted 1-dollar checkout", () => {
    const base = led("b");
    const receipt = ev("b", true, "checkout.session.completed", old, "evt350");
    expect(classifyContractor("b", [], [{ ...base, metadata: { ...base.metadata, livemode: "true" } }], [receipt], now))
      .toEqual({ kind: "excluded", reason: "no_stripe_proof" });
    expect(classifyContractor("b", [], [{ ...base, metadata: { ...base.metadata, amount_discount_cents: 34900 } }], [receipt], now))
      .toEqual({ kind: "excluded", reason: "no_stripe_proof" });
    expect(classifyContractor("b", [], [{ ...base, metadata: { ...base.metadata, amount_subtotal_cents: 100 } }], [receipt], now))
      .toEqual({ kind: "excluded", reason: "no_stripe_proof" });
  });
  it("requires the exact session and successful webhook audit", () => {
    const base = led("b");
    const receipt = ev("b", true, "checkout.session.completed", old, "evt350");
    expect(classifyContractor("b", [], [base], [{ ...receipt, session_id: "cs_foreign" }], now))
      .toEqual({ kind: "excluded", reason: "no_stripe_proof" });
    expect(classifyContractor("b", [], [base], [{ ...receipt, success: false }], now))
      .toEqual({ kind: "excluded", reason: "no_stripe_proof" });
    expect(classifyContractor("b", [], [base], [{ ...receipt, success: null }], now))
      .toEqual({ kind: "excluded", reason: "no_stripe_proof" });
  });
  it("uses calendar months rather than a hard 365-day cutoff across leap years", () => {
    const at = "2023-03-01T12:00:00Z";
    const receipt = ev("b", true, "checkout.session.completed", at, "evt350");
    const activation = led("b", at);
    expect(classifyContractor("b", [], [activation], [receipt], Date.parse("2024-02-29T18:00:00Z")))
      .toMatchObject({ kind: "live_paid", source: "activation_350" });
    expect(classifyContractor("b", [], [activation], [receipt], Date.parse("2024-03-01T12:00:00Z")))
      .toEqual({ kind: "excluded", reason: "expired" });
  });
  it("new < 7 days flagged", () => expect(classifyContractor("b", [], [led("b", recent)], [ev("b", true, "checkout.session.completed", recent, "evt350")], now)).toMatchObject({ new_lt_7d: true }));
  it("specialty JSON readable", () => expect(formatSpecialty('["toiture","isolation_entretoit"]')).toBe("toiture, isolation entretoit"));
});

describe("SMS banner", () => {
  const base = { status: "WARNING" as const, last_callback_at: old, last_test_success_at: null, delivery_rate_24h: null };
  it("unknown on error", () => expect(smsBannerState({ view: null, last: null, error: "permission" }).tone).toBe("unknown"));
  it("absent test is warning, not outage", () => expect(smsBannerState({ view: base, last: null, error: null }).msg).toMatch(/aucun test E2E réussi/));
  it("stale test", () => expect(smsBannerState({ view: { ...base, last_test_success_at: old }, last: null, error: null }).msg).toMatch(/périmé/));
  it("failed test", () => expect(smsBannerState({ view: base, last: { created_at: recent, success: false, callback_received: false, error: "x" }, error: null }).msg).toMatch(/échoué/));
  it("healthy hidden", () => expect(smsBannerState({ view: { ...base, status: "HEALTHY" }, last: null, error: null }).tone).toBeNull());
});
