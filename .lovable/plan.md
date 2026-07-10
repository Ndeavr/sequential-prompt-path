# Revenue War Room — Autonomous Outreach Engine V1

Goal: acquire the first recurring paid contractors. Fix telemetry first, then score, message, scrape, recover, and freeze feature work until the funnel produces activations.

---

## Phase 1 — Repair Delivery Intelligence

**New page:** `/admin/outreach-command-center` (`src/pages/admin/PageOutreachCommandCenter.tsx`)

Live funnel with 10 stages, each showing: **count · conversion % · Δ24h · Δ7d**.

```text
Prospects Found → Validated Mobile → SMS Sent → Delivered → Clicked
→ Registration Started → Profile Completed → Stripe Started → $1 Activated → Plan Upgraded
```

**Backing view (migration):** `v_outreach_command_funnel` — one row per stage, computed from:
- `contractor_prospects` / `outbound_leads` → Prospects Found
- `contractor_prospects.phone IS NOT NULL AND phone_valid` → Validated Mobile
- `contractor_outreach_logs` (status = sent / delivered / clicked) → SMS stages
- `contractor_leads.onboarding_started_at / profile_completed_at / payment_started_at / paid_at` → registration → activation
- `contractor_subscriptions` where plan ≠ recrue → Plan Upgraded

**Delivery attribution fix:** Twilio status webhook (`supabase/functions/twilio-sms-status`) must upsert into `contractor_outreach_logs` on `delivered / failed / undelivered` using `MessageSid`. This closes the `clicked=1 > delivered=0` gap surfaced by the DATA INTEGRITY alert.

Component: `<FunnelStageCard>` with count, %, sparkline-style deltas. Reuse `admin-theme` + readable tokens.

---

## Phase 2 — Contractor Prioritization Engine

**New table:** `contractor_prospect_priority`
- `prospect_id`, `google_reviews_score`, `website_score`, `response_score`, `territory_score`, `total_score` (0–100), `computed_at`

**Edge function:** `compute-prospect-priority` — scores every row in `contractor_prospects`:

```text
Reviews:  ≥200 → +60, ≥100 → +40, ≥50 → +20, else 0
Website:  none → +40, poor (no https / no phone) → +25, strong → 0
Response: mobile → +30, email only → +5
Territory: category_demand + city_demand (from city_service_demand_grid)
```

Clamp to 100. Sort desc. Only prospects with `total_score ≥ 60` enter outreach queue.

**UI:** Add "Priority Queue" tab in Command Center listing top 100 by score with the score breakdown visible.

---

## Phase 3 — Multi-Message A/B Testing

**Reuse existing** `outreach_templates` table (already present).

Seed 3 templates (variant A / B / C) with the exact FR-CA copy from the brief, `unpro.ca` link, and `channel='sms'`.

**Table addition:** `outreach_template_metrics` — per-template rollup of `sent / delivered / clicked / registered / activated`, refreshed nightly by `refresh-template-winner` edge function.

**Winner logic:** template with highest `activated / sent` after ≥ 100 sends per variant becomes `is_winner=true` and gets 80% of traffic; losers keep 10% each (explore/exploit).

**UI:** `TemplatePerformanceTable` in Command Center showing per-template funnel + winner badge.

---

## Phase 4 — Daily Autonomous Outreach

**Cron (pg_cron, 07:00 America/Montreal):** invoke `daily-outreach-orchestrator` which chains:

1. `scrape-contractors-daily` — pulls new prospects from Google Places for target cities (Laval, Terrebonne, Repentigny, Mascouche, Saint-Jérôme, Mirabel) × trades (roofing, insulation, HVAC, electrician, plumbing).
2. **Suppression filter** (`outbound_suppressions`) — hard-block domains and name patterns:
   - `renoassistance*`, `soumissionrenovation*`, `bark.com`, `homestars.com/professionals/*`, `houzz.com/pro/*`, `trouvetonpro*`, `estimatique*`
3. `compute-prospect-priority` — score fresh rows.
4. `dispatch-priority-outreach` — send winning template SMS to top N prospects (respecting `outreach_send_windows` and `outbound_global_settings` daily cap).

