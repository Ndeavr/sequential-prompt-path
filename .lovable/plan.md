# Acquisition Funnel Observability — Phase 0

**Goal:** Before spending another dollar on ads, SEO, AI scoring tweaks, Alex tuning, matching, or pricing, make the full acquisition funnel **fully attributable end-to-end**. Every email and SMS sent must produce verifiable Sent → Delivered → Opened → Clicked → Onboarding Started → Activated → Paid events tied back to one prospect and one campaign.

The previous work already created the CTA tracker, `outreach_email_events`, `outreach_sms_events`, the autopilot gate, and the `/admin/outreach-health` page. This phase **closes the remaining gaps** that keep showing 0 clicks / 0 attribution.

---

## What we will build

### 1. SMS delivery webhook — actually wired

- Verify `twilio-status-v2` is the URL registered on the active Twilio Messaging Service (status callback).
- Add a one-shot **Twilio Webhook Self-Check** edge function: sends a real test SMS to a founder number, polls `outreach_sms_events` for `delivered_at` within 60s, writes result to `acq_e2e_test_runs`.
- Surface in `/admin/outreach-health` as a "SMS delivery proven" green/red light with last proof timestamp.

### 2. Email delivery + open + click webhook — actually wired

- Confirm Resend webhook points at `resend-events` and signs requests.
- Add explicit handling for `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained` (writing to `outreach_email_events`).
- Reuse the same self-check pattern: send to founder address, verify delivered + open pixel + tracked click round-trip.

### 3. Click attribution — every URL wrapped, no exceptions

- Add a build-time + send-time guard in `outreachDispatch.ts` and `acq-send-outreach` that **fails the send** if any anchor href or SMS URL is not a `/r/<token>` link (already partially in place via `validateOutreachMessage`; harden it to scan rendered HTML, not template source).
- `/r/:token` must: log to `outreach_click_events`, set a first-party cookie, then 302 to destination. Cookie + token are read by `fn-track-email-click` and the onboarding landing to attribute Onboarding Started → Activated → Paid back to the original `outreach_messages.id`.

### 4. Onboarding & conversion events — closed loop

- Onboarding landing (`/entrepreneur/...`) reads the attribution cookie/token on first paint and writes `acquisition_events` rows: `onboarding_started`, `profile_completed`, `checkout_opened`, `checkout_succeeded`.
- `create-checkout-session` + Stripe webhook stamp the `outreach_message_id` into `checkout_sessions.metadata` and `acq_payment_events`.
- One view `v_outreach_funnel` already exists; extend it (or add `v_outreach_funnel_full`) to include `onboarding_started`, `activated`, `paid` per campaign × channel.

### 5. End-to-end self-test (the founder receipt)

- One button in `/admin/outreach-health` → `acq-e2e-selftest` runs:
  1. Insert synthetic prospect.
  2. Send 1 email + 1 SMS via the real dispatch pipeline.
  3. Auto-click the tracked links server-side (HEAD on `/r/<token>` with a synthetic UA marker so it's excluded from real stats).
  4. Simulate onboarding page hit + Stripe test checkout in test mode.
  5. Assert every funnel stage produced exactly one event.
- Result row in `acq_e2e_test_runs` with per-stage pass/fail + latency.
- **Autopilot gate (`outreach_autopilot_gate.gated`) auto-flips to TRUE** if any stage fails or no green self-test in the last 24h. Already in place — we just make the self-test the canonical trigger.

### 6. Observability dashboard — single source of truth

Extend `/admin/outreach-health` with:
- 7-stage funnel bar per campaign (Sent → Delivered → Opened → Clicked → Onboarding → Activated → Paid) with absolute counts and conversion %.
- Provider health row: Twilio webhook last event, Resend webhook last event, Stripe webhook last event, `/r/` last click.
- "Last full green E2E" timestamp + big red banner if > 24h or autopilot gated.
- Per-message drill-down: pick any `outreach_messages.id` and see its full event timeline.

### 7. Backfill + retention

- `acq-events-backfill-30d` (already created) is run once to reconstruct missing `delivered/opened/clicked` rows from raw `email_delivery_events` / `acq_sms_logs` / `r-redirect` logs so historical campaigns aren't permanently blind.

---

## What we will NOT touch in this phase

- Ad spend, SEO pages, AI scoring weights, Alex prompts, matching algorithm, pricing.
- Outreach copy beyond ensuring every message still carries dual CTA (reply OUI + tracked link) — that rule stays enforced as-is.
- New campaigns. Autopilot stays gated until a green self-test exists.

---

## Acceptance criteria

1. Pressing "Run E2E self-test" in `/admin/outreach-health` produces, within 5 minutes, a row showing **green for all 7 stages** with real provider webhook timestamps (not synthetic).
2. `v_outreach_funnel_full` returns non-zero `delivered`, `opened`, `clicked` for at least one historical campaign after backfill.
3. Any attempt to send an outreach message with an un-tracked URL is **blocked** (`status=BLOCKED`, `reason=untracked_url`) and visible in the dashboard.
4. If the Twilio or Resend webhook stops firing for > 30 min, `outreach_autopilot_gate.gated` flips to TRUE automatically and a red banner shows in the dashboard.
5. From a single `outreach_messages.id`, the drill-down panel shows: sent → delivered → opened → clicked → onboarding_started → checkout_succeeded with timestamps.

---

## Technical notes

- New edge functions: `twilio-webhook-selftest`, `resend-webhook-selftest`, extension of `acq-e2e-selftest` to cover the 7-stage chain.
- New SQL: `v_outreach_funnel_full` view, scheduled `pg_cron` job every 5 min to evaluate webhook freshness and update `outreach_autopilot_gate`.
- Dashboard work in `src/pages/admin/PageAdminOutreachHealth.tsx` + new components `FunnelStageBar`, `ProviderWebhookHealthRow`, `MessageTimelineDrawer`.
- No schema changes to existing event tables — we only add the view, the cron job, and the self-test rows.

Once this is green, *then* we resume optimizing acquisition.
