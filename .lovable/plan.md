## Goal

Run the existing UNPRO outbound infrastructure end-to-end against a real campaign — no dry-run, no mock data — until at least one contractor pays via Stripe. Trade: **Isolation d'entretoits**. Cities: **Laval, Terrebonne, Longueuil, Montréal**. Target: **30 real companies**.

All secrets are present (FIRECRAWL, GOOGLE_PLACES, RESEND, TWILIO, STRIPE, GEMINI, LOVABLE_AI). All 43 `outbound_*` tables exist. ~80% of edge functions already exist; we wire them into one orchestrator + a Mission Control UI and fill the gaps.

---

## Phase 1 — Real Scraping (30 companies)

**New edge function: `mission-scrape-trade-cities`**
- Input: `{ trade_slug, cities[], target_count }`.
- For each city: call Google Places Text Search (`textsearch + nearbysearch`) using `GOOGLE_PLACES_API_KEY` → harvest place_id, name, phone, website, rating, review_count, address.
- Dedupe by normalized name + city + phone. Insert into `outbound_companies` + `outbound_prospects` only after row write succeeds (so counters reflect reality).
- Retry policy: 2 retries per city; on persistent failure → write `outbound_admin_alerts` row + continue. Fallback source: Firecrawl search (`isolation entretoit {ville}`) → top-20 domains.
- Counter `scraped_count` increments per DB insert ACK, exposed via realtime channel.

## Phase 2 — Real Enrichment

Reuse `enrich-business-profile` + `aipp-real-scan` (already deterministic 37-signal scorer per memory).

**Orchestrator: `mission-enrich-batch`**
- Pulls `outbound_prospects WHERE enrichment_status='pending' AND mission_id=$1`.
- For each: Firecrawl scrape website (formats: markdown, links, screenshot, branding) → extract services, RBQ pattern, schema.org presence, mobile signals, before/after detection, CTA presence.
- Cross-check RBQ via `aipp-verify-rbq`. Persist trust signals + weaknesses into `outbound_lead_enrichment`.

## Phase 3 — AIPP Scoring

Invoke `aipp-pipeline-run` (existing) per prospect. Persist into `outbound_ai_scores`:
- visibility / trust / conversion / ai_readiness / estimated_lost_revenue_monthly.
- Confidence-gated per existing scoring engine memory.

## Phase 4 — Personalized Outreach Generation

**New edge function: `mission-generate-outreach`**
- Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with a strict FR-CA prompt grounded ONLY in real findings from `outbound_ai_scores` + `outbound_lead_enrichment`.
- Output schema (per prospect): `{ subject, email_body, sms_body, landing_hook }`.
- Tone: short, specific, revenue-focused, local demand, territory scarcity, no agency fluff. Forbidden patterns enforced via regex post-filter.
- Saves to `outbound_ai_personalizations` + `outbound_messages` (status=`ready`).

## Phase 5 — Wave 1 Send (10)

**New edge function: `mission-execute-wave`**
- Wave 1: select top-10 by AIPP weakness × territory priority.
- Channel routing:
  - Mobile phone detected (Twilio Lookup `type=mobile`) → SMS first via existing Twilio path.
  - Else → Email via existing Resend path (`process-outbound-queue` honors `outbound_global_settings` send windows + per-mailbox quotas).
- All sends logged to `outbound_sent_messages` + `outbound_delivery_metrics`. UTM-tagged links → `/analyse/:slug` (existing Nuclear Close landing).
- Webhooks already hooked (Resend events → `outbound_events`).

## Phase 6 — Auto-Optimization Loop

**New edge function: `mission-optimize` (cron every 30 min)**
- Reads `outbound_delivery_metrics` for current mission.
- Triggers regeneration thresholds:
  - open_rate < 20% → regenerate subjects only.
  - click_rate < 5% → regenerate landing hook + email CTA.
  - checkout_start_rate < 2% on landing → simplify checkout copy variant (Stripe `metadata.variant`).
- New variants stored in `outbound_ai_personalizations` with `variant` index. Wave 2 uses top-performing hook.

## Phase 7 — Follow-up Engine

Reuses `outbound_sequences` + `outbound_sequence_steps`. Seed sequence:
- Day 0 (Wave 1), Day 2 (short reminder + 1 finding), Day 5 (territory scarcity + competitor count), Day 10 (last-call urgency, founder pricing window).
- `process-outbound-queue` already drains the queue; ensure cron is active.

## Phase 8 — Landing + Alex → Stripe

