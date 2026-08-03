# CRM Admin Intelligence & Automated Recovery

Turn the acquisition admin into an operations console: who needs attention, why, and one click to act — built entirely on the funnel layer already shipped (`v_prospect_funnel`, `v_campaign_funnel`, `acq_sms_logs`, `verified_prospect_tokens`, `pipeline_engagement_events`).

## What already exists (verified)

- `v_prospect_funnel` already computes a `current_stage` per prospect: scraped, validated, sent, send_failed, undelivered, delivered, clicked, landing_viewed, registered, otp_verified, checkout_opened, paid — plus timestamps, SIDs, last error, click count, revenue.
- `v_campaign_funnel` aggregates the same per campaign.
- `/admin/operations-health` shows exception stages + 3 global buttons (Twilio reconcile, second-touch dry/live).
- `/admin/launch-control` shows KPI counters and the revenue wall.
- Recovery machinery exists as Edge Functions: `second-touch-outreach`, `email-fallback-dispatch`, `acquisition-followup-tick`, `twilio-delivery-reconcile`, `create-activation-checkout`, `send-verified-batch`.

Gap: no per-row actions, no priority ranking, no per-contractor timeline, no bulk actions, no audit of manual actions, no scheduled recovery rules wired to the new funnel stages.

## Plan

### 1. Data layer (one migration)

- Extend the funnel view into `v_crm_prospects`: adds `priority_score`, `needs_action` (boolean), `health_score`, `hours_since_last_activity`, and boolean flags used by filters (`has_email`, `phone_invalid`, `no_website`, `missing_rbq`, `missing_gbp`, `is_duplicate`, `opted_out`, `paid_today`, `activated_this_week`, `recoverable_revenue_cents`).
- Priority ranking (highest → lowest): clicked-not-paid, registered-not-paid, checkout abandoned, delivered + no click > 48h, failed SMS with valid email, new scrape waiting; deprioritize active / cancelled / opt-out.
- New tables (with GRANTs + admin-only RLS via `has_role`):
  - `crm_prospect_notes` — operator notes.
  - `crm_prospect_tags` — tag assignment for bulk tagging.
  - `crm_action_log` — who / when / why / source (manual vs automation) / result / payload, for every recovery action.
- Timeline function `crm_prospect_timeline(prospect_id)` merging scrape, validation, SMS logs, delivery callbacks, token clicks, engagement events, payments, emails, retries, manual actions and notes into one ordered stream.

### 2. Recovery orchestration Edge Function

One new function `crm-recovery-action` (single entry point, no duplicated senders) taking `{ action, prospect_ids[], reason }` and dispatching to existing functions:

| Action | Delegates to |
|---|---|
| validate_phone | existing contact-verification enqueue |
| retry_sms | `send-verified-batch` (single-target mode) |
| second_sms | `second-touch-outreach` |
| send_email / onboarding_email | `email-fallback-dispatch` |
| resume_checkout / new_checkout / send_payment_link | `create-activation-checkout` |
| schedule_followup | inserts into the existing follow-up queue |
| pause / archive / tag | direct state update |

Guarantees: opt-out and STOP respected, idempotency key per (prospect, action, day) so no duplicate sends, every call written to `crm_action_log`.

### 3. Automation rules

Extend the existing scheduler tick (`acquisition-followup-tick`) with the funnel-stage rules — delivered +48h no click → second SMS; second SMS +48h no click → email; clicked +24h no registration → reminder; registered +24h no payment → payment reminder; failed SMS + valid email → onboarding email. Each rule routes through `crm-recovery-action`, so dedupe, opt-out and audit are shared with manual actions. Rules run in dry-run until explicitly enabled.

### 4. Admin UI (`/admin/crm`, reusing existing admin design)

- **Stage rail**: live counters for all 16 stages, click to filter.
- **Smart filters** (chips): failed SMS, delivered, delivered-no-click, clicked-no-registration, registered-no-payment, checkout abandoned, paid today, activated this week, email available, phone invalid, no email, duplicate, no website, missing RBQ, missing Google Business, high potential, recent activity.
- **Prospect rows/cards**: badges (SMS, Delivered, Failed, Clicked, Registered, Checkout, Paid, Email sent, Needs action), priority + health score, sorted by priority; contextual action buttons per stage as specified.
- **Detail drawer**: chronological activity timeline + notes + full action history.
- **Bulk bar**: multi-select → retry SMS, send email, resend payment link, export CSV, assign tag, pause, archive.
- **KPI header**: today's revenue, $1 activations, paid plans, SMS success %, email success %, failed SMS, checkout abandoned, recoverable revenue, average time to activation.
- 10s refresh, mobile-compatible, no redesign.

### 5. Verification

Run against live production data: confirm counters match `v_campaign_funnel`, that clicked-but-unpaid ranks top, that a failed-SMS row with an email offers and completes email fallback, that checkout recovery generates a working link, and that repeated clicks produce no duplicate sends (idempotency log inspected).

## Technical notes

- No new funnel source of truth — `v_crm_prospects` is a superset view over `v_prospect_funnel`.
- No new sender: `crm-recovery-action` is a dispatcher over existing Edge Functions.
- All new tables are admin-scoped through `has_role(auth.uid(),'admin')` with explicit GRANTs.
- Nothing touched in SEO, sitemap, AI corpus or content systems.
