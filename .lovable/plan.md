# Full Outreach Observability — Tracking, Reply Path, End-to-End Test

## Why
Audit confirms the dashboard is blind past "sent". 329 SMS / 6 emails / 0 delivered / 0 clicks is almost certainly broken tracking, not failed acquisition. Before sending another message we make every step observable, add a no-link reply path, and force an end-to-end self-test.

## Scope

### 1. Canonical event tables (Priority 1)
New tables, both indexed on `recipient`, `campaign_id`, `created_at`:

- **`email_events`** — one row per email, lifecycle columns updated in place:
  `id, campaign_id, contractor_id, recipient, template, message_id, sent_at, delivered_at, opened_at, clicked_at, replied_at, converted_at, last_error, metadata`
- **`cta_links`** — short-token registry (replaces ad-hoc `acquisition_tracking_links` usage from previous turn):
  `token (pk, 10-char), email_id, contractor_id, campaign_id, destination_url, click_count, first_clicked_at, last_clicked_at, last_device, last_ip_hash, created_at`
- **`sms_events`** — mirror of `email_events` for SMS (`message_sid, status, error_code, delivered_at, clicked_at, replied_at`).

All writes funnel through SQL helpers `record_email_event(message_id, kind, payload)` and `record_sms_event(sid, kind, payload)` so every sender/webhook updates the same row by `message_id` (matches the dedupe rule).

### 2. Reply-as-conversion path (no link required)
- New edge function **`acq-reply-webhook`** parses inbound email (Resend/SES inbound) and inbound SMS (Twilio). On `OUI`/`YES`/any reply → set `email_events.replied_at`, create `acquisition_events('reply')`, enqueue `acq-reply-handoff` which sends the audit report + marks contractor `replied` in the funnel.
- Every outreach template gains the FR reply block from the user's copy (`Répondez simplement avec OUI`).
- Reply-To header rewritten to the inbound mailbox (`reply+{token}@inbound.unpro.ca`) so the webhook can map reply → email.

### 3. Trackable CTA hardening
Already wrapping URLs via `ctaTracker.ts`; tighten:
- **Block-send** if body contains any raw `unpro.ca/onboarding` or `app.unpro.ca/signup` (force `/r/{token}`).
- `r-redirect` edge function: log `email_id, contractor_id, timestamp, device (UA parse), ip_hash, source` into `cta_links` + `email_events.clicked_at` + `acquisition_events('clicked')` **before** 302.
- Tracking pixel `/p/{token}.gif` injected in HTML → updates `opened_at`.

### 4. Webhook wiring
- **Resend**: confirm webhook secret + map `email.delivered|opened|clicked|bounced|complained` → `record_email_event`.
- **Twilio**: status callback → `record_sms_event` (covers the "0 delivered" blind spot). Add `30006 → landline` reconciliation already started, but route the status updates through the new helper.

### 5. Email Health Dashboard v2
New page `/admin/outreach-health` (replaces the partial CTA audit page as the canonical view):

Funnel cards: **Sent · Delivered · Opened · Clicked · Replied · Onboarding Started · Activated · Paid**, per channel (email/SMS) and per campaign, with CTR/RR/CVR. Backed by view `v_outreach_funnel` joining `email_events + sms_events + acquisition_events + contractor_activation_funnel + acq_subscriptions`.

Drill-downs: last 100 messages, message_id, status timeline, rendered HTML, CTA tokens, clicks, replies.

### 6. End-to-end self-test (gate before resuming outreach)
New edge function **`acq-e2e-selftest`**:
1. Send 1 email + 1 SMS to founder address/phone via real pipeline.
2. Wait & poll for: `delivered` (Resend/Twilio webhook), `opened` (pixel hit), `clicked` (token hit via headless fetch), simulated `reply` (insert inbound webhook), simulated `onboarding_started/activated/paid` events.
3. Persist run in `acq_e2e_test_runs(step, status, latency_ms, error)`.
4. Set global flag `outreach_autopilot.gated_until_pass = true`. **No campaign sender (`acquisition-autopilot`, `outbound-autopilot-engine`, `launch-commander`, etc.) is allowed to dispatch unless the latest `acq_e2e_test_runs.status='passed' AND created_at > now()-interval '24h'`.**
5. Dashboard banner shows pass/fail with last 5 runs.

### 7. Backfill + reconciliation
- One-shot `acq-events-backfill-30d`: synthesize `email_events`/`sms_events` rows from existing `contractor_outreach_logs`, `email_send_log`, `acq_sms_logs`, then re-classify deliveries using Twilio Lookup statuses already cached and Resend message-id reconciliation.
- Mark all current "0 delivered" sends as `unknown_delivery` (not failed) so dashboards stop reporting false negatives.

## Files (high level)
- **Migration**: `email_events`, `cta_links`, `sms_events`, `acq_e2e_test_runs`, `v_outreach_funnel`, helpers, GRANTs + RLS.
- **Edge functions (new)**: `acq-reply-webhook`, `acq-reply-handoff`, `acq-e2e-selftest`, `acq-events-backfill-30d`, `p-pixel`.
- **Edge functions (patched)**: `r-redirect`, `ctaTracker.ts` (block onboarding URLs), `outreachDispatch.ts` + every email/SMS sender (record via helper), Twilio status webhook, Resend webhook, all autopilot dispatchers (gate on selftest).
- **UI**: `/admin/outreach-health` (page + 6 panels), banner injected into `/admin/operations`.
- **Templates**: add reply block to every FR outreach template + replace direct onboarding links.

## Success
- Every send writes exactly one `email_events`/`sms_events` row, updated through full lifecycle.
- Dashboard shows non-zero `delivered/opened/clicked/replied` within minutes of a real send.
- `OUI` reply via email or SMS marks contractor as converted_path=reply.
- No autopilot can fire until `acq-e2e-selftest` passes end-to-end within last 24h.
- 30-day backfill quantifies historical blind spot.

## Out of scope
Rebuilding SMS/email templates visually, switching providers, MJML refactor.
