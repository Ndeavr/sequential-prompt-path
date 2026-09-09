# UNPRO Autonomy Operating Model — Phase 1

Make "founder does only Approvals + Calls" a permanent, enforced principle on top of the existing
architecture (622 edge functions, agent_registry/agent_tasks, automation blockers/workflows/rules,
platform_operation_outcomes, 32 active cron jobs). No parallel system is created.

## What exists already (verified)

- Agents: `agent_registry`, `agent_tasks`, `agent_logs`, `agent_memory`, `agent_metrics`, `agent-orchestrator`, `/admin/agents`.
- Automation: blockers / workflows / rules tables + `automationCommandCenterService`, `fn-detect-automation-blockers`, `auto-repair-tick`, `system-watchdog-hourly`, `learning-loop`, `growth-optimizer`.
- Reliability: `platform_operation_outcomes` + `reportOutcome` / `withRetry` (web + edge).
- Guardrails: `system_flags.OUTREACH_ENABLED`, `killSwitch.ts`, `outreachGate.ts`, CASL evidence, suppression, dedupe, provider circuit state.
- Missing: a single approval object, a call-list object, and a founder cockpit that shows only those two.

## What Phase 1 builds

### 1. Governance layer (new, minimal)

Two new tables, everything else reused.

- `founder_approvals` — one row per proposed material change.
  Fields: `id`, `kind` (message | offer | funnel_behavior | pricing | new_agent | strategy | other),
  `title`, `proposed_change` (jsonb), `reason`, `evidence` (jsonb: real metrics only),
  `expected_impact`, `risk_level`, `rollback_plan`, `status` (pending | approved | rejected | modified | executed | failed),
  `proposed_by_agent`, `decided_by`, `decided_at`, `execution_result`, `version`, timestamps.
- `founder_call_tasks` — one row per prioritized human call.
  Fields: prospect/affiliate/contractor refs, `priority_score`, `reason`, `context` (jsonb of verified/declared data),
  `suggested_script`, `objective`, `status` (queued | called | reached | no_answer | callback | won | lost | skipped),
  `outcome_note`, `next_action`, timestamps.

RLS: admin read/write, service role full. GRANTs included in the migration.

### 2. Autonomy classifier (guardrail, enforced in code)

`supabase/functions/_shared/autonomyPolicy.ts` — a single function `classifyAction(action)` returning
`autonomous` or `requires_approval`, plus `proposeApproval()` helper.

Rules: routine ops (discovery, enrichment, dedupe, segmentation, eligibility checks, sends using an
already-approved template, follow-ups, funnel moves, retries, queue recovery, reporting, internal
linking, threshold tuning inside stored guardrails) run autonomously. New message/offer copy, pricing,
funnel behavior change, new agent, new strategy → `founder_approvals` row instead of shipping.

Existing senders keep their fail-closed kill-switch checks; the classifier is additive and never
loosens a compliance gate.

### 3. Autonomous loop orchestrator

New edge function `autonomy-loop` (cron every 15 min) that runs
OBSERVE → MEASURE → DIAGNOSE → PROPOSE/ACT → TEST → LEARN, by *calling existing* functions:
`fn-detect-automation-blockers`, `auto-repair-tick`, `acquisition-queue-worker`, `learning-loop`,
`growth-optimizer`, `outreach-repair-agent`, `provider-health-check`.

Failure isolation: each step wrapped in `withRetry`, failures recorded in `platform_operation_outcomes`
and as an automation blocker; one failing step never aborts the cycle. Per-cycle budget caps and a
consecutive-anomaly circuit that opens a blocker instead of looping.

### 4. Self-learning ledger

`agent_learning_outcomes` (new): `tactic_key`, `channel`, `variant`, `service_category`, `city`,
`source`, plus real observed counters (delivered / clicked / signup / activation / appointment /
conversion) and `data_class` (verified | declared | inferred | pending). Populated only from real
production events already logged (`contractor_funnel_events`, engagement webhooks, outcomes table).
A `v_tactic_performance` view ranks tactics; the loop uses that ranking to allocate effort.
No synthetic rows, ever.

### 5. Founder Command Center

New route `/admin/command` (added to existing admin nav), three zones:
1. **APPROVALS NEEDED** — approval cards (change, reason/evidence, impact, risk, rollback, Approve / Reject / Modify).
   Approve triggers automatic execution via `founder-approval-execute` and records the result.
2. **CALLS TO MAKE** — prioritized call list with contact, context, script, objective, one-tap outcome.
3. **AUTONOMOUS HEALTH** — what agents did, what they learned, live KPIs, failures being auto-repaired,
   and only the blockers genuinely needing a human. Routine telemetry is never rendered as a task.

Existing dashboards stay; this becomes the default landing page for the founder.

### 6. Agent governance

Agents may insert a `founder_approvals` row of kind `new_agent` when evidence shows a persistent gap.
They cannot write `agent_registry` with `status = active` — a DB trigger blocks activation unless a
matching approved approval exists. After approval, provisioning/config/test is automated.

## Safety

Cron 142 and `OUTREACH_ENABLED` are left exactly as they are now. No provider is called during
implementation or tests (mocked, with a zero-external-call counter). No prospect, user, affiliate or
founder data is modified. Migrations are additive only.

## Deliverables

- 1 migration (2 + 1 tables, view, trigger, RLS, GRANTs)
- `_shared/autonomyPolicy.ts`, `autonomy-loop`, `founder-approval-execute` edge functions + 1 cron
- `/admin/command` page + hooks/service + nav entry
- Unit tests for the classifier, the learning ranker and the activation trigger; typecheck + build

## Not in Phase 1

Migrating all 30+ legacy dashboards into the cockpit, and retrofitting every one of the 622 functions
to the classifier. Retrofit happens as each function is touched, per the existing reliability policy.
