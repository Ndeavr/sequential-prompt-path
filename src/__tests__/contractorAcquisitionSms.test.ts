import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("contractor acquisition SMS — canonical production path", () => {
  const sender = read("supabase/functions/_shared/twilioSend.ts");
  const batch = read("supabase/functions/send-verified-batch/index.ts");
  const callback = read("supabase/functions/twilio-status-v2/index.ts");
  const guard = read("supabase/functions/_shared/smsGuard.ts");
  const retry = read("supabase/functions/sms-retry-scheduler/index.ts");
  const testSender = read("supabase/functions/acq-test-send-sms/index.ts");

  it("routes the verified batch through the shared sender only", () => {
    expect(batch).toContain('import { sendSms } from "../_shared/twilioSend.ts"');
    expect(batch).toContain("const sendResult = await sendSms({");
    expect(batch).not.toContain("api.twilio.com/2010-04-01/Accounts/");
    expect(batch).not.toContain("engagement-webhook-twilio?prospect_id=");
  });

  it("uses the canonical v2 callback and preserves prospect attribution", () => {
    expect(sender).toContain("/functions/v1/twilio-status-v2");
    expect(sender).toContain("SMS_STATUS_CALLBACK_SECRET");
    expect(callback).toContain('searchParams.get("token")');
    expect(callback).toContain("constantTimeEqual");
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
    expect(callback).not.toContain("email-fallback-dispatch");
  });

  it("classifies provider failures before scheduling a retry", () => {
    expect(callback).toContain('import { classifyTwilio } from "../_shared/outreachRetryPolicy.ts"');
    expect(callback).toContain("retry.retryable &&");
    expect(retry).toContain("prospect_id:");
    expect(retry).toContain('authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`');
  });

  it("prefers the managed Twilio connection over stale direct credentials", () => {
    expect(sender).toContain("const useGateway = Boolean(LOVABLE_API_KEY && TWILIO_API_KEY)");
    expect(sender).toContain("const hasDirectCredentials = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)");
  });

  it("requires an admin and a server-configured destination for acquisition tests", () => {
    expect(testSender).toContain('.eq("role", "admin")');
    expect(testSender).toContain('Deno.env.get("SMS_TEST_DESTINATION_NUMBER")');
    expect(testSender).not.toContain("body?.to");
  });

  it("requires an admin or service identity before a production batch", () => {
    expect(batch).toContain('throw new FunctionError("Unauthorized", 401');
    expect(batch).toContain('.eq("role", "admin")');
  });
});