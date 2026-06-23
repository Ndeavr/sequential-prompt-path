# Outreach Channel Routing — Phone Validation First

This plan was already implemented in the previous turn. Re-issuing unchanged for your approval so I can re-run the backfill and verify end-to-end.

## 1. Validation gate (before any send)
- Extend `supabase/functions/_shared/smsGuard.ts::validateBeforeSend()` to call `twilio-lookup-phone` inline when `phone_type` is `NULL` / `unknown`.
- 90-day cache in `phone_carrier_cache`.
- Persist on the lead row: `phone_e164`, `phone_type` (`mobile | landline | voip | toll_free | invalid | unknown`), `phone_validation_status`, `phone_validation_checked_at`.
- Return `not_mobile` for anything ≠ `mobile`.

## 2. Channel routing wrapper
`supabase/functions/_shared/outreachDispatch.ts::sendOutreach()`:

```text
validate phone
├── mobile         → SMS (Twilio)
└── not_mobile / sms_disabled / max_failures
    ├── valid email → Email (Resend)   [event: sent, channel=email, fallback_from=sms]
    └── no email    → acquisition_events.failed
                       reason=needs_manual_contact
                       + enqueue contact_verification_queue
```

All senders (campaigns, autopilot, launch-mode) call `sendOutreach()` — no direct Twilio/Resend calls.

## 3. Backfill (one-shot, idempotent)
Edge function `acq-phone-backfill`:
- Every `contractor_outreach_logs` row with Twilio `30006` → lead gets `phone_type='landline_or_unreachable'`, `sms_disabled=true`, `sms_suppressed_reason='twilio_30006'`. Stops all SMS retries.
- Every lead with `NULL` / `unknown` phone → Twilio Lookup, rate-limited 50/min.
- Triggered from the Acquisition Funnel dashboard ("Lancer backfill phone_type" button).

## 4. Funnel math correction
`acquisition-funnel-live` + dashboard:
- **Contacted** = `acquisition_events.sent` where `channel ∈ {sms,email}` AND not `skipped_landline` / `needs_manual_contact`.
- **Delivered** = webhook-driven only (Twilio status + Resend events).
- **Failed** = real `provider_error` only — landline skips excluded.
- **SMS delivered rate** uses mobile-only denominator.

## 5. Dashboard observability
New `ChannelRoutingCard` + DB view `v_channel_routing_health` showing:
- Mobile numbers · Landlines skipped · Emails used as fallback · No-contact prospects · True SMS delivery rate (mobile only).

## Files
- **Created**: `supabase/functions/_shared/outreachDispatch.ts`, `supabase/functions/acq-phone-backfill/index.ts`, `src/components/admin/ChannelRoutingCard.tsx`, migration adding `v_channel_routing_health` + `phone_validation_checked_at`.
- **Modified**: `_shared/smsGuard.ts`, `acquisition-funnel-live`, `PageAdminAcquisitionFunnel.tsx`.

## Success checks
- Every lead has `phone_type` ≠ NULL/`unknown` after backfill.
- All 30006 numbers `sms_disabled=true`, no further SMS attempts.
- Landlines with email show `acquisition_events.sent` with `channel='email'`, `fallback_from='sms'`.
- Dashboard "SMS delivered rate" denominator = mobiles only.
- `failed` count drops to real provider errors.

## Out of scope
ElevenLabs/Alex voice stack, `contact-router` core logic, scheduled cron for periodic re-lookup (manual button only for now).

Approve to apply the migration and deploy the functions.