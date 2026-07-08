# UNPRO Revenue Readiness Audit — Execution Plan

A full end-to-end, evidence-based audit of the revenue funnel. No assumptions — every claim will be backed by a file path, edge function name, DB table row, or live probe result.

## Scope

Funnel under audit:
`Homeowner → Address search → Project creation → Alex qualification → Recommendation → Contractor landing → Entrepreneur registration → Stripe checkout (test + live) → Webhook → Profile activation → Public visibility → SMS → Email`

## Method (read-only, no code changes)

### 1. Static codebase audit
- Map each funnel step to its route, component, edge function, and DB table.
- Grep for placeholder data, TODOs, mock flags, disabled features, hardcoded test values leaking to prod.
- Verify Stripe wiring: `create-checkout-session`, `stripe-webhook`, price IDs (Recrue/Pro/Premium/Élite/Signature), metadata propagation (quote_id, plan_id).
- Verify webhook → `contractor_subscriptions` / `profiles` activation path.
- Verify public visibility gates (`is_public`, `status='active'`, RLS on `contractors`, `contractor_public_view`).
- Verify SMS (Twilio/RCS edge functions) and Email (Resend + SPF/DKIM/DMARC) dispatch paths + delivery logging tables.
- Verify tracking: CTA clicks, page views, `share_card_clicks`, `outbound_events`, analytics events.

### 2. Database probes (read-only SQL)
- Recent rows in: `projects`, `alex_conversations`, `contractors`, `contractor_subscriptions`, `stripe_events`, `outbound_messages`, `sms_deliveries`, `email_deliveries`, `platform_operation_outcomes`.
- Check for silent-failure signals via `platform_operation_outcomes` (FailureCode/BlockReason counts, last 7d).
- Check webhook idempotency table for gaps.
- Check `contractors` where paid but not public, or public with placeholder fields.

### 3. Live edge function probes
- `curl` health endpoints: `system-health-probe`, `google-project-audit`, `voice_smoke_test`, `outbound/email-health`.
- Dry-run `create-checkout-session` (test mode) and inspect returned client_secret path.
- Simulated `stripe-webhook` payload (test signature) → confirm activation side-effects in DB.

### 4. Browser probes (Playwright, localhost)
- Homeowner flow: `/` → address autocomplete → project intake → Alex greet.
- Contractor flow: `/entrepreneur/*` → registration → checkout element render → post-payment redirect.
- Public profile: `/entrepreneur/:slug` renders real data, no `Lorem`/`placeholder`/`undefined`.
- SEO: `/sitemap.xml`, `/llms.txt`, prerender headers for Googlebot UA.

## Deliverables (single report)

For each of the ~13 funnel steps:

```text
STEP | STATUS (PASS/FAIL/PARTIAL/BLOCKED) | Evidence
  Root cause
  Component: <file>
  Table: <schema.table>
  Edge fn: <name>
  API: <endpoint>
  Expected: ...
  Actual: ...
  Repair: <exact change>
```

Followed by:

1. **Revenue Blockers Report** — ordered list of anything that stops "first dollar".
2. **First Dollar Probability Score (0–100)** — weighted from: checkout works, webhook fires, activation flips, profile becomes public, homeowner can reach a paid pro.
3. **Top 10 Fixes Ranked by Revenue Impact** — each with effort estimate + $ unlocked.
4. **Autopilot Verification Report** — `launch-commander` + 9 agents + `followup-engine` cron status, last run, success/failure counts from `launch_pipeline_events`.
5. **Hidden Silent Failures Report** — mined from `platform_operation_outcomes`, edge function logs (last 7d), unhandled promise rejections, webhook 4xx/5xx.

## Constraints

- Read-only. No migrations, no secret changes, no code edits during audit.
- All findings cite file:line, table, or function name.
- No claim without evidence. Anything unverifiable is marked `BLOCKED` with the reason (e.g., "cannot test live Stripe without real card").

## After the audit

I will present the report. You then choose which findings to fix, and I'll build them in a separate pass.

---

**Approve this plan** to run the audit. It will take several tool calls (SQL reads, edge function probes, Playwright runs, log scans) executed in parallel where possible.