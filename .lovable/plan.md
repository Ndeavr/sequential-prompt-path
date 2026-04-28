# UNPRO OMEGA — Autonomous Revenue Machine

## Reality check first

Most of what was requested already exists in the codebase. Building it again would create duplication and break the existing flywheel. Inventory:

| Requested module | Existing implementation | Action |
|---|---|---|
| Prospect Engine | `sniper-import-targets`, `fn-scrape-google-results`, `war-prospecting-engine`, `AdminProspectImport` | **Reuse** |
| Intelligence / AIPP | `aipp-real-scan`, `aipp-v2-analyze`, `edge-generate-aipp-preview`, `enrich-prospect` | **Reuse** |
| Outreach Engine | Full `/admin/outbound/*` suite (28 pages), `process-outbound-queue`, `send-sms-prospect` | **Reuse** |
| Alex Closer | `alex-sales-process-turn`, `alex-resume-after-auth`, Nuclear Close landing | **Reuse** |
| Payment Engine | `create-contractor-checkout`, `stripe-webhook`, `create-founder-checkout` | **Reuse** |
| Onboarding Engine | `PageContractorJoinProfileGate`, `contractor-activation-enrich` | **Reuse** |
| Control Tower | `/admin/omega` (`PageAdminOmega`, 623 lines, live KPIs) | **Reuse + extend** |
| Expansion Engine | ❌ Missing | **Build** |
| Churn Rescue Engine | ❌ Missing | **Build** |
| Daily autonomous loop (cron orchestrator) | ❌ Missing | **Build** |
| Autonomous A/B testing engine | Partial (experiments tables exist) | **Wire** |

The core gap is **a single conductor that runs the daily 05:00→night loop** and **two missing lifecycle engines** (Expansion, Churn Rescue). That's what this plan delivers.

---

## What we build

### 1. Omega Conductor (the daily loop)

One edge function `omega-conductor` triggered by pg_cron on a schedule, with a single dispatch table `omega_loop_runs` (run_id, phase, started_at, ended_at, status, stats jsonb, errors jsonb).

Phases (each is a thin wrapper that invokes existing functions):

```text
05:00  prospect_discovery   → sniper-import-targets + war-prospecting-engine
06:00  enrichment           → enrich-prospect (batch unenriched)
07:00  scoring              → aipp-real-scan + edge-generate-aipp-preview
08:00  campaign_generation  → campaign-generator (per city × trade cluster)
09:00  outreach_send        → process-outbound-queue (waves until 17:00, every 15m)
night  metrics_optimize     → fn-omega-rollup-metrics + fn-omega-pick-winners
```

Each phase: idempotent, writes to `omega_loop_runs`, surfaces failures to `automation_blockers` (already exists), feeds the live ticker on `/admin/omega`.

### 2. Expansion Engine (new)

After 14 days of active subscription, detect upgrade triggers and let Alex pitch.

- Table: `expansion_opportunities` (contractor_id, current_plan, recommended_plan, signal jsonb, status, created_at)
- Edge function: `expansion-detector` — daily cron. Signals: ≥80% appointment quota used, territory gap nearby, AIPP score climbed, founder slot expiring.
- UI: card on `/admin/omega` "Expansion ready" + entry in `/admin/outbound/ops` queue.
- Alex action: `alex-pitch-expansion` reusing `alex-sales-process-turn` with `mode: "expansion"`.

### 3. Churn Rescue Engine (new)

- Table: `churn_signals` (contractor_id, signal_type, severity, detected_at, status, rescue_attempt jsonb)
- Edge function: `churn-detector` — every 6h. Signals: payment_failed (from `stripe-webhook`), 14d no login, 30d no leads opened, downgrade_intent (settings page event).
- Edge function: `churn-rescue-trigger` — calls Alex with rescue script, offers pause/downgrade/strategy fix. Logs outcome.
- UI: "Save list" panel on `/admin/omega` with one-click rescue.

### 4. Autonomous A/B testing wiring

Existing `optimization_experiments` table is already wired. Add:
- `omega-experiments-rotator` — daily picks winning subject lines, CTAs, landing variants and promotes them in `outbound_email_templates` + `landing_variants`.
- Surface "winners promoted today" tile on `/admin/omega`.

