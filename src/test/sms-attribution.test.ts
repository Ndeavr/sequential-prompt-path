import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { attributionFromLog, backfillSmsPayload, ACQ_SMS_LOG_COLUMNS } from "../../supabase/functions/_shared/smsAttribution";

const SID = "SM" + "a".repeat(32);
const P = "11111111-1111-4111-8111-111111111111";
const row = { provider_message_id: SID, recipient_phone: "+15145550000", prospect_id: P, contractor_id: null, status: "delivered", error: null, sent_at: "2026-10-01T00:00:00Z" };

describe("SMS SID attribution", () => {
  it("attaches recipient/prospect only from the exact SID row", () => {
    expect(attributionFromLog(SID, row)).toEqual({ recipient: "+15145550000", prospect_id: P });
  });
  it("unknown or mismatched SID gets no attribution", () => {
    expect(attributionFromLog(SID, null)).toEqual({});
    expect(attributionFromLog("SM" + "b".repeat(32), row)).toEqual({});
    expect(attributionFromLog(SID, { ...row, recipient_phone: "unknown", prospect_id: "x" })).toEqual({});
  });
  it("duplicate callbacks produce identical payload (idempotent RPC keyed by SID)", () => {
    expect(attributionFromLog(SID, row)).toEqual(attributionFromLog(SID, row));
  });
  it("backfill keeps status/error and skips simulations, E2E and non-SID ids", () => {
    expect(backfillSmsPayload({ ...row, status: "undelivered", error: "30003" })?.payload).toMatchObject({ status: "undelivered", error: "30003", prospect_id: P });
    expect(backfillSmsPayload({ ...row, is_simulation: true })).toBeNull();
    expect(backfillSmsPayload({ ...row, is_test_e2e: true })).toBeNull();
    expect(backfillSmsPayload({ ...row, provider_message_id: "AU" + "a".repeat(32) })).toBeNull();
    expect(backfillSmsPayload({ ...row, provider_message_id: null })).toBeNull();
  });
  it("backfill selects only real acq_sms_logs columns and fails loudly on read/write errors", () => {
    for (const bad of ["twilio_sid", "phone", "error_code", "error_message"]) expect(ACQ_SMS_LOG_COLUMNS.split(", ")).not.toContain(bad);
    const src = readFileSync("supabase/functions/acq-events-backfill-30d/index.ts", "utf8");
    expect(src).toContain("acq_sms_logs_read_failed");
    expect(src).toContain("sms_event_write_failed");
    const status = readFileSync("supabase/functions/twilio-status-v2/index.ts", "utf8");
    expect(status).toMatch(/\.\.\.attribution,\s*status: mapped/);
  });
});
