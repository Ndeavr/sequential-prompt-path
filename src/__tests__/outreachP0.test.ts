/**
 * P0 production-repair regression coverage.
 * Pure logic only — no provider is ever contacted from these tests.
 */
import { describe, expect, it } from "vitest";
import {
  assertOutreachEnabled,
  evaluateOutreachFlag,
  isTransactionalMessageType,
} from "../../supabase/functions/_shared/outreachGate";
import {
  hasPublicProvenance,
  isVerificationFresh,
  nextActionAt,
  VERIFICATION_TTL_MS,
} from "../../supabase/functions/_shared/verificationFreshness";
import {
  classifyResendProbe,
  classifySmsChannel,
  detectSilentProcessingAnomaly,
} from "../../supabase/functions/_shared/providerHealthSemantics";

function fakeClient(value: unknown, error?: unknown) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: value === undefined ? null : { value }, error }),
        }),
      }),
    }),
  };
}

describe("outreach kill switch (fail-closed)", () => {
  it("blocks when the flag is false", async () => {
    const g = await assertOutreachEnabled(fakeClient(false) as never);
    expect(g.allowed).toBe(false);
    expect(g.reason).toBe("OUTREACH_DISABLED");
  });

  it("blocks when the flag row is missing", async () => {
    const g = await assertOutreachEnabled(fakeClient(undefined) as never);
    expect(g.allowed).toBe(false);
    expect(g.reason).toBe("OUTREACH_FLAG_MISSING");
  });

  it("blocks when the flag cannot be read", async () => {
    const g = await assertOutreachEnabled(fakeClient(true, new Error("boom")) as never);
    expect(g.allowed).toBe(false);
    expect(g.reason).toBe("OUTREACH_FLAG_UNREADABLE");
  });

  it("blocks when the query throws", async () => {
    const throwing = { from: () => { throw new Error("network"); } };
    const g = await assertOutreachEnabled(throwing as never);
    expect(g.allowed).toBe(false);
  });

  it("only a real boolean true opens the gate", () => {
    expect(evaluateOutreachFlag(true).allowed).toBe(true);
    expect(evaluateOutreachFlag("true").allowed).toBe(false);
    expect(evaluateOutreachFlag(1).allowed).toBe(false);
  });

  it("never blocks transactional traffic (OTP / test / founder alerts)", () => {
    expect(isTransactionalMessageType("otp")).toBe(true);
    expect(isTransactionalMessageType("test")).toBe(true);
    expect(isTransactionalMessageType("outreach")).toBe(false);
    expect(isTransactionalMessageType("reengagement")).toBe(false);
  });
});

describe("verification cache reuse", () => {
  const recent = new Date(Date.now() - 3 * 24 * 3600_000).toISOString();

  it("reuses a valid tier-C record with unknown line type (Canada LTI unavailable)", () => {
    expect(isVerificationFresh({
      verification_status: "verified",
      phone_line_type: "unknown",
      sms_eligibility_tier: "C",
      verified_at: recent,
    })).toBe(true);
  });

  it("reuses a concrete mobile verification", () => {
    expect(isVerificationFresh({
      verification_status: "verified", phone_line_type: "mobile",
      sms_eligibility_tier: "A", verified_at: recent,
    })).toBe(true);
  });

  it("does not reuse an expired verification", () => {
    const old = new Date(Date.now() - VERIFICATION_TTL_MS - 1000).toISOString();
    expect(isVerificationFresh({
      verification_status: "verified", phone_line_type: "mobile",
      sms_eligibility_tier: "A", verified_at: old,
    })).toBe(false);
  });

  it("does not reuse an unverified record", () => {
    expect(isVerificationFresh({
      verification_status: "needs_enrichment", phone_line_type: "unknown",
      sms_eligibility_tier: null, verified_at: recent,
    })).toBe(false);
  });

  it("TTL is at least 30 days", () => {
    expect(VERIFICATION_TTL_MS).toBeGreaterThanOrEqual(30 * 24 * 3600_000);
  });
});

describe("public provenance gate (before any paid Lookup)", () => {
  it("rejects a candidate with no public evidence", () => {
    expect(hasPublicProvenance({})).toBe(false);
    expect(hasPublicProvenance({ website_url: null, source_urls: {} })).toBe(false);
  });

  it("accepts website, Google, phone source or official registry evidence", () => {
    expect(hasPublicProvenance({ website_url: "https://x.ca" })).toBe(true);
    expect(hasPublicProvenance({ google_place_id: "abc" })).toBe(true);
    expect(hasPublicProvenance({ phone_source_url: "https://x.ca/contact" })).toBe(true);
    expect(hasPublicProvenance({ source_urls: { official_registry: "https://rbq" } })).toBe(true);
  });

  it("schedules a bounded backoff so the same batch is not reselected immediately", () => {
    const now = Date.now();
    const due = new Date(nextActionAt(1, now)).getTime();
    expect(due).toBeGreaterThan(now + 15 * 60_000);
    const later = new Date(nextActionAt(3, now)).getTime();
    expect(later).toBeGreaterThan(due);
  });
});

describe("provider health semantics", () => {
  it("send-only Resend key denied introspection is not red", () => {
    const v = classifyResendProbe({ keyPresent: true, httpStatus: 403 });
    expect(v.hard_block).toBe(false);
    expect(v.level).not.toBe("red");
    expect(v.introspection_available).toBe(false);
    expect(v.code).toBe("SENDING_CAPABLE_RESTRICTED_KEY");
  });

  it("a recent real send proves sender readiness", () => {
    const v = classifyResendProbe({
      keyPresent: true, httpStatus: 401,
      lastSuccessfulSendAt: new Date(Date.now() - 3600_000).toISOString(),
    });
    expect(v.level).toBe("green");
  });

  it("missing credentials remain a hard block", () => {
    expect(classifyResendProbe({ keyPresent: false }).hard_block).toBe(true);
  });

  it("idle / stale SMS is a warning, not a credential failure", () => {
    const v = classifySmsChannel({ credentialsPresent: true, lastSuccessfulSendAt: null, lastCallbackAt: null });
    expect(v.level).toBe("yellow");
    expect(v.hard_block).toBe(false);
  });

  it("real SMS auth failure is a hard block", () => {
    const v = classifySmsChannel({ credentialsPresent: true, lastProviderErrorCode: "20003" });
    expect(v.hard_block).toBe(true);
  });

  it("email health verdicts never carry SMS state (channel-specific)", () => {
    const email = classifyResendProbe({ keyPresent: true, httpStatus: 403 });
    const sms = classifySmsChannel({ credentialsPresent: true, lastProviderErrorCode: "20003" });
    expect(email.hard_block).toBe(false);
    expect(sms.hard_block).toBe(true);
  });

  it("flags consecutive processed>0 / sent=0 cycles as an anomaly", () => {
    expect(detectSilentProcessingAnomaly([{ processed: 25, sent: 0 }, { processed: 25, sent: 0 }]).anomaly).toBe(true);
    expect(detectSilentProcessingAnomaly([{ processed: 25, sent: 0 }, { processed: 25, sent: 3 }]).anomaly).toBe(false);
  });
});
