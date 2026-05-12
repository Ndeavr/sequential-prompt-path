# UNPRO Live Activation Pipeline — isroyal.ca

End-to-end production pipeline that takes a domain at `/contractor/join`, extracts real data, scores it, recommends a plan, auto-applies the FOUNDER-1 promo to bring total to $1, runs live Stripe checkout, and activates the contractor profile. No mocks. Reuses existing UNPRO infrastructure where it exists; only adds what is missing.

## What already exists (reused, not rebuilt)

- Firecrawl edge functions for scraping/enrichment (AIPP real-scan engine)
- AIPP Real Scoring Engine (37-signal, 5-bucket deterministic)
- Contractor activation funnel (`contractor_activation_funnel`, 9 screens, routes under `/entrepreneur/activer/...`)
- Native Stripe checkout (Payment Element, fr-CA, edge-calculated taxes)
- Coupon Management System (internal + Stripe sync)
- Founder availability checker (slot scarcity)
- Alex voice (Charlotte FR, Concierge Décisif)
- Admin Operations Hub (`/admin/operations`)
- Outbound + Sniper command centers

## What is missing (this plan builds it)

A thin **live activation orchestration layer** on top of the above, plus a single-input contractor entry point and a unified live analysis page.

---

## Phase 1 — Entry point + domain normalization

**Route:** `/contractor/join` (already partially exists as `/entrepreneur/join`). Add a hardened single-input variant.

- New page `src/pages/contractor/JoinLive.tsx` mounted at `/contractor/join`.
- Single field: domain / website / RBQ / NEQ / phone / business name (reuses `detectInputKind` from `src/config/contractorOnboarding.ts`).
- On submit:
  - Normalize domain (strip `https://`, `www.`, trailing slash, lowercase).
  - Create `contractor_onboarding_sessions` row.
  - Navigate to `/contractor/analysis?session=<id>` immediately (no extra click).
  - Kick off extraction via `invoke('activation-pipeline-start', { session_id, domain })`.

## Phase 2 — Extraction Engine (real, resumable, failsafe)

**New edge function:** `supabase/functions/activation-pipeline-start/index.ts`

Orchestrates 17 extraction modules in parallel batches. Wraps each in `try/catch`; failure of any single module marks `partial_confidence=true` but never aborts the pipeline. Writes raw outputs to `contractor_imports.raw_json` and structured fields to `contractor_assets` / `contractor_signals`.

Modules (reusing existing Firecrawl wrappers where present):
1. Website scrape (Firecrawl `scrape` markdown+html+links)
2. Metadata + JSON-LD parse
3. Logo detect (Firecrawl `branding` format)
4. Phone / email / address regex
5. Service + city extraction (LLM via Lovable AI Gateway, gemini-2.5-flash)
6. CTA + trust signals
7. Page speed (PSI API if key present, else heuristic)
8. SEO (h1/h2/meta/schema)
9. Mobile heuristics (viewport, tap targets)
10. Screenshot (Firecrawl `screenshot`)
11. Social links
12. Review extractor (GMB if available, else page parse)
13. RBQ / NEQ lookup if detected
14. Indexing check (`site:` heuristic)
15. Internal linking graph (from `links` format)
16. AI visibility (FAQ, schema quality)
17. Conversion friction signals

Realtime: enable on `contractor_imports`, `contractor_analysis` so the analysis page streams progress.

## Phase 3 — AIPP scoring

**Edge function:** `supabase/functions/activation-pipeline-score/index.ts`

Calls existing AIPP Real Scoring Engine on the extracted data. Writes to `contractor_analysis` with all 5 buckets + `final_aipp_score`, `monthly_revenue_estimation`, `missed_revenue_estimation`, `generated_summary` (Gemini 2.5 Flash, fr-CA).

## Phase 4 — Plan recommendation

**Edge function:** `supabase/functions/activation-pipeline-recommend/index.ts`

Reuses existing `compute-plan-recommendation` logic. Inputs: maturity, reviews, capacity, city competition (from `useDemandGrid`). Output → `contractor_plan_suggestions`.

## Phase 5 — Live analysis page

**Route:** `/contractor/analysis` — `src/pages/contractor/AnalysisLive.tsx`

Premium dark UI (existing `landing-warm` is for public pages — this is the cinematic dark `#060B14` per project rules).

Sections, all driven by realtime subscriptions on the session's three tables:
1. Live extraction feed (per-module status, shimmer)
2. Website screenshot panel
3. AIPP score orb (uses existing `useScoreRevealEngine`)
4. Weakness cards (top 3 from `contractor_analysis`)
5. Revenue opportunity panel (missed_revenue_estimation in `formatPrice` — `3 000 $` not `3k$`)
6. Plan recommendation card (existing `CardPlanComparisonInline`)
7. Sticky CTA: **"Activer mon profil — 1 $ aujourd'hui"**

## Phase 6 — Founder promo auto-apply ($1 checkout)

