## Mission

Get the first real $1 contractor activations today. Freeze all non-revenue work. Every change below exists only to remove a blocker between "scraped" and "activated".

Success today = 20 invitations sent, 5 registrations, 3 OTPs, 2 payments, 2 activations.

## Scope

In: Launch Control Center, manual campaign mode, manual activation, SMS+email backup, per-contractor timeline, dead-lead quarantine, post-payment welcome, friction removal on registration/OTP/checkout, end-to-end test button, revenue wall, kill switch on non-revenue work.

Out: redesigns, new marketing pages, SEO, AI corpus, sitemap, role switcher, affiliate polish, any UI change that does not touch the click→pay→activate path.

## Steps

### 1. Launch Control Center — `/admin/launch-control`
Single mobile-first page. One data source: reuse `v_first_dollar_tracker` + `contractor-revenue-timeline` + `acquisition_pipeline_events`. Refresh every 10s. 12 counters for today (America/Toronto midnight):
scraped, valid_phone, sms_sent, sms_delivered, email_sent, email_opened, landing_visits, registrations_started, otp_completed, checkout_opened, paid_1dollar, activated.
Any counter flat >10min → red halo + "blocker" chip that links to the exact stage in the timeline panel. No new components if `RevenueTimelinePanel` + `FirstDollarMini` already cover it — extend, don't duplicate.

### 2. Manual Campaign Mode
Reuse existing `CampaignLauncher` on `/admin/acquisition-pipeline`. Add: province + city + category + count (default 25) → Preview → Send Now. Preview calls existing `acquisition-queue-worker` in `dry_run=true` deterministic mode; Send Now flips `dry_run=false`. No new endpoint.

### 3. Manual Activation Backup
On every contractor row in `/admin/launch-control` and existing reconciliation table: "Activer manuellement" button → new edge fn `admin-manual-activate` that (a) marks the lead paid with `payment_source='manual_admin'`, (b) calls the existing activation path used by the Stripe webhook, (c) logs to `admin_activation_logs`. Founder override, audit-logged.

### 4. Emergency SMS Template
Register one short template in `campaign_message_templates` (or existing equivalent) exactly as specified. Set as default for the launch campaign. No changes to `send-verified-batch` other than template selection.

### 5. Email Backup on SMS Failure
`send-verified-batch` already has Tier C SMS→email fallback. Extend: on any SMS non-2xx / non-queued Twilio response, or if delivery status hasn't advanced in 5 min, auto-enqueue Resend email using existing `send-contractor-invitation-email` function. Idempotent by `(lead_id, channel)`.

### 6. Per-Contractor Timeline
Reuse `contractor-revenue-timeline`. On failed step, require `failure_reason` populated from `acquisition_pipeline_events.error_code` — never "Unknown error". If missing, show the raw provider payload snippet. Timeline drawer opens from any launch-control row.

### 7. Kill Dead Leads
Add `quarantine_reason` writer in `acquisition-queue-worker` for: invalid_phone, no_website, duplicate_phone_or_neq, no_public_business. Set `retry_blocked=true` so the fair-queue worker skips them permanently. Surface count in Launch Control.

### 8. Post-Payment Welcome
On successful Stripe webhook → redirect target `/activation/welcome` shows "🎉 Bienvenue chez UNPRO" and auto-starts Alex within 500ms (reuse existing Alex auto-start hook, no new voice code). No intermediate loading page.

### 9. Remove Friction on Register → OTP → Pay
Audit the current `/e/:leadId` → register → OTP → checkout path only. Remove any optional field, tutorial modal, or extra confirmation between the invitation link and Stripe. Target: ≤90s. Any field not required for Stripe or activation is deleted from this path only.

### 10. End-to-End Test Button
Admin-only button on Launch Control → new edge fn `run-full-activation-test`: creates test contractor with `is_test=true`, sends invitation to a founder-owned email, generates OTP via existing path, opens Stripe test-mode checkout, completes payment via test card token, verifies activation row. Returns green/red report + failing step. Test contractors excluded from all counters.

### 11. Revenue Wall
Header component on every `/admin/*` page: "Aujourd'hui: $X / $5 — Y contrats restants". Data from `v_first_dollar_tracker`. One component, injected in `AdminLayout`.

### 12. Definition of Done Guard
Add `docs/standards/REVENUE_ONLY_MODE.md` extending `FEATURE_FREEZE.md`: until `paid_1dollar >= 2` for the day, agent must refuse feature work and identify the blocking step with evidence from `acquisition_pipeline_events`.

## Files (touch list, no rewrites)

- New: `src/pages/admin/PageAdminLaunchControl.tsx`, `src/components/admin/launch/*` (KPI grid, RevenueWall, TimelineDrawer if not reusable), `docs/standards/REVENUE_ONLY_MODE.md`.
- New edge fns: `admin-manual-activate`, `run-full-activation-test`.
- Extend: `supabase/functions/acquisition-queue-worker/index.ts` (quarantine writer), `send-verified-batch/index.ts` (auto-email on SMS fail), `contractor-revenue-timeline/index.ts` (mandatory failure reasons).
- Extend: `src/pages/admin/PageAdminAcquisitionPipeline.tsx` (province/city/category/count on CampaignLauncher), `src/layouts/AdminLayout.tsx` (RevenueWall header), post-Stripe redirect page `src/pages/activation/PageActivationWelcome.tsx`.
- Migration: add `retry_blocked`, `quarantine_reason` on `verified_contractor_prospects` if missing; `is_test` flag on contractors + leads; index for today-scoped counters.

## Verification order (must run in this order, stop on first red)

1. Deploy migrations + edge fns.
2. Run "End-to-End Test" button → must go green.
3. Manual campaign: Laval / plombier / 3 real prospects, `dry_run=false`.
4. Launch Control shows sms_sent ≥ 1 within 60s.
5. Click one link on a founder phone → landing_visits +1, registrations +1, otp +1, checkout +1, paid +1, activated +1 within 90s.
6. Only after (5) is green: scale campaign to 25.

If any step fails: stop, open the timeline for that lead, capture the exact `error_code`, ship the minimum fix, retry from step 2.

## Non-negotiables

- No new features outside this list.
- No UI change that doesn't shorten the click→pay path.
- Every counter and blocker traces to a real row in `acquisition_pipeline_events` or `v_first_dollar_tracker`. No mocked data. No estimated numbers.
