import { describe, it, expect } from "vitest";
import { classifyPrefix, smsDispatchAllowedByEvidence } from "@/lib/phone/cnacPrefix";

describe("CNAC prefix classification (probable only)", () => {
  it("450-649 Bell Canada → landline probable", () => {
    const r = classifyPrefix("+14506491234");
    expect(r.originalCompany).toBe("Bell Canada");
    expect(r.class).toBe("prefix_landline_probable");
  });
  it("514-500 Iristel → voip/unknown", () => {
    expect(classifyPrefix("5145001234").class).toBe("prefix_voip_or_unknown");
  });
  it("514-249 Bell Mobility → mobile probable, never verified", () => {
    const r = classifyPrefix("514-249-1234");
    expect(r.class).toBe("prefix_mobile_probable");
    expect(r.evidence).toBe("original_assignment_only");
    expect(r.portabilityCaveat).toBe(true);
    expect(r.class).not.toMatch(/verified|^mobile$/);
  });
  it("prefix alone never allows SMS", () => {
    expect(smsDispatchAllowedByEvidence({ humanReviewedCasl: false, optedOut: false })).toBe(false);
  });
  it("opt-out blocks even with reviewed consent", () => {
    expect(smsDispatchAllowedByEvidence({ humanReviewedCasl: true, optedOut: true })).toBe(false);
  });
  it("delivered contact without consent → no SMS", () => {
    expect(smsDispatchAllowedByEvidence({ humanReviewedCasl: false, optedOut: false, refusalPublished: false })).toBe(false);
  });
});
