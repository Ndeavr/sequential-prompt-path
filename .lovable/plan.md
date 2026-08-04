# Revenue Command Center — Get the First $1 Activation

No new product features. This plan consolidates what already exists into one page, adds a preflight gate that blocks sending when the activation path is broken, and adds a one-click end-to-end test.

## What already exists (verified)

- `/admin/launch-control` — Launch Control page reading `v_launch_funnel`, `v_pipeline_funnel_counts`, `v_first_dollar_tracker`, plus a campaign funnel table.
- `v_prospect_funnel` — already carries per-prospect timestamps for scrape, phone validation, SMS sent/delivered/failed, last Twilio error, click, landing, registration, OTP, checkout, paid, revenue, and `current_stage`.
- Edge functions for every step: `activation-token-resolve`, `create-activation-checkout`, `stripe-webhook`, `second-touch-outreach`, `recruitment-orchestrator`, plus many health probes.
- Current production totals from `v_pipeline_funnel_counts`: scraped 263, contactable 260, sent 27, delivered 0, clicked 0, payment_started 2, paid 1, activated 0.

Two things stand out and must be resolved before any new send: aggregate `delivered`/`clicked` read 0 while per-prospect delivery data exists in `v_prospect_funnel` (the aggregate view and the per-prospect view disagree), and `paid = 1` with `activated = 0` (a payment did not produce an active contractor). Both are unconfirmed as to cause — diagnosing them is step 1, before any UI work.

## Phase 1 — Reconcile truth (blocking)

1. Compare `v_pipeline_funnel_counts` against `v_prospect_funnel` row by row and identify which one is wrong.
2. Trace the single `paid` row end to end: Stripe session, webhook event, activation write. Determine exactly why it is not `activated`, and repair that path.
3. Repair the losing view/function so one canonical 12-stage source exists.

No SMS is sent until both are green.

## Phase 2 — Revenue Command Center

Rebuild `/admin/launch-control` as the single war room (no new route, existing links keep working). One vertical funnel, 12 stages:

scraped → eligible → phone validated → SMS sent → SMS delivered → link opened → activation page loaded → registration started → registration completed → checkout opened → $1 paid → activated

Per stage: count, conversion % from the previous stage, last timestamp, last error text, and a Fix action that deep-links to the prospect drawer or triggers the relevant repair function. Refresh every 10s. All numbers from the canonical view — nothing computed client-side.

## Phase 3 — Root cause codes

Add a `failure_code` + `failure_reason` + `recommended_fix` resolution to the per-prospect view/function, derived from data already stored (Twilio error codes, missing token, unresolved token, no checkout session, no webhook event, no activation row). The command center and CRM drawer show the human explanation, never a generic error.

## Phase 4 — Preflight gate

New edge function `revenue-preflight` running seven checks: activation route responds 200, a live token resolves, activation page loads anonymously, Stripe key reachable, webhook endpoint responds, Twilio credentials valid, database reachable. It writes a pass/fail snapshot row.

Send paths (`second-touch-outreach`, `recruitment-orchestrator`, campaign launcher) call it first and refuse to send when any critical check fails, returning the blocking reason. The command center shows the gate state at the top.

## Phase 5 — One-click full revenue test

`Run Full Revenue Test` button calling a new `revenue-e2e-test` function: create a temporary test contractor, mint a token, verify the link returns 200, resolve it, open a Stripe checkout in test mode, confirm the webhook, confirm the contractor flips to active, then clean up the test record. Returns a pass/fail line per step, rendered as a checklist.

## Phase 6 — Activation page speed and clarity

Audit `/unpro/activate/:token` only: confirm anonymous access, no auth wall, first screen states profile already created, AI analysis done, $1 activates everything, ~2 minutes. Remove any click that is not required to reach checkout.

## Phase 7 — Drop-off analytics

A drop-off panel on the command center computing per-stage loss % from the canonical view, and highlighting the single largest bottleneck with the prospects stuck there.

## Technical notes

- Canonical data: one view (`v_prospect_funnel`) plus one aggregate derived from it; delete or fix the aggregate that disagrees.
- New edge functions: `revenue-preflight`, `revenue-e2e-test`. New table: `revenue_preflight_runs` (with GRANTs and admin-only RLS).
- Modified: `PageAdminLaunchControl.tsx`, `second-touch-outreach`, `recruitment-orchestrator`, the aggregate funnel view, the activation/webhook path found broken in Phase 1.
- Untouched: SEO, sitemap, AI corpus, content, Alex, all non-revenue admin pages.

## Definition of done

Not "it compiles". Done means: a real contractor receives an SMS, opens the link, registers, pays $1, the Stripe webhook fires, the contractor becomes active in production, and the Revenue Command Center shows 1 activation.
