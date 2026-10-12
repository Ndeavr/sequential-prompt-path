import { describe, it, expect } from "vitest";
import { idempotencyKey, isDraftEligible } from "../../supabase/functions/agent-generate-message/logic";

describe("agent-generate-message idempotency", () => {
  const d = new Date("2026-10-12T10:00:00Z");
  it("same lead/month → same key (2 successive or concurrent runs collapse to one row)", () => {
    const keys = new Set([idempotencyKey("L1", d), idempotencyKey("L1", new Date("2026-10-30T23:00:00Z"))]);
    expect(keys.size).toBe(1);
  });
  it("different lead or cycle → different key", () => {
    expect(idempotencyKey("L1", d)).not.toBe(idempotencyKey("L2", d));
    expect(idempotencyKey("L1", d)).not.toBe(idempotencyKey("L1", new Date("2026-11-01T00:00:00Z")));
  });
  it("fail-closed eligibility", () => {
    expect(isDraftEligible({ id: "a", phone_type: "mobile" })).toBe(true);
    expect(isDraftEligible({ id: "a", phone_type: "landline" })).toBe(false);
    expect(isDraftEligible({ id: "a", phone_type: null })).toBe(false);
    expect(isDraftEligible({ id: "a", phone_type: "mobile", do_not_contact: true })).toBe(false);
    expect(isDraftEligible({ id: "a", phone_type: "mobile", unsubscribed_at: "x" })).toBe(false);
    expect(isDraftEligible({ id: "a", phone_type: "mobile", sms_disabled: true })).toBe(false);
  });
});