Use existing `/analyse/:slug` (Nuclear Close memory). Wire Mission prospects so:
- `outbound-landing-resolve` returns AIPP findings, weaknesses, estimated loss, territory status (places remaining via `mission_territory_state`), competitor count.
- Alex opens with Charlotte voice (locked config), explains findings, pushes to `outbound-checkout-start` → Stripe Payment Element (existing native checkout per memory).
- Stripe webhook (`stripe-webhook`) on `checkout.session.completed`:
  1. Mark prospect `converted=true`.
  2. Call `contractor-activation-enrich` to create contractor + AIPP profile.
  3. Allocate territory slot via `territory-management` (existing).
  4. Emit `mission_event: first_payment` → triggers Phase 9.

## Phase 9 — Post-Payment Activation

After first paid contractor:
- Mark mission `success=true`.
- Kick off (background, non-blocking): homeowner SEO pages for `isolation-entretoit/{ville}` via existing `aeo-batch-orchestrator`, Facebook campaign brief row in `marketing_campaigns`, Google-indexed page generation.

## Phase 10 — Mission Control UI (`/admin/mission-control`)

Premium dark cinematic admin page (uses `unicorn-theme.css`, no new colors).

Sections:
- **KPI bar (realtime)**: scraped / enriched / scored / sent / opens / clicks / replies / checkout_starts / payments / territory_fill %.
- **Pipeline funnel** (8 stages with live counts from DB only).
- **Prospects table** with status pills + per-row drawer (findings, score, generated copy preview, send history, events).
- **Wave controls**: Pause automation · Retry failed · Approve next wave · Trigger AI rewrite · Send test · Expand territory.
- **Live event log** (realtime channel on `outbound_events`).
- **Mission success banner** when first Stripe payment lands.

Wired via new hook `useMissionControl.ts` (TanStack Query + Supabase realtime on `outbound_companies`, `outbound_sent_messages`, `outbound_events`, `outbound_ai_scores`).

---

## Technical details

### Database migration
New table `outbound_missions`:
- `id, name, trade_slug, cities[], target_count, status, started_at, completed_at, first_payment_at, success boolean`
- `scraped_count, enriched_count, scored_count, sent_count, paid_count` (atomic updates via trigger on related tables, so counters reflect only committed rows)
- RLS: admin-only via existing `has_role(auth.uid(),'admin')`. GRANTs to authenticated + service_role.
- Companion `mission_territory_state(mission_id, city, total_slots, taken_slots, remaining_slots)`.

### New edge functions
1. `mission-scrape-trade-cities`
2. `mission-enrich-batch`
3. `mission-generate-outreach`
4. `mission-execute-wave`
5. `mission-optimize` (cron 30m)
6. `mission-orchestrator` — single entrypoint that walks phases 1→5 and schedules 6/7.

All use `https://esm.sh/@supabase/supabase-js@2.49.1` (per project rule), share `_shared/brand-phonetic-lock.ts`, and apply `cors`, Zod validation, granular retries, write to `outbound_pipeline_errors` on failure.

### Files to create
- `supabase/migrations/<ts>_outbound_missions.sql`
- `supabase/functions/mission-scrape-trade-cities/index.ts`
- `supabase/functions/mission-enrich-batch/index.ts`
- `supabase/functions/mission-generate-outreach/index.ts`
- `supabase/functions/mission-execute-wave/index.ts`
- `supabase/functions/mission-optimize/index.ts`
- `supabase/functions/mission-orchestrator/index.ts`
- `src/pages/admin/PageMissionControl.tsx`
- `src/hooks/useMissionControl.ts`
- `src/services/missionControlService.ts`
- Route entry in `routesConfig.ts` → `/admin/mission-control`

### Files to edit
- `supabase/functions/stripe-webhook/index.ts` — emit `mission_event` on first matching paid prospect.
- `supabase/functions/outbound-landing-resolve/index.ts` — include mission territory state in payload.

### Success condition
Pipeline reports success ONLY when:
1. ≥1 row in `outbound_sent_messages` with `status='delivered'` to a Mission prospect.
2. ≥1 row in `stripe_payments` linked to a Mission prospect with `status='succeeded'`.
3. Contractor row created + AIPP profile generated + territory slot taken.

Mission Control banner flips to `MISSION SUCCESS` only when (1)+(2)+(3) all true.

---

## Build order on approval

1. Migration `outbound_missions` + `mission_territory_state` + triggers (await user approval).
2. 6 edge functions in parallel.
3. Mission Control UI + hooks.
4. Wire Stripe webhook + landing resolver patches.
5. Seed mission row for *Isolation d'entretoits × 4 villes × 30 cibles* and invoke `mission-orchestrator` from the UI's "Launch Mission" button.