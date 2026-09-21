import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("contractor acquisition SMS — canonical production path", () => {
  const sender = read("supabase/functions/_shared/twilioSend.ts");
  const batch = read("supabase/functions/send-verified-batch/index.ts");
  const callback = read("supabase/functions/twilio-status-v2/index.ts");
  const guard = read("supabase/functions/_shared/smsGuard.ts");

  it("routes the verified batch through the shared sender only", () => {
    expect(batch).toContain('import { sendSms } from "../_shared/twilioSend.ts"');
    expect(batch).toContain("const sendResult = await sendSms({");
    expect(batch).not.toContain("api.twilio.com/2010-04-01/Accounts/");
    expect(batch).not.toContain("engagement-webhook-twilio?prospect_id=");
  });

  it("uses the canonical v2 callback and preserves prospect attribution", () => {
    expect(sender).toContain("/functions/v1/twilio-status-v2");
    expect(sender).toContain("prospect_id: input.prospect_id ?? null");
    expect(callback).toContain("verified_contractor_prospects");
    expect(callback).toContain("typeof eventMetadata.prospect_id");
  });

  it("fails closed on suppression and unconfirmed mobile type", () => {
    expect(guard).toContain('rpc("is_phone_suppressed"');
    expect(guard).toContain('detail: "suppression_check_unreadable"');
    expect(guard).toContain('detail: "phone_type_unconfirmed"');
    expect(guard).toContain('lineType !== "mobile"');
  });

  it("never falls back to email after an SMS failure", () => {
    expect(batch).toContain("const shouldTryEmail = forceEmail");
    expect(batch).not.toContain("FALLBACK_ELIGIBLE_TWILIO_CODES");
  });

  it("classifies provider failures before scheduling a retry", () => {
    expect(callback).toContain('import { classifyTwilio } from "../_shared/outreachRetryPolicy.ts"');
    expect(callback).toContain("retry.retryable &&");
  });
});