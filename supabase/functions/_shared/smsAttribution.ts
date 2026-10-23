// SID → attribution for canonical outreach_sms_events.
// Only facts read from acq_sms_logs for the exact provider SID are attached; an unknown SID
// receives no recipient/prospect/contractor (never invented).

export interface AcqSmsLogRow {
  provider_message_id?: string | null;
  recipient_phone?: string | null;
  prospect_id?: string | null;
  contractor_id?: string | null;
  campaign_id?: string | null;
  status?: string | null;
  error?: string | null;
  body?: string | null;
  sent_at?: string | null;
  is_simulation?: boolean | null;
  is_test_e2e?: boolean | null;
}

export const ACQ_SMS_LOG_COLUMNS =
  "id, provider_message_id, recipient_phone, prospect_id, contractor_id, campaign_id, status, error, body, sent_at, is_simulation, is_test_e2e";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E164 = /^\+[1-9]\d{7,14}$/;
const SID = /^(SM|MM)[0-9a-f]{32}$/i;

export function isTwilioMessageSid(v: unknown): v is string {
  return typeof v === "string" && SID.test(v);
}

/** Attribution fields from the log row matching `sid`; {} when unknown or mismatched. */
export function attributionFromLog(sid: string, row: AcqSmsLogRow | null | undefined): Record<string, string> {
  if (!row || row.provider_message_id !== sid) return {};
  const out: Record<string, string> = {};
  if (typeof row.recipient_phone === "string" && E164.test(row.recipient_phone)) out.recipient = row.recipient_phone;
  if (typeof row.prospect_id === "string" && UUID.test(row.prospect_id)) out.prospect_id = row.prospect_id;
  if (typeof row.contractor_id === "string" && UUID.test(row.contractor_id)) out.contractor_id = row.contractor_id;
  if (typeof row.campaign_id === "string" && UUID.test(row.campaign_id)) out.campaign_id = row.campaign_id;
  return out;
}

/** Backfill payload from a real acq_sms_logs row; null when not a genuine provider-sent SMS. */
export function backfillSmsPayload(row: AcqSmsLogRow): { sid: string; payload: Record<string, unknown> } | null {
  if (row.is_simulation || row.is_test_e2e) return null;
  const sid = row.provider_message_id;
  if (!isTwilioMessageSid(sid)) return null;
  return {
    sid,
    payload: {
      ...attributionFromLog(sid, row),
      status: row.status ?? null,
      error: row.error ?? null,
      ts: row.sent_at ?? null,
      backfilled: true,
    },
  };
}
