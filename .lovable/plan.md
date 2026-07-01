## Objective
Complete admin SMS override activation so a real test SMS to +15142499522 passes smsGuard with `phone_type=mobile_override` and receives a Twilio SID.

## Changes

### 1. Add secret
- `ADMIN_SMS_ALLOWLIST=+15142499522` via `set_secret` (fixed known value).

### 2. Thread `strict_admin_override` through the sender
`smsGuard.ts` already accepts `strict_admin_override`, but `twilioSend.sendSms()` currently calls `validateBeforeSend({ supabase, phone: input.to })` without it. Two touchpoints:

- **`supabase/functions/_shared/twilioSend.ts`**: add optional `strict_admin_override?: boolean` to `SendSmsInput`, forward it to `validateBeforeSend()`, and persist `phone_type` / `sms_guard_reason` from the guard outcome into the `sms_events_v2.metadata` JSON so the audit trail carries the override reason.
- **`supabase/functions/acq-test-send-sms/index.ts`**: pass `strict_admin_override: true` on the `sendSms()` call. This is the only test-only entry point — production paths (`acq-send-outreach`, autopilot, followups) are NOT touched, keeping the bypass strictly admin/test scoped.

### 3. Return richer payload from test function
Include `phone_type`, `sms_guard_reason`, and `twilio_sid` at the top level of the JSON response so we can grep verification results without opening the DB.

### 4. Deploy + real test
- Deploy `acq-test-send-sms` and (implicitly, shared code) via `supabase--deploy_edge_functions`.
- Invoke via `supabase--curl_edge_functions` with `{ to: "+15142499522", message: "UNPRO override test <timestamp>" }`.
- Query `sms_events_v2` for the resulting row to confirm status transitions `queued → sending → sent/delivered` and capture Twilio SID.

## Expected verified output
```
destination:       +15142499522
phone_type:        mobile_override
sms_guard_reason:  admin_allowlist_override
twilio_sid:        SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
status:            sending → delivered (via twilio-status webhook)
```

## Safeguards (unchanged)
- Opt-out and blocked-pattern checks still run before the override returns.
- Prospect outreach paths never pass the flag → bypass unreachable in production.
- Canonical sender `+14503286776` and status callback gate remain enforced.
