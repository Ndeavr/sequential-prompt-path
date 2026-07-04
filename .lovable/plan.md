# High-ROI SMS Acquisition Sprint

Ship a controlled 25-SMS founder sprint driving contractors to a $1 Stripe activation, gated by an internal test to 514-249-9522.

## Guardrails (hard stops)

- **No contractor SMS** goes out until the internal test to `5142499522` is `delivered` AND the tracked link resolves to a working Stripe $1 checkout.
- **No SMS** if: landline, phone validation failed, ROI < 80, duplicate company, aggregator/marketplace domain, missing tracking link, or Stripe unavailable.
- Send **5 first, wait 30 min, then 20** only if delivery + click tracking prove out.
- Cap scraping the moment 25 qualified prospects are queued.

## Step 1 — Data model (migration)

New tables (all with GRANTs + RLS + service_role access for edge functions):

- `sms_sprint_campaigns` — id, name, status (`draft|test_pending|test_ok|sending|paused|complete`), test_phone, batch_size, created_by.
- `sms_sprint_prospects` — campaign_id, prospect_id (FK `contractor_prospects`), city, category, roi_score, phone_e164, phone_type, qualification_status (`qualified|rejected`), rejection_reason, variant (`A..E`), tracking_slug (unique), created_at.
- `sms_sprint_messages` — prospect_row_id, phase (`initial|followup_24h|followup_48h`), body, provider_id, status (`queued|sent|delivered|failed`), status_reason, sent_at, delivered_at.
- `sms_sprint_link_events` — tracking_slug, event (`click|activation_view|checkout_started|checkout_completed`), prospect_row_id, meta jsonb, occurred_at.
- `sms_sprint_test_runs` — campaign_id, phone, status, provider_id, delivered_at, link_clicked_at, checkout_completed_at.

Extend `contractor_prospects` reads via a view `v_sms_sprint_eligible` filtering: ROI ≥ 80, `has_mobile = true` OR `phone_type in ('mobile','likely_mobile')`, google_rating ≥ 4.6, review_count ≥ 20, active GBP, non-aggregator, no franchise flag, weak/no website, province = QC, city in the 6 targets, category in the 6 targets. Reuses existing `_shared/prospectScoring.ts`, `_shared/phone.ts`, `_shared/aggregator.ts` from the earlier refactor.

## Step 2 — Edge functions (Twilio via existing connector gateway)

1. `sms-sprint-test` — sends the internal test SMS to `5142499522` with a real generated tracking slug pointing at the activation landing. Records to `sms_sprint_test_runs`. Blocks Step 4 until `delivered` + `link_clicked_at` OR admin manual override.
2. `sms-sprint-scrape` — pulls from `v_sms_sprint_eligible` across the 6 cities × 6 categories, round-robins for city/category diversity, stops at 25. Records rejections with reason for the dashboard.
3. `sms-sprint-assign-variants` — evenly distributes variants A–E (5 each), personalizes `[owner/company]`, `[city]`, `[category]`, `[link]`. Generates unique tracking slug per SMS embedding `prospect_id | variant | city | category | campaign_id | click_id`.
4. `sms-sprint-send` — batch param (`5` or `20`), enforces per-prospect Twilio validation lookup (line type), skips + logs rejection if landline/invalid, posts via Twilio gateway. Handles delivery status webhook.
5. `sms-sprint-webhook` — Twilio status callback → updates `sms_sprint_messages.status`.
6. `sms-sprint-track` (public GET `/r/:slug`) — records click, 302 to activation landing with UTM + `click_id`.
7. `sms-sprint-followups` (cron every 15 min) — 24h no-payment → Follow-up 1; 48h no-click → Follow-up 2. Uses same variant tone.

## Step 3 — Activation landing (Stripe $1)

Route `/activer/:slug` (contractor-facing):

- H1: **Exclusive Guaranteed Appointments. Not Shared Leads.**
- Sub: UNPRO helps homeowners find the right contractor using AI. Selected contractors can activate their AI profile for $1.
- CTA: **Activate for $1** → invokes existing `create-checkout-session` with `mode: payment`, price = $1 CAD one-time SKU, metadata `{ sprint_slug, prospect_id, variant, campaign_id }`.
- On mount: fire `activation_view` → `sms_sprint_link_events`. On checkout redirect: fire `checkout_started`. Success webhook (extend existing Stripe webhook) → `checkout_completed` + mark prospect `activated`.

## Step 4 — Admin cockpit `/admin/acquisition/sms-sprint`

Single dashboard (dark `.admin-theme`) showing:

- Internal test status card (sent / delivered / clicked / checkout completed) with **Send Test** button (disabled once ok).
- Sprint controls: **Scrape 25**, **Send first 5**, **Send remaining 20** (gated: 5-send disabled until test ok; 20-send disabled until 30 min elapsed AND ≥1 delivered click).
- KPI tiles: scraped, qualified, rejected (+ reason breakdown), queued, sent, delivered, failed, clicked, checkout_started, $1 activations, winning variant (by activation rate).
- Prospect table: company, city, category, ROI, phone_type, variant, message status, click, payment, rejection reason. Row actions: **Mark for manual call** (landline high-ROI bucket), **Requeue**, **Suppress**.
- Manual-call queue tab: landline-only prospects with ROI ≥ 80 (not sent SMS, surfaced for founder to call).

## Step 5 — Message variants

Stored in `sms_sprint_variants` seed rows (A–E, verbatim copy from the brief) + follow-up 1 (24h) + follow-up 2 (48h) templates. Rendered server-side to keep formatting stable.

## Step 6 — Execution runbook (after build)

1. Open `/admin/acquisition/sms-sprint` → click **Send Test** → confirm delivery + click + $1 checkout page loads on the test phone. Nothing else fires until this is green.
2. Click **Scrape 25** → verify rejection reasons look sane.
3. Click **Send first 5** → wait 30 min → review delivery + click counters.
4. Click **Send remaining 20**.
5. Cron takes over follow-ups at 24h / 48h.

## Return payload (dashboard export button)

JSON download with: test SMS result, scraped count, 25 qualified prospects (with variant, phone_type, ROI), rejection reasons, delivery/click/payment status per prospect, first $1 activation timestamp, blockers list.

## Technical notes

- Reuse: `_shared/prospectScoring.ts`, `_shared/phone.ts`, `_shared/aggregator.ts`, `_shared/outreachEligibility.ts`, `_shared/reliability.ts` (FailureCode, reportOutcome).
- Twilio: gateway pattern per project standards, `TWILIO_API_KEY` connection (confirm linked before sending; if missing, ask user to connect Twilio).
- Stripe: reuse `create-checkout-session`; need a **$1 CAD founder activation** price — I will create it via Stripe tools during build.
- Reliability: every send/scrape/webhook writes to `platform_operation_outcomes` with canonical FailureCode; dashboard surfaces via `<OperationHealthCard>`.
- No client-side secrets, no rate limiting primitive added (per project standard).

## Out of scope this sprint

- Long-term nurture beyond 48h follow-up.
- Voice/RCS fallback (SMS only per brief).
- Auto-dialer for landlines (manual call queue only).
