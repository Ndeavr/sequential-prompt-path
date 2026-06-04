# UNPRO Production Reliability Framework — Permanent Standard

Codify the 12 rules you defined as a **non-negotiable platform-wide engineering contract** that every future agent, workflow, dashboard, edge function, cron, and integration must comply with before deployment.

## 1. Persist as Core Memory (highest priority)

Save to `mem://standards/production-reliability-framework` and add a Core one-liner to `mem://index.md` so it auto-applies to every future build action — no agent can ignore it.

**Core line (always in context):**
> Production Reliability Framework is mandatory. Never report success unless the business outcome occurred. No silent failures, explicit state machines, real-success metrics only, actionable blocks, founder override, auto-retry, revenue = P0. See `mem://standards/production-reliability-framework`.

**Full memory file** captures all 12 rules verbatim + a deployment compliance checklist (every PR/feature must answer: state machine? failure codes? real-success counter? founder override? retry policy? dashboard reflects reality? revenue alert wired?).

## 2. Create a Shared Contract in Code

A single source of truth that all engines import — so the rules are enforced mechanically, not just by convention.

- `src/lib/reliability/types.ts` — `BusinessOutcome<T>`, `OperationStatus = 'success'|'blocked'|'failed'|'pending'|'partial'`, canonical `BlockReason` and `FailureCode` enums (SMS_QUOTA_REACHED, TWILIO_AUTH_ERROR, STRIPE_WEBHOOK_FAILED, SUPABASE_TIMEOUT, INVALID_PHONE, DUPLICATE_LEAD, PAYMENT_DECLINED, CONTRACTOR_ALREADY_ACTIVATED, …).
- `src/lib/reliability/withRetry.ts` — standard backoff (5m, 30m, 2h, 12h, configurable max) for Twilio/Resend/Stripe/Google/OpenAI/Anthropic/Gemini.
- `src/lib/reliability/stateMachine.ts` — helper to declare explicit states + forbid silent transitions.
- `src/lib/reliability/diagnostics.ts` — `reportOutcome({ intent, achieved, reason, nextAction })` — every agent run must call it.
- `supabase/functions/_shared/reliability.ts` — same contract for edge functions (Deno).

## 3. Canonical Diagnostics Table

`platform_operation_outcomes` (singular log of every business operation):
- `operation` (sms.send, stripe.checkout, contractor.activate, …)
- `intent` (what we were trying to do)
- `business_outcome` (`achieved` | `blocked` | `failed` | `partial`)
- `failure_code`, `block_reason`, `affected_record`, `service`, `attempt`, `next_retry_at`
- `revenue_impact_cents` (when applicable)

All quota counters (`outreach_quota_state`, `activation_quotas`, etc.) increment **only on provider-confirmed success**, never on generation/queue.

## 4. Dashboard Compliance

Every health card in `/admin/operations`, `/admin/dispatch-center`, `/admin/outbound/*`, Pipeline CC, Revenue Dashboard must expose the 6 metrics: Generated · Sent · Delivered · Failed · Blocked · Revenue Impact. A shared `<OperationHealthCard>` component enforces the shape so no future dashboard can hide a blocked state behind a green checkmark.

## 5. Revenue = Priority Zero

Any failure on payments, lead delivery, contractor activation, booking, checkout, or matching auto-creates:
- `admin_notifications` row (severity=critical)
- `automation_alerts` row
- dashboard banner via `AlertCriticalBlocker`
- `system_events` entry

## 6. Founder Override Everywhere

Every revenue-critical engine reads from `outreach_settings`-style override table: bypass quota, force retry, reset counter, restart workflow, requeue, manual activation. Wired into a single `/admin/founder-override` control panel.

## 7. Pre-Deploy Compliance Check

Add `docs/standards/PRODUCTION_RELIABILITY.md` (human-readable rules) + `scripts/check-reliability-compliance.ts` heuristic that scans new edge functions for: imports `reliability.ts`, has explicit states, calls `reportOutcome`, defines retry. Surfaces warnings in PR.

## Technical Details

**Files created**
- `mem://standards/production-reliability-framework` (memory)
- `mem://index.md` (Core line added)
- `docs/standards/PRODUCTION_RELIABILITY.md`
- `src/lib/reliability/{types,withRetry,stateMachine,diagnostics}.ts`
- `src/components/admin/OperationHealthCard.tsx`
- `supabase/functions/_shared/reliability.ts`
- `scripts/check-reliability-compliance.ts`

**Migration**
- `platform_operation_outcomes` table (+ RLS: admin read, service_role write, GRANT block)
- enum `platform_business_outcome` (`achieved|blocked|failed|partial|pending`)

**Retrofit (incremental, not blocking the standard adoption)**
- Wave A: SMS/Twilio (`agent-send-outreach`), Stripe webhook, activation agent — these are the immediate hot path from the previous turn.
- Wave B: every other agent, on next touch.

## Out of scope for this plan
- Rewriting all existing agents now — they retrofit as they're touched. The standard, contract code, and memory rule land immediately so **all future work** complies from line 1.

Approve to ship, or tell me to narrow (e.g. memory + docs only, defer the shared lib).
