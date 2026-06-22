
# Contractor Acquisition Pipeline — Audit, Auto-Repair & Revenue Recovery

Unify scraping → activation into one measurable, self-healing funnel with a single source of truth, a cockpit, and recovery campaigns. Reuses existing tables (`contractor_leads`, `contractor_prospects`, `contractor_enriched_profiles`, `contact_verification_queue`, `phone_carrier_cache`, `outbound_*`, `contractor_aipp_scores`, `contractor_activation_funnel`, `platform_operation_outcomes`) instead of duplicating.

## Architecture

```text
┌─ Orchestrator (edge fn: acquisition-pipeline-audit) ─────────────┐
│  P1 scrape QC → P2 phone → P3 email → P4 decision maker         │
│  P5 outreach → P6 message → P7 click → P8 onboarding            │
│  P9 import → P10 profile → P11 payment → P12 activation         │
│  P13 lead delivery → P14 leak detection → P15 recovery enqueue  │
└──────────────┬───────────────────────────────────────────────────┘
               ▼
      acquisition_funnel_state (1 row per contractor — SoT)
               ▼
  acquisition_findings · acquisition_recovery_queue
               ▼
  /admin/acquisition-funnel  (P16 cockpit + P17 Top-20)
```

## Phases (grouped into 4 build chunks)

**Chunk A — Data Quality Layer (P1–P4)**
- Edge fn `acquisition-audit-data-quality`: scores every contractor in `contractor_leads` + `contractor_enriched_profiles` on 12 fields → writes `data_quality_score` (0–100), flags missing/invalid/duplicate/suspended-RBQ/closed.
- Phone: reuse `phone_carrier_cache` + `twilio-lookup-phone`; set `sms_eligible` boolean. Hard landline→email already enforced in `contact-router` (keep).
- Email: format + MX + disposable + role-account classification → `email_quality_score`, `email_role` (owner/info/sales/support/personal).
- Decision-maker: extract from website/Google/RBQ/NEQ via Gemini → `contact_name`, `contact_role`, `decision_maker_confidence`. Manual queue for confidence <0.6.

**Chunk B — Outreach & Click Layer (P5–P7)**
- Materialized view `campaign_conversion_funnel` per campaign: sent/delivered/opened/clicked/replied/booked + drop-off %.
- Edge fn `audit-message-templates`: scans all `outbound_sequences` + `email_templates` for spam triggers, length, CTA strength, "3-second test" via Lovable AI Gateway → `template_quality_score`.
- Click audit: Playwright job hits every landing page, captures LCP/CLS/bounce signals → `landing_page_health`. Auto-fix: image dimensions, lazy-load, Suspense fallbacks (queued, admin approval).

**Chunk C — Onboarding → Activation (P8–P13)**
- `acquisition_funnel_state` table (one row per contractor): tracks every stage timestamp + status + drop-off reason. Backfilled from existing tables.
- Onboarding audit: count steps, dead-ends, duplicate fields across `PageClaimWelcome` → `PageClaimWizard` → checkout → activation.
- Business import: ensure `claim-create-checkout` + GMB import always pre-fills; never show empty profile. Add fallback edge fn `prefill-contractor-profile`.
- Profile completion %: extend `contractor_profile_gaps`; block activation if <70%.
- Payment reconciliation: edge fn `reconcile-stripe-activations` cross-checks Stripe subscriptions vs `contractor_subscriptions` vs `contractor_activation_funnel`. Auto-repair: paid-but-inactive → activate; activated-but-unpaid → flag for admin; duplicate subs → cancel newer.
- Lead Readiness Score: per active contractor, verify notifications enabled + categories + cities + match-eligible.

**Chunk D — Leak Detection, Recovery, Cockpit (P14–P17)**
- `acquisition_findings` table: every detected leak with `stage_from`, `stage_to`, `lost_revenue_cad`, `recoverable_revenue_cad`, `auto_repairable`, `repair_difficulty` (1–5).
- `acquisition_recovery_queue`: 5 campaign types (A–E from spec). Each enqueued row triggers existing `sendViaRouter` (email/SMS via `contact-router`) + creates admin task in `contact_verification_queue` when manual.
- Cron: `*/30 * * * *` runs orchestrator; `0 */6 * * *` runs heavy Playwright + Stripe reconcile.
- **Cockpit** `/admin/acquisition-funnel`: live 9-stage funnel (Scraped → Active) with conversion %, drop-off %, revenue lost, recoverable revenue, Top-20 fixes table (sortable by revenue impact), per-stage drill-down sheet.

## Database

New tables (with GRANTs, RLS admin-only, `service_role` ALL):
- `acquisition_funnel_state` (contractor_id PK, 9 stage timestamps + statuses + reasons)
- `acquisition_findings` (stage, severity, lost_revenue, auto_repairable, status)
- `acquisition_recovery_queue` (contractor_id, campaign_type A-E, channel, scheduled_at, status)
- `landing_page_health` (route, lcp_ms, cls, bounce_rate, last_audited_at)
- `template_quality_scores` (template_id, score, issues jsonb)

Columns added: `contractor_leads.data_quality_score`, `.sms_eligible`, `.email_quality_score`, `.email_role`, `.decision_maker_confidence`, `.profile_completion_pct`, `.lead_readiness_score`.

## Edge Functions (8)

1. `acquisition-pipeline-audit` (orchestrator, calls 2–7)
2. `acquisition-audit-data-quality`
3. `acquisition-audit-contactability` (phone+email+decision-maker)
4. `acquisition-audit-outreach` (campaigns+templates)
5. `acquisition-audit-landing-pages` (Playwright)
6. `acquisition-audit-payment-activation` (Stripe reconcile)
7. `acquisition-recovery-dispatcher` (consumes queue, calls sendViaRouter)
8. `acquisition-funnel-rollup` (writes cockpit aggregates)

## Auto-repair vs Manual

**Auto (safe)**: paid-but-inactive activation, duplicate sub cancel, landline SMS block (already live), image dimensions, broken canonical URLs, missing alt text, retry transient webhook failures, re-enqueue stuck onboarding sessions.

**Manual queue** (`/admin/acquisition-funnel` tasks tab): template rewrites, landing redesign, suspended-RBQ cleanup, decision-maker conflicts, profile completion <70%, paid duplicate refund.

## Out of scope

- Alex prompts / voice
- Pricing changes
- New homeowner pages
- `client.ts` / `types.ts` (auto-gen)

## Defaults (no questions, will proceed)

- Recovery cadence A–E: 24h / 48h / 72h / 5d / 7d after stage entry.
- Top-20 ranking weight: 70% revenue impact, 20% conversion lift, 10% inverse difficulty.
- Cockpit time windows: 24h / 7d / 30d / 90d (default 7d).
- Auto-repair max per run: 50 contractors (safety throttle).
