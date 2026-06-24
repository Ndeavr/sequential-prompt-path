
# Outreach Health → Active Acquisition Command Center

Goal: replace the passive `/admin/outreach-health` dashboard with an active engine that diagnoses, repairs, proves the funnel end-to-end, and unlocks Autopilot itself. Builds on existing `outreach_autopilot_gate`, `v_outreach_provider_health`, `v_outreach_funnel_full`, `acq-e2e-selftest`, `acq-events-backfill-30d`, `platform_operation_outcomes`, and the Production Reliability Framework — no parallel system.

---

## 1. Schema (single migration)

New tables (all `GRANT`s + RLS admin-read, service-role write):

- `outreach_health_checks` — one row per provider per run: `provider`, `status` (`green|yellow|red`), `last_success_at`, `last_failure_at`, `failure_reason` (canonical `FailureCode`), `repair_attempts`, `next_retry_at`, `repair_duration_ms`, `repair_action`, `payload jsonb`.
- `outreach_repair_runs` — every auto-repair attempt: `provider`, `action` (`recreate_webhook|redeploy_function|recreate_cron|rotate_secret|...`), `outcome`, `error`, `duration_ms`.
- `outreach_e2e_full_runs` — 14-step real E2E: `step`, `step_status`, `step_payload`, `total_duration_ms`, `pass`, `cleanup_completed`, `synthetic_contractor_id`.
- `outreach_revenue_loss` — rolling estimate: `day`, `provider`, `contractors_lost`, `arr_at_risk_cents`, `reason`.
- `outreach_operational_score` — daily snapshot: `infrastructure`, `messaging`, `tracking`, `payments`, `automation`, `conversion`, `autopilot`, `overall`.
- `outreach_contact_intelligence` — per-recipient cache: `email_confidence`, `spf/dkim/dmarc/mx_ok`, `disposable`, `role_address`, `bounce_history`, `phone_type` (`mobile|landline|voip|invalid|dnc`), `carrier`, `decision` (`sms+email|email|call|discard`).
- `outreach_cta_checks` — per-link preflight: `url`, `status_code`, `https_ok`, `tracked`, `utm_ok`, `redirect_chain`, `screenshot_url`, `blocks_campaign bool`.
- `outreach_critical_alerts` — admin notifications with root cause, affected count, revenue at risk, repair progress.

Extend `outreach_autopilot_gate` with `auto_unlocked_at`, `auto_unlock_reason`, `operational_score`.

Extend `evaluate_outreach_gate()` to auto-unlock when: last E2E PASS < 24h AND overall score ≥ 95 AND all critical providers green.

---

## 2. Active Health Engine

Edge function `outreach-health-agent` (cron every 15 min):

For each of: Supabase DB, Edge Functions registry, pg_cron jobs, Resend, Twilio, Stripe, `/r/` redirect, DNS (SPF/DKIM/DMARC of sender domain), required secrets, key freshness.

1. Probe → write `outreach_health_checks` row.
2. If failure and repair is automatable → run `outreach-repair-agent` action, log `outreach_repair_runs`.
3. Recompute `outreach_operational_score`.
4. If critical red → insert `outreach_critical_alerts` + `admin_notifications` + (optional) SMS via Twilio + email.
5. Every terminal state calls `reportOutcome(...)` (Production Reliability Framework).

Repair playbook (deterministic, each action idempotent):

| Failure | Auto-repair |
|---|---|
| Missing Resend webhook | Re-register via Resend API |
| Missing Twilio status callback | Re-set on phone number |
| Missing/disabled pg_cron job | Re-create from canonical SQL |
| Edge function 404 | Mark for redeploy (surfaces in dashboard with one-click; deploy itself stays manual) |
| Stale webhook secret | Rotate + update Supabase secret |
| Expired API key | Alert only (cannot self-mint) |
| `/r/` redirect 500 | Re-run smoke probe, flag for redeploy |

Non-automatable failures show explicit `next_action` + revenue impact.

---

## 3. Real End-to-End Self-Test

New edge function `acq-e2e-real` (extends current `acq-e2e-selftest`, runs every 24h via cron + on-demand):

14 steps, each writing to `outreach_e2e_full_runs`:

1. Create synthetic contractor (`prefix __e2e_`, dedicated test category).
2. Generate outreach via `acq-generate-outreach`.
3. Send email via `acq-send-outreach` to controlled sink address.
4. Poll Resend webhook → `delivered`.
5. Send SMS to controlled sink number.
6. Poll Twilio status callback → `delivered`.
7. Programmatically GET tracked `/r/<token>` (server-side fetch with synthetic UA tag).
8. Verify 302 + `outreach_click_events` row.
9. Fetch landing page, assert 200 + attribution cookie set.
10. Create synthetic auth user, run onboarding API.
11. `create-checkout-session` in Stripe **test mode** with test card token.
12. Confirm Stripe webhook stamps `outreach_message_id`.
13. Verify `v_outreach_funnel_full` increments `paid` and dashboard reflects it.
14. Cleanup: delete synthetic contractor, user, sessions, events (tagged `__e2e_`).