Log every step in `pipeline_logs` and surface in Command Center as "Last daily run".

---

## Phase 5 — Activation Recovery

**Table:** `contractor_activation_reminders`
- `contractor_id`, `stage` (`registration_incomplete` | `profile_incomplete`), `attempt` (1 | 2 | 3), `sent_at`, `template_key`

**Cron (every 15 min):** `activation-recovery-worker` detects:
- `onboarding_started_at IS NOT NULL AND profile_completed_at IS NULL`

Sends staged SMS via winning channel:
- +24 h → Reminder 1 ("Il vous reste 2 minutes pour activer votre profil UNPRO.")
- +72 h → Reminder 2 ("Votre place réservée expire bientôt.")
- +7 d → Reminder 3 (final, offers Alex call).

Enforce max 3 attempts (aligns with Alex Reengagement Control memory).

---

## Phase 6 — First Revenue Dashboard

**Card** `<FirstRevenueTracker>` on `/admin/outreach-command-center` top:

- Today's Activations
- Today's Revenue ($)
- 30-Day MRR
- Contractors Contacted (7d / 30d)
- Registrations (7d / 30d)
- Profile Completions
- $1 Activations
- Paid Plans

**Big red alert** when `MAX(paid_at) < NOW() - 48h`:
> "AUCUNE ACTIVATION DEPUIS 48 HEURES — Vérifier Command Center."

Backed by `v_first_revenue_snapshot` view.

---

## Phase 7 — Feature Freeze Gate

**New file:** `src/lib/launch/featureFreeze.ts` — exports thresholds and a `useFeatureFreezeStatus()` hook reading `v_outreach_command_funnel`:

```text
sms_delivered_rate   ≥ 90 %
click_rate           ≥ 5  %
registration_rate    ≥ 2  %
paid_activations_7d  ≥ 3
```

Show freeze banner at top of every `/admin/*` page listing which thresholds are unmet. Purely informational — no route blocking.

Document freeze rule in `docs/standards/FEATURE_FREEZE.md` (new features paused until all four green).

---

## Technical Details

**Migrations (single file):**
- `v_outreach_command_funnel`, `v_first_revenue_snapshot` views
- `contractor_prospect_priority`, `outreach_template_metrics`, `contractor_activation_reminders` tables (GRANTs to `authenticated`+`service_role`, RLS admin-only via `has_role`)
- Seed 3 outreach templates + suppression domain rows
- pg_cron schedules for `daily-outreach-orchestrator` (daily 07:00) and `activation-recovery-worker` (*/15 min)

**Edge functions (new):**
- `compute-prospect-priority`
- `daily-outreach-orchestrator` (chains scrape → score → dispatch)
- `scrape-contractors-daily`
- `dispatch-priority-outreach`
- `refresh-template-winner`
- `activation-recovery-worker`
- `twilio-sms-status` (or patch existing) for delivery attribution

All use `reportOutcome()` + `FailureCode` per Production Reliability Framework.

**Frontend files (new):**
- `src/pages/admin/PageOutreachCommandCenter.tsx`
- `src/components/admin/outreach/FunnelStageCard.tsx`
- `src/components/admin/outreach/FirstRevenueTracker.tsx`
- `src/components/admin/outreach/TemplatePerformanceTable.tsx`
- `src/components/admin/outreach/PriorityQueueTable.tsx`
- `src/components/admin/outreach/FeatureFreezeBanner.tsx`
- `src/hooks/useOutreachCommandCenter.ts`
- `src/lib/launch/featureFreeze.ts`

**Router:** add `/admin/outreach-command-center` and link from `/admin/contacted-contractors` + `/admin/revenue-debug`.

**Styling:** wrap all new admin pages in `.admin-theme`, use `.text-readable*` tokens (per UI Readability Rule memory).

---

## Out of Scope

- Building homeowner features, new AI modules, animations, or dashboards not listed here (Phase 7 freeze).
- Backfilling historical `contractor_funnel_events`.
- Actual contact of the first 100 contractors — that happens after deploy, manually driven by telemetry.
- Rewriting Twilio provider integration beyond fixing the status webhook.
