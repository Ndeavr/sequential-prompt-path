# UNPRO Production Reliability Framework

**Status:** MANDATORY — applies to every agent, workflow, automation, dashboard, API integration, cron job, onboarding flow, matching engine, payment flow, referral system, PIM workflow, contractor acquisition engine, and AI agent before deployment.

**Memory rule:** `mem://standards/production-reliability-framework` (Core, always in context).

---

## The Golden Rule

> A workflow is successful **only when the business outcome is achieved.**
> Code execution is not success.
> Revenue / activation / booking / payment received are success. Everything else is progress.

---

## The 12 Rules (summary)

1. **Business success > technical success** — never report OK if the objective wasn't achieved.
2. **No silent failures** — expose exact reason, timestamp, record, service, retry status; use canonical codes.
3. **Explicit state machines** — no hidden/implied states.
4. **Only count real success** — counters increment on provider-confirmed success only.
5. **Every block is actionable** — What happened / Why / How to fix.
6. **Founder Override always exists** on revenue-critical paths.
7. **Retry before failure** — 5m → 30m → 2h → 12h (Twilio, Resend, Stripe, Google, OpenAI, Anthropic, Gemini).
8. **Health dashboards reflect reality** — Generated / Sent / Delivered / Failed / Blocked / Revenue Impact.
9. **Revenue systems = Priority Zero** — failures trigger critical alert + admin notification + dashboard banner + system log.
10. **Self-diagnosing** — every run answers: intent, success, why not, next action.
11. **No fake automation** — complete only when outcome occurred.
12. **Golden Rule** — see above.

---

## How to comply

### Web code

```ts
import {
  reportOutcome, FailureCode, BlockReason, withRetry, nextRetryAt, createStateMachine,
} from "@/lib/reliability/diagnostics";
```

### Edge functions

```ts
import {
  reportOutcome, FailureCode, BlockReason, withRetry, nextRetryAt,
} from "../_shared/reliability.ts";
```

### Dashboards

Use `<OperationHealthCard>` from `@/components/admin/OperationHealthCard`. It enforces the 6-metric shape.

---

## Pre-Deploy Compliance Checklist

Before shipping any new agent / workflow / cron / edge function:

- [ ] Explicit state machine declared
- [ ] Canonical `FailureCode` / `BlockReason` used (no free-form strings)
- [ ] Counters increment only on real success
- [ ] Founder override path exists for revenue-critical paths
- [ ] `withRetry()` wraps every external call (Twilio/Resend/Stripe/Google/AI)
- [ ] `reportOutcome(...)` called on every terminal state
- [ ] Dashboard surface uses `<OperationHealthCard>` (or equivalent 6-metric layout)
- [ ] Revenue-affecting failures create `admin_notifications` + dashboard banner
- [ ] No "success" returned unless business outcome achieved

---

## Diagnostics table

`public.platform_operation_outcomes` — single log of every business operation:

| column | purpose |
|---|---|
| `operation` | e.g. `sms.send`, `stripe.checkout`, `contractor.activate` |
| `intent` | human description of what we were trying to do |
| `business_outcome` | `achieved` \| `blocked` \| `failed` \| `partial` \| `pending` |
| `failure_code` / `block_reason` | canonical enum |
| `affected_record` | id of the lead/contractor/payment |
| `service` | `twilio`, `resend`, `stripe`, `gemini`, … |
| `attempt`, `next_retry_at` | retry state |
| `revenue_impact_cents` | $ at stake when applicable |
| `next_action` | what should happen next |
| `payload` | structured diagnostics blob |

Admins read; service role writes.

---

## Retrofit policy

Existing agents retrofit **as they're touched**. New code complies from line 1. The standard, contract code, memory rule, and diagnostics table land immediately — no agent ships without them again.
