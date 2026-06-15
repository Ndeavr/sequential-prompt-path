# SMS Reliability — Final Sweep & Verification

## Goal
Zero legacy Twilio paths. Every outbound SMS goes through `_shared/twilioSend.ts`, every delivery callback hits `twilio-status-v2`, every contractor surface shows the comms timeline, and an end-to-end test proves `queued → sent → delivered`.

## Scope of legacy senders to refactor
Direct Twilio calls still live in these functions (confirmed by scan):

1. `acq-sms-send`
2. `sms-prospect-send`
3. `agent-send-outreach`
4. `agent-activation-reply`
5. `agent-send-test`
6. `live-agent-outreach-send` (re-verify)
7. `launch-agent-checkout-sender` (re-verify)
8. `alex-reengage-send` (re-verify)
9. `approve-isr-sms`
10. `process-reminders`
11. `sniper-queue-send`
12. `dispatch-outreach-batch`
13. `acq-send-outreach`
14. `send-otp` (keep direct — Twilio Verify API, NOT Messages.json; only normalize logging)

Intentionally untouched: `twilio-lookup-phone`, `twilio-verify`, `twilio-inbound`, `_shared/acq-preflight`, health-check probes — these don't send marketing/transactional SMS.

## Refactor pattern (applied uniformly)
Each sender becomes a thin orchestrator:
```ts
import { sendSms } from "../_shared/twilioSend.ts";
const result = await sendSms({
  to, body, templateKey, leadId, contractorId, campaignId, metadata
});
// result: { ok, status, sid?, blocked_reason?, error_code?, event_id }
```
Removes: hardcoded `From`, raw `fetch(twilio.com)`, custom `StatusCallback`, inline `messagingServiceSid`. The shared sender already:
- normalizes phone → guard → inserts `sms_events_v2` row (`queued`)
- POSTs Twilio with `StatusCallback=https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/twilio-status-v2`
- updates row to `sent`/`failed` with `twilio_sid` + `error_code`
- on webhook: `twilio-status-v2` flips to `delivered`/`undelivered` and enqueues retries

## Legacy webhook deprecation
- `twilio-status/index.ts` and `twilio-status-webhook/index.ts` → reduced to a thin shim that 301-forwards body to `twilio-status-v2` for any Twilio account still pointing at the old URL. Logged with a deprecation warning so we can detect callers.
- Documented manual action: update Twilio Console Messaging Service → Status Callback URL to `twilio-status-v2`.

## SMS Health cockpit upgrade (`/admin/sms-health`)
Existing page extended with:
- KPI row: **queued / sent today / delivered today / failed today / callback received / callback missing (sent >10min ago with no terminal status)**
- Twilio error code grid (code, count, FR explanation, suggested fix)
- "Sender used" + "Messaging Service used" breakdown columns
- Live tail (last 50 `sms_events_v2` rows, auto-refresh 10s)
- "Send test SMS" button → invokes new `sms-admin-test` edge function (admin-only, JWT-verified) that sends to a configured admin number and returns the `event_id` to poll.

New SQL views feeding the cockpit:
- `v_sms_callback_gap` — rows in `sent` for >10min without webhook
- `v_sms_sender_usage_24h` — group by `from_number`, `messaging_service_sid`

## Timeline auto-mount
`ContractorCommsTimeline` mounted on:
- `src/pages/contractor/...` profile page (find canonical contractor profile route)
- contractor onboarding profile page
- `src/pages/admin/.../ContractorDetail*` admin contractor detail

Each mount passes `contractorId` from existing route params; no new props or context required.

## End-to-end test workflow
1. New edge function `sms-admin-test` (admin JWT required) sends a templated SMS to `ADMIN_TEST_PHONE` secret via `sendSms()`.
2. Returns `{ event_id, twilio_sid }`.
3. Admin UI polls `sms_events_v2` for that `event_id`, displays progression: `queued → sending → sent → delivered`.
4. Pass criteria: terminal status `delivered` within 60s; webhook timestamp populated; timeline shows the event.

## Files

### Edge functions (refactor to `sendSms`)
- `supabase/functions/acq-sms-send/index.ts`
- `supabase/functions/sms-prospect-send/index.ts`
- `supabase/functions/agent-send-outreach/index.ts`
- `supabase/functions/agent-activation-reply/index.ts`
- `supabase/functions/agent-send-test/index.ts`
- `supabase/functions/approve-isr-sms/index.ts`
- `supabase/functions/process-reminders/index.ts`
- `supabase/functions/sniper-queue-send/index.ts`
- `supabase/functions/dispatch-outreach-batch/index.ts`
- `supabase/functions/acq-send-outreach/index.ts`
- (verify already-refactored) `live-agent-outreach-send`, `launch-agent-checkout-sender`, `alex-reengage-send`

### Edge functions (deprecation shims)
- `supabase/functions/twilio-status/index.ts`
- `supabase/functions/twilio-status-webhook/index.ts`

### New edge function
- `supabase/functions/sms-admin-test/index.ts`

### SQL (migration)
- `v_sms_callback_gap` view
- `v_sms_sender_usage_24h` view

### Frontend
- `src/pages/admin/PageSmsHealth.tsx` — extend KPIs, error grid, live tail, test button
- Mount `ContractorCommsTimeline` in:
  - contractor profile page
  - contractor onboarding profile page
  - admin contractor detail page

### Secret
- `ADMIN_TEST_PHONE` (E.164) — request via `add_secret` before deploying `sms-admin-test`.

## Deliverable on completion
A report containing:
- **Functions fixed:** N (target: 10 + verification of 3)
- **Legacy paths remaining:** 0 direct `twilio.com/Messages.json` calls outside `_shared/twilioSend.ts`
- **SMS health status:** snapshot of KPIs after test
- **End-to-end test:** PASS/FAIL with event_id and full status progression

## Open question before build
I need the **admin test phone number** to wire `ADMIN_TEST_PHONE` and run the E2E test. Want me to request it as a secret now, or hardcode it temporarily for one test cycle?
