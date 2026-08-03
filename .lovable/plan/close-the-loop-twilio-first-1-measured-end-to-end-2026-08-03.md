# Close the loop: Twilio → first $1, measured end to end

## Measured current state

| Signal | Reality (verified now) |
|---|---|
| Prospects with a Twilio SID | 234 |
| `acq_sms_logs` rows / with final status | 284 / 257 |
| Delivered (reconciled) | 146 |
| Tokens clicked | 4 (41 raw click events) |
| Engagement events | 309 |
| Activation payments recorded | 0 |

Confirmed by reading the code:

- `_shared/twilioSend.ts` attaches `StatusCallback` → `twilio-status`, which writes only to `sms_messages`.
- The two functions that actually send the outreach batches — `send-verified-batch` and `second-touch-outreach` — build their Twilio form **without** `StatusCallback`. That is why delivery only ever appears through the manual `twilio-delivery-reconcile` sweep.
- `engagement-webhook-twilio` already updates `acq_sms_logs` by `provider_message_id` and is the correct canonical status sink.
- The `idempotency_key` unique index on `pipeline_engagement_events` now exists, so `record_engagement_event` no longer blocks SMS logging.
- Six overlapping Twilio status handlers exist (`twilio-status`, `-webhook`, `-v2`, `-sms-status`, `-status-events`, `engagement-webhook-twilio`). Nothing new gets created; one is designated canonical and the senders point at it.

## What gets built

### 1. Delivery status (canonical callback)

- Designate `engagement-webhook-twilio` as the single status sink. Extend it to persist `MessageStatus`, `ErrorCode`, `ErrorMessage`, timestamps to `acq_sms_logs`, mirror `outreach_delivered_at` / `outreach_failure_reason` on `verified_contractor_prospects`, and emit a `pipeline_engagement_events` row (idempotency key = `sid:status`).
- Attach `StatusCallback` (with `campaign_id`, `prospect_id`, `message_id` as query params) in `send-verified-batch` and `second-touch-outreach`.
- Keep `twilio-delivery-reconcile` as the backfill/repair path only.

### 2. Click tracking

- Every outbound link carries campaign, prospect and message identity. `verified_prospect_tokens` gains `campaign_id`, `sms_log_id`; the resolver (`activation-token-resolve`) stamps them onto the click event.
- Funnel events written to the existing `pipeline_engagement_events` (no new table): `landing_viewed`, `registration_started`, `otp_requested`, `otp_verified`, `checkout_opened`, `payment_succeeded` — emitted from the pages/functions that already run those steps.

### 3. One funnel view

A single SQL view `v_campaign_funnel` joins campaign → sms log → delivery → click → landing → registration → OTP → Stripe → activation, per campaign and per prospect. All dashboards read from it; no parallel counting logic.

### 4. Admin analytics (extend, don't redesign)

`/admin/launch-control` gains a campaign table fed by `v_campaign_funnel`: Sent, Delivered, Delivery %, Undelivered, Failed, Clicked, CTR, Registrations, OTP verified, Stripe opened, Paid, Conversion %, Revenue, cost per signup / per activation, remaining eligible prospects. Auto-refresh on the existing 10 s interval.

### 5. Individual timeline

`contractor-revenue-timeline` is extended to return the full per-prospect chain (scraped → validated → lookup → sent → delivered → clicked → landing → registered → OTP → paid → activated → Alex started → last activity) and rendered as a timeline in the existing prospect drawer.

### 6. Follow-up automation

Rules added to the existing `daily-outreach-orchestrator` / `acquisition-followup-tick`, each guarded by a unique `idempotency_key` so a reminder can never fire twice:
- delivered + no click after 48 h → second SMS (reuses `second-touch-outreach`)
- clicked + no registration after 24 h → reminder
- registered + no payment after 24 h → Alex reminder
- paid → onboarding + welcome email (Resend) + activation completed

### 7. Daily health report

Extend `first-dollar-daily-report` (already scheduled) to grade Green / Warning / Critical across scraper, enrichment, Twilio auth, status callbacks, tracking, Resend, Stripe, edge functions, queues, campaigns, prospects waiting, failures, revenue yesterday, new activations — each with an actionable diagnostic string.

### 8. Exception center

New admin route `/admin/operations-health` grouping live exceptions: failed SMS, undelivered, no callback (SID with no terminal status), bad phone, no click, no registration, payment abandoned, webhook failures. Each row shows reason, contractor, recommended fix, and a retry button wired to the existing repair functions.

## Technical notes

- New: `v_campaign_funnel` view, `PageAdminOperationsHealth.tsx`, columns `campaign_id`/`sms_log_id` on `verified_prospect_tokens`, indexes on `campaign_id`, `contractor_id`, `provider_message_id`, `created_at`.
- Modified: `engagement-webhook-twilio`, `send-verified-batch`, `second-touch-outreach`, `activation-token-resolve`, `contractor-revenue-timeline`, `first-dollar-daily-report`, `daily-outreach-orchestrator`, `PageAdminLaunchControl.tsx`.
- No new SMS/campaign/event tables. No changes to SEO, sitemap, AI corpus or content systems.

## Verification

One real 25-message campaign, then confirm in order: Twilio accepts → status callback received and stored → click tracked with campaign identity → landing/registration/OTP events present → Stripe checkout opened and paid event recorded → dashboard and timeline both reflect it. Any step that fails is fixed before the run is called complete.

## Definition of done

The dashboard answers, from live data: sent, delivered, clicked, registered, activated, revenue, and the exact stage where each lost prospect exited.
