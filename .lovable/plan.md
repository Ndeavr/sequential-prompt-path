
# UNPRO Production Hotfix Sprint — First Real $1 Activation

## Guiding rules
- **Repair, don't rebuild.** Every phase starts by inspecting the existing route, table, edge function, or cron and fixing it in place. New files only when nothing exists.
- **No mocks.** Real Twilio, real Stripe, real Supabase, real contractor.
- **Every repair logged** to `platform_operation_outcomes` via `reportOutcome()` (Rule 10 of the reliability framework already in place).
- **Nothing is asserted about current state until a read confirms it.** Phase 0 is the read pass; later phases only touch what Phase 0 shows is actually broken.

---

## Phase 0 — Read-only audit (no code changes)

Before touching anything, gather ground truth:

1. **Inventory existing pipeline surface** — list every edge function, cron job, route, and table that already implements a step. Confirm which of these exist:
   - Scraping/enrichment: `launch-agent-enrich`, `outbound_*` tables, `contractor_leads`
   - Phone/email validation: normalization helpers, `contact_verification_queue`
   - SMS: Twilio connector, `outbound_send_logs`, `outreach_delivery_events`, send-window policy
   - Landing: `/entrepreneur/*`, `/pro/:slug`, nuclear-close pages
   - Registration + OTP: `otp_codes`, `auth_otp_attempts`, Supabase auth flow
   - Stripe: `create-founder-activation-checkout`, `billing_offers`, checkout sessions table, webhook function
   - Activation: `contractor_activation_*` tables, `contractor_onboarding_states`
   - Orchestration: `onboarding-orchestrator`, `onboarding-self-heal`, `launch-commander`

2. **Sample real data** to identify which stages have zero rows or lots of failures:
   - Counts + last event timestamp per stage
   - Recent `platform_operation_outcomes` where `outcome IN ('failed','blocked')`
   - Stuck contractors in `contractor_onboarding_states`
   - Twilio provider errors in `outreach_delivery_events`
   - Stripe webhook failures in `billing_webhook_events`

3. **Produce the "Broken / Partial / OK / Never-triggered" matrix** — one line per stage. This matrix is the input to every later phase; nothing is repaired without a row in it.

Deliverable of Phase 0: an in-chat audit report. No code changes.

---

## Phase 1 — SMS delivery reality (Twilio)

Only what Phase 0 flags as broken. Likely repairs (each verified first):
- Ensure `E.164` normalization is applied before insert (reuse `normalizePhone.ts`).
- Ensure every send row transitions `queued → sent → delivered/failed` (Twilio status callback must be wired to an edge function that updates `outreach_delivery_events` + calls `reportOutcome`).
- Add missing retry: use existing `withRetry` + `nextRetryAt` on `TWILIO_PROVIDER_ERROR`, cap at 3 attempts.
- Never silently swallow — every failure emits `FailureCode` + reason.

Exit criterion: a real invitation SMS to a real seed contractor is delivered and its final status stored.

---

## Phase 2 — Landing conversion (no redesign)

Only edit copy + top-of-page value strip on the existing invited-contractor landing (`/pro/:slug` / `/entrepreneur/*`, whichever the SMS actually points to):
- Personalized header: trade, primary city, demand level, coverage gap, founding position, "1 $ aujourd'hui".
- Reuse existing components (`TerritoryScarcityCard`, `TrustPositionBadge`, founder card).
- Track `landing_view` via existing `logFunnelEvent`.

No new page. No new route.

---

## Phase 3 — Registration (fewer fields)

Reduce the current registration form to: business name, phone, primary email, primary trade, primary city. Everything else pushed to progressive onboarding already handled by the orchestrator. Autosave to `contractor_onboarding_states.payload` on every field change; resume from the same row on refresh.

---

## Phase 4 — OTP resilience

Inspect `otp_codes` + `auth_otp_attempts`:
- Confirm expiry window and delivery channel actually work.
- On expiry, auto-regenerate once instead of restarting registration.
- Log each attempt to `platform_operation_outcomes`.

---

## Phase 5 — Stripe $1 flow end-to-end

Wire what already exists (`create-founder-activation-checkout`, `billing_offers.founder_premium_7d`, existing webhook):
- Verify success/cancel URLs land on the right activation route.
- Verify webhook signature check is present and idempotency key is used.
- On `checkout.session.completed`: mark contractor active, create subscription record, unlock dashboard, kick enrichment — all in the existing webhook handler, no new function.
- Handle the Project Monitoring finding pattern where the "$1 shortcut" ever routes to the full-price plan.

---

## Phase 6 — Activation confirmation UI

Reuse the existing activation success page. Ensure it displays: account active, recommendation readiness score, verification statuses (from `contractor_verification_status`), coverage, demand, next 3 actions. If a field is missing, pull from existing views — don't invent new ones.

---

## Phase 7 — Self-healing tick

Extend the already-scheduled `onboarding-self-heal` (hourly) + `auto-repair-tick`:
- Every 15 min: detect SMS failed / OTP pending / webhook failed / activation incomplete / stuck contractor.
- Retry via `withRetry`. Escalate to affiliate only after retries exhausted.
- Every retry writes to `platform_operation_outcomes`.

No new cron unless Phase 0 shows the existing crons don't cover the case.

---

## Phase 8 — `/admin/revenue-command`

Check first if `/admin/launch-war-room`, `/admin/system-integrity`, or `/admin/onboarding-orchestrator` already covers this funnel. If yes, add the missing columns there. If no, create one new page that aggregates from the same tables (`contractor_funnel_events`, `platform_operation_outcomes`, `launch_pipeline_events`).

Columns per stage: count, conversion %, drop-off, avg delay, revenue-loss estimate, click-through to affected contractors.

---

## Phase 9 — `/admin/onboarding-exceptions`

Same rule: extend the exception list in the existing onboarding orchestrator page if possible; otherwise a thin new page reading from `contractor_onboarding_states` + `platform_operation_outcomes`. Every row: reason, current state, last event, manual retry button, auto-retry status.

---

## Phase 10 — Real end-to-end production run

Not user-driven. Automated run using production services with one seeded seed contractor (real phone + email that the operator controls):

1. Insert real contractor into scraping table.
2. Let orchestrator advance it. Watch every stage in `/admin/revenue-command`.
3. Real SMS lands on operator phone → operator taps link → completes registration + OTP.
4. Stripe test-mode is **not** used — real $1 charge on operator card, refundable after.
5. Verify webhook, activation, `recommendation_eligible = true`, dashboard reflects live state.
6. Any failure: fix in place, re-run from the failing stage (orchestrator supports resume via events).

Mission complete only when: real SMS delivered, real OTP verified, real $1 charge succeeds, webhook fires, activation flips, dashboards + admin metrics update, zero silent failures in the outcomes log.

---

## Technical notes (for reviewers)

- All new code obeys the Production Reliability Framework: canonical `FailureCode` / `BlockReason`, `reportOutcome` on every terminal state, `withRetry` for external calls.
- All timestamps stored as `timestamptz` (UTC); UI uses `formatQcDateTime` (`America/Toronto`).
- Every new public-schema table (if any is truly needed) ships with `GRANT` + RLS + policies in the same migration.
- No changes to Supabase auto-generated files.
- No new payment providers or new webhooks — reuse `founder_premium_7d` offer and the existing Stripe webhook.

## Out of scope for this sprint
- New product surfaces (homeowner flows, condo, journal).
- Redesign of any page.
- New pricing tiers.

## Open question before build
Is there a specific seed contractor (real phone + real card) you want the Phase 10 run to use, or should I pick one from the current `contractor_leads` queue?