Pass only if all 14 green. On pass: stamp `outreach_autopilot_gate.last_pass_at` + auto-unlock if score ≥ 95.

---

## 4. Funnel, Failure Intelligence, Replay

- **Live Funnel timeline** (component `LiveFunnelTimeline`): 10 stages from Scraping → Activated, click stage → drawer of failed message IDs with canonical reason.
- **Failure Intelligence card** per provider: root cause, probability, repair status countdown, % traffic impacted, ARR at risk (from `outreach_revenue_loss`).
- **Contractor Journey Replay** (`/admin/outreach-health/contractor/:id`): reads `outreach_messages`, `outreach_email_events`, `outreach_sms_events`, `outreach_click_events`, `acquisition_events`, `checkout_sessions` for one contractor, renders stop point + reason.

---

## 5. Pre-Send Intelligence

- Edge `outreach-verify-email`: SPF/DKIM/DMARC lookup, disposable/role check, bounce history → writes `outreach_contact_intelligence.email_confidence`. Below threshold → channel re-routed to SMS.
- Edge `outreach-verify-phone`: Twilio Lookup v2 → `phone_type`, `carrier`, DNC. Decision tree drives `decision` field. `outreachDispatch` consults it before send; landline-only with no email → enqueues `call_task`.
- Edge `outreach-cta-preflight`: every templated CTA in `masterOrchestrator` copy is fetched + screenshotted (Playwright via existing rendering pipeline) before campaign send. Broken CTA sets `blocks_campaign = true`; `acq-send-outreach` checks and aborts with `BlockReason.MISSING_CTA` analog.

---

## 6. Daily Autopilot Report

Edge `outreach-daily-report` (cron 07:00 America/Toronto):

- Compose markdown report (health %, providers, funnel counts, revenue, lost opportunities + reasons).
- Email + push to admin via `admin_notifications`.
- Persist as `outreach_health_checks` snapshot for history graph.

---

## 7. Dashboard UI (`/admin/outreach-health`)

Replace passive cards with:

- **Operational Score ring** (7 sub-scores + overall, color-coded). Below 95 → auto-trigger diagnostic banner.
- **Provider grid** (green/yellow/red with repair progress, last success, ARR at risk, next retry).
- **Live Funnel timeline** (clickable stages).
- **E2E status strip** (14 steps with timestamps, "Run now" button).
- **Repair log table** (last 50 repair runs).
- **Revenue protection card** (today's lost ARR, recoverable list).
- **Contractor Journey search** (input contractor id/email → replay).
- **Critical alerts feed**.

All hooks in `useOutreachHealth.ts` extended; new components in `src/components/admin/outreach-health/`.

---

## 8. Auto-Unlock Logic

`evaluate_outreach_gate()` re-written:

```
gated = NOT (
  last_e2e_pass_at > now() - 24h
  AND overall_score >= 95
  AND all critical providers status = 'green'
)
auto_unlocked_at = now() when gate flips true → false
```

If gated and last E2E older than 6h, agent triggers `acq-e2e-real` itself — never waits for human.

---

## 9. Production Reliability compliance

Every new edge function:
- Uses `withRetry` (5m/30m/2h/12h) for Twilio/Resend/Stripe/DNS calls.
- Calls `reportOutcome` with canonical `FailureCode` / `BlockReason`.
- Surfaces via `<OperationHealthCard>` in `/admin/operations`.
- Revenue-impact failures populate `admin_notifications` + dashboard banner.

---

## Out of scope (this plan)

- No changes to outreach **copy**, pricing, AI scoring, matching, Alex, SEO.
- Stripe test-mode payment uses the existing test publishable key; no new Stripe products.
- Manual edge function redeploys remain manual (tool surfaces them).

---

## Files (high level)

**Migrations** (1):
- `..._outreach_active_health_engine.sql` — 8 new tables + grants + RLS + extended gate function + cron schedules.

**Edge functions** (new):
- `outreach-health-agent`, `outreach-repair-agent`, `acq-e2e-real`, `outreach-verify-email`, `outreach-verify-phone`, `outreach-cta-preflight`, `outreach-daily-report`.

**Shared** (extended):
- `_shared/outreachDispatch.ts` (consult contact intelligence + CTA preflight).
- `_shared/reliability.ts` (already exists — used as is).

**Frontend**:
- `src/hooks/useOutreachHealth.ts` (extend with new queries).
- `src/components/admin/outreach-health/*` (OperationalScoreRing, ProviderCard, LiveFunnelTimeline, E2EStrip, RepairLogTable, RevenueProtectionCard, ContractorJourneyDrawer, CriticalAlertsFeed).
- `src/pages/admin/PageAdminOutreachHealth.tsx` (recompose).
- New route `/admin/outreach-health/contractor/:id` (`PageAdminContractorReplay`).

## Acceptance

- Provider failure auto-repaired within 15 min when automatable; otherwise alerted with revenue impact.
- `acq-e2e-real` passes all 14 stages on cron; failure auto-gates Autopilot.
- Score ≥ 95 + green E2E < 24h → Autopilot auto-unlocks without human action.
- Any contractor id reproduces full journey + stop reason.
- Zero free-form failure strings — all canonical `FailureCode` / `BlockReason`.