**Edge function:** `supabase/functions/activation-pipeline-checkout/index.ts`

- Reads `founder_slots` via existing availability checker.
- If slots remain, auto-applies `FOUNDER-1` coupon (creates it in Stripe via existing Coupon Management if not present).
- Builds Payment Intent with `price_data` injection (existing combined-billing-logic) so total renders as **1,00 $** in Payment Element.
- UI badge: "Fondateur UNPRO — accès privilégié activé". No manual coupon field.
- Returns `client_secret` using resilient extraction (per existing checkout-reliability memory).

## Phase 7 — Activation on payment success

**Edge function:** `supabase/functions/activation-pipeline-activate/index.ts` (called from Stripe webhook + client confirmation as fallback)

On `payment_intent.succeeded`:
1. Create/upgrade `contractors` row from extracted data (respect contractor identity resolution — never overwrite human-validated fields).
2. Generate slug, bio, hero, FAQ, schema (Gemini 2.5 Flash, fr-CA).
3. Publish `/pro/:slug` (already routed).
4. Mark `contractor_onboarding_sessions.activated=true`.
5. Insert `system_events` row (`alex_handoff`, `activation`).
6. Trigger Alex auto-start handoff to `/contractor/welcome` with the existing Charlotte voice script (calm premium concierge, not enthusiastic — per the recent voice hotfix memory).
7. Send admin notification (existing outbound email infra).

## Phase 8 — Admin Live Activation Center

**Route:** `/admin/activation-live` — new tab inside existing `/admin/operations` shell.

Realtime panels:
- Imports running / failed / partial
- Stripe events feed
- Activations today
- AIPP score distribution
- Per-step retry buttons (`activation-pipeline-retry-step` edge fn)
- Raw logs drawer

## Database migrations

```sql
create table public.contractor_onboarding_sessions (...);
create table public.contractor_imports (...);
-- contractor_analysis: extend if exists, else create
-- contractor_plan_suggestions: extend if exists, else create
create table public.contractor_assets (...);
create table public.contractor_signals (...);
-- RLS: owner-only writes via service role, public read on activated profile only
-- Realtime: alter publication supabase_realtime add table ...
```

All policies follow existing UNPRO patterns (SECURITY INVOKER for public views, `has_role(auth.uid(),'admin')`).

## Failsafe rules (enforced in every edge function)

- Every external call wrapped, errors logged to `system_events`, pipeline continues.
- Partial failure → `partial_confidence=true` flag surfaced as small badge in UI, never blocks CTA.
- Every step idempotent + resumable via `session_id`.
- `Pipeline must NEVER stop completely`.

## UI / formatting rules (project memory)

- Cinematic dark `#060B14` for `/contractor/*` (app surface, not public landing).
- All money via `src/lib/formatPrice.ts` → `1 599,00 $`, never `1.6k$`.
- "Rendez-vous qualifiés" wording — never "leads" / "opportunités".
- Mobile-first, edge-to-edge, 60fps.
- Alex voice = Charlotte, calm premium concierge (no cartoon energy).

## Files to create

```
src/pages/contractor/JoinLive.tsx
src/pages/contractor/AnalysisLive.tsx
src/pages/contractor/WelcomeLive.tsx
src/pages/admin/ActivationLiveCenter.tsx
src/services/extractionEngine.ts          (client orchestration helpers)
src/services/aippEngine.ts                (client wrapper)
src/services/planRecommendationEngine.ts  (client wrapper)
src/services/stripeLiveCheckout.ts        (client wrapper)
src/hooks/useActivationPipeline.ts        (realtime session state)
supabase/functions/activation-pipeline-start/index.ts
supabase/functions/activation-pipeline-score/index.ts
supabase/functions/activation-pipeline-recommend/index.ts
supabase/functions/activation-pipeline-checkout/index.ts
supabase/functions/activation-pipeline-activate/index.ts
supabase/functions/activation-pipeline-retry-step/index.ts
supabase/migrations/<ts>_activation_pipeline.sql
```

## Files to touch

- `src/app/App.tsx` — add 4 routes
- `src/config/routesConfig.ts`
- Admin sidebar → add "Activation Live"

## Out of scope

- Rebuilding AIPP scoring (reuse)
- Rebuilding Stripe checkout component (reuse)
- Voice persona changes (reuse Charlotte)
- Outbound / sniper changes
- Mobile perf optimization (separate plan)

## Success criteria

Submitting `isroyal.ca` at `/contractor/join` results in: live extraction streamed within 2 s, AIPP score rendered, plan recommended, FOUNDER-1 auto-applied, Stripe Payment Element shows **1,00 $**, payment succeeds, `/pro/isroyal` is publicly reachable, Alex greets the contractor, and the activation appears in `/admin/activation-live` — all without a single mock value.

## End-to-end live test

After build, run pipeline against `https://isroyal.ca` and capture: session id, extraction completion %, AIPP score, recommended plan, Stripe payment intent id, activated slug, Alex handoff event id. Report in chat.