### 5. Omega control extensions

On `/admin/omega`, add three new cards (UI only, data from new tables):
- **Today's loop** — phase status timeline (5 phases × today's run)
- **Expansion ready** — top 5 upgrade opportunities with one-click Alex pitch
- **Churn rescue** — top 5 at-risk accounts with severity + rescue button

---

## Database changes (migrations)

```sql
-- Loop tracking
create table omega_loop_runs (
  id uuid primary key default gen_random_uuid(),
  loop_date date not null,
  phase text not null,            -- prospect_discovery | enrichment | scoring | campaign_generation | outreach_send | metrics_optimize
  status text not null default 'running',  -- running | success | failed | skipped
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  stats jsonb default '{}',
  errors jsonb default '[]',
  unique (loop_date, phase)
);

-- Expansion
create table expansion_opportunities (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  current_plan text not null,
  recommended_plan text not null,
  signal jsonb not null,
  status text not null default 'pending', -- pending | pitched | accepted | declined | expired
  created_at timestamptz default now(),
  pitched_at timestamptz,
  resolved_at timestamptz
);

-- Churn
create table churn_signals (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references contractors(id) on delete cascade,
  signal_type text not null,      -- payment_failed | inactive_login | no_leads_opened | downgrade_intent
  severity text not null,         -- low | medium | high | critical
  detected_at timestamptz default now(),
  status text not null default 'open', -- open | rescued | lost | ignored
  rescue_attempt jsonb,
  resolved_at timestamptz
);

-- RLS: admin-only on all three (use existing has_role(auth.uid(),'admin') pattern).
```

## Edge functions (new)

- `omega-conductor` — phase dispatcher (invoked by 6 cron entries, one per phase).
- `expansion-detector` — daily signal scan.
- `churn-detector` — every 6h signal scan.
- `churn-rescue-trigger` — invokes Alex rescue flow.
- `omega-experiments-rotator` — nightly winner promotion.
- `fn-omega-rollup-metrics` — nightly KPI aggregation feeding `/admin/omega`.

All Deno functions use `https://esm.sh/@supabase/supabase-js@2.49.1` (per project rule).

## Cron schedule (pg_cron)

```text
0  5  * * *   omega-conductor?phase=prospect_discovery
0  6  * * *   omega-conductor?phase=enrichment
0  7  * * *   omega-conductor?phase=scoring
0  8  * * *   omega-conductor?phase=campaign_generation
*/15 9-17 * * *  omega-conductor?phase=outreach_send
0  2  * * *   omega-conductor?phase=metrics_optimize
0  3  * * *   expansion-detector
0  */6 * * *  churn-detector
30 2  * * *   omega-experiments-rotator
```

## UI changes

- Extend `src/pages/admin/PageAdminOmega.tsx` with three new cards (Today's loop, Expansion ready, Churn rescue).
- New hook `useOmegaConductor()` reading `omega_loop_runs` for today + realtime subscription.
- New hook `useExpansionQueue()` and `useChurnQueue()`.
- Action buttons reuse existing `useAlexSales` + outbound queue invokers — no new Alex code.

## Out of scope (explicitly not rebuilding)

- Prospect scrapers, AIPP scoring, outbound email/SMS, Stripe checkouts, Alex closer, onboarding gate, contractor profile pages, Nuclear Close landing — all already shipped and will be **invoked**, not duplicated.

## Success criteria

- `/admin/omega` shows today's 5-phase timeline with live status.
- A new prospect appears in `prospects` table by 05:30 daily without manual action.
- An enriched + scored prospect with personalized email is in the outbound queue by 08:30.
- Expansion opportunities surface on day 14+1 of any active subscription.
- A failed payment triggers a churn rescue Alex pitch within 6h.
- All KPIs on `/admin/omega` continue to read live data (no fabrication).

## What gets shipped in one pass

Everything above — migrations, 6 edge functions, cron, 3 UI cards, 3 hooks. ~10 new files, 1 page extension. No existing module is touched except `PageAdminOmega.tsx` (additive only).

---

**Black Ops mode** (competitor intel, ad-spend detection, contractor poaching) is deliberately **not** in this plan. Approve this first; ship Black Ops as Phase 2 once the loop is proven.
