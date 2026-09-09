---
name: Autonomy Operating Model
description: Founder manual work limited to approvals + calls; autonomy loop, governance tables, policy layer and /admin/command cockpit
type: feature
---

# UNPRO Autonomy Operating Model

Permanent operating principle: founder manual work = **two classes only**.

- **A — APPROBATIONS**: material changes (message copy, offer, pricing, funnel behavior, new agent, new strategy, guardrail/compliance change) become approval cards in `founder_approvals` with proposed change, reason, evidence, expected impact, risk, rollback → Approve / Reject / Modify.
- **B — APPELS**: prioritized human call list in `founder_call_tasks` (context, script, objective, next action, outcome).

Everything else runs autonomously.

## Components
- `supabase/functions/_shared/autonomyPolicy.ts` — `classifyAction()` **fails closed** to `requires_approval` for unknown actions; `proposeApproval()` idempotent per agent+kind+target_key; `runOrPropose()` gate for agents.
- `supabase/functions/autonomy-loop/index.ts` — OBSERVE→MEASURE→DIAGNOSE→ACT→LEARN→IMPROVE. Invokes EXISTING functions (provider-health-check, fn-detect-automation-blockers, outreach-repair-agent, acquisition-queue-worker, auto-repair-tick, learning-loop, growth-optimizer). Failure isolation, per-step timeout, cycle budget, circuit opens after 3 consecutive failures, blockers written to `automation_blockers`. Supports `{dry_run:true}`.
- `supabase/functions/founder-approval-execute/index.ts` — admin-only decision + automated execution; `new_agent` provisions `agent_registry`, other kinds record approved config in `agent_memory`. Idempotent on already-decided cards.
- `supabase/functions/founder-call-queue/index.ts` — builds the call list from real `verified_contractor_prospects` rows only; never sends anything.
- `/admin/command` → `src/pages/admin/PageAdminFounderCommand.tsx` + `src/hooks/useFounderCommand.ts`.

## Governance
- DB trigger `enforce_agent_activation_approval` blocks activating an agent without an approved/executed `new_agent` card.
- `agent_learning_outcomes` + `v_tactic_performance` rank tactics on **real** outcomes only; `data_class` separates verified/declared/inferred/pending. Never fabricate learning data.

## Cron
- `unpro-autonomy-loop-15m` (job 277, `*/15 * * * *`)
- `unpro-founder-call-queue-daily` (job 278, `0 12 * * *`)

## Rules
- New agent capability = unknown action = approval required. Never bypass CASL/suppression/dedupe/kill switch/RLS.
- Never invent verification, reviews, appointments, scores, payment status or outreach results.
