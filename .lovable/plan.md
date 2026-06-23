## Why

Current state in DB:
- `contractor_leads.phone_type`: 157 NULL / 81 `unknown` — **0 validated**.
- `contractor_outreach_logs` SMS: 302/329 are `TWILIO_PROVIDER_ERROR` — overwhelmingly Twilio 30006 (landline / unreachable carrier). Every retry burns money and inflates "failed" counts.
- A `contact-router` + `smsGuard` already exist and correctly block non-mobile, but most sender edge functions (`acq-sms-send`, `acquisition-autopilot`, `launch-agent-outreach`, `launch-followup-engine`, `sms-prospect-send`, `send-sms-prospect`, `sniper-queue-send`, `process-reminders`, `sms-retry-scheduler`, `agent-send-test`, etc.) call Twilio directly or call `sendSms()` without first calling `validateBeforeSend()` / the router.
- Funnel counts `sent` (= attempted) as "contacted" and counts landline rejects as failures, so the dashboard shows 329 SMS sent / 0 delivered / lots of failures.

## What changes

### 1. Phone validation as a hard pre-flight (shared)
Extend `supabase/functions/_shared/smsGuard.ts::validateBeforeSend()` so when called WITHOUT a lead row OR with a lead whose `phone_type` is NULL/`unknown`, it:
- Calls `twilio-lookup-phone` (already exists) inline with a 90-day cache via `phone_carrier_cache`.
- Writes the resolved `phone_type`, `phone_e164`, `phone_validation_status`, `phone_validation_checked_at` back to `contractor_leads` and (if applicable) `contractor_prospects` + `contacts`.
- Returns `not_mobile` for `landline | fixedVoip | voip | toll_free | unknown | invalid`.

Add a tiny wrapper `sendOutreach({ lead, template, ... })` in `supabase/functions/_shared/outreachDispatch.ts` that:
1. Runs `validateBeforeSend` → if `ok` → SMS via existing twilioSend pipeline.
2. If `not_mobile | invalid_phone | max_failures` AND lead has a valid email → send email (Resend) via the same pipeline as `contact-router` does today.
3. Else → write `acquisition_events` `failed` with `reason=needs_manual_contact` and enqueue into `contact_verification_queue` (function already exists).

### 2. Migrate every SMS sender to the dispatcher
Replace direct `sendSms(...)` calls in the senders listed above with `sendOutreach(...)`. No sender may hit Twilio without passing through the dispatcher. Keep `contact-router` as-is (already correct).

### 3. Backfill / quarantine 30006
One-shot migration script (run as edge function `acq-phone-backfill`):
- For every `contractor_outreach_logs` row where `provider_response::text ILIKE '%30006%'` → set the matching lead's `phone_type='landline_or_unreachable'`, `sms_disabled=true`, `sms_suppressed_reason='twilio_30006'`.
- For every lead with `phone_type IN (NULL,'unknown')` and a phone → enqueue async Twilio Lookup (rate-limited, 50/min).
- Stops all retries to those numbers (already enforced by `smsGuard` once `sms_disabled=true`).

### 4. Funnel correction
`acquisition-funnel-live` + dashboard changes only:
- `contacted` = `acquisition_events` where `event_type='sent'` AND `metadata->>'channel' IN ('sms','email')` AND `metadata->>'channel_decision_reason' <> 'landline_sms_blocked'` AND status not in `('skipped_landline','needs_manual_contact')`.
- `delivered` = events `delivered` only (webhook-driven, no change).
- `failed` = events `failed` AND `metadata->>'failure_class'='provider_error'` (excludes our own pre-flight skips).
- New breakdown rows surfaced on `/admin/acquisition-funnel`:
  - Mobile numbers
  - Landlines (skipped SMS, attempted email)
  - Email-only outreach
  - No-contact prospects (needs_manual_contact)
  - SMS delivered rate computed on mobile-only denominator.

### 5. New admin observability
Add a `ChannelRoutingCard` to `/admin/acquisition-funnel` reading from a new SQL view `v_channel_routing_health` (counts by `phone_type`, last-7d sent/delivered/failed by channel, % routed to email fallback, % manual queue).

## Out of scope

- No UI redesign beyond the new card + breakdown row labels.
- No change to `contact-router` core logic (already correct).
- No change to ElevenLabs / voice / Alex stacks.
- Cron schedule for `acq-phone-backfill` left for a follow-up — first run triggered manually from /admin.

## Files

**Created**
- `supabase/functions/_shared/outreachDispatch.ts`
- `supabase/functions/acq-phone-backfill/index.ts`
- `src/components/admin/ChannelRoutingCard.tsx`
- Migration: add `phone_validation_status`, `phone_validation_checked_at`, `sms_suppressed_reason`, `sms_suppressed_at` to `contractor_leads` (if missing); view `v_channel_routing_health`.

**Edited (sender migration to dispatcher)**
- `acq-sms-send`, `acq-send-outreach`, `acquisition-autopilot`, `launch-agent-outreach`, `launch-followup-engine`, `sms-prospect-send`, `send-sms-prospect`, `sniper-queue-send`, `process-reminders`, `sms-retry-scheduler`, `agent-send-test`, `agent-activation-reply`, `sms-curiosity-tick`, `run-curiosity-sms-worker`, `run-contractor-onboarding-worker`.
- `_shared/smsGuard.ts` — add inline lookup + writeback.
- `acquisition-funnel-live/index.ts` — corrected counts.
- `src/pages/admin/PageAdminAcquisitionFunnel.tsx` — new breakdown rows + ChannelRoutingCard.

## Success checks

1. After backfill: every lead has `phone_type` ≠ NULL/`unknown`; 30006 numbers are `sms_disabled=true`.
2. New SMS attempts to landlines: 0 in `contractor_outreach_logs` (24h window).
3. Landlines with email show `acquisition_events.sent` with `channel='email'`.
4. Dashboard "SMS delivered rate" reports against mobile-only denominator.
5. `failed` count drops to real provider failures only.
