
# UNPRO — Contractor Intelligence Landing

A single, premium contractor landing page that diagnoses the business, reveals AIPP score, projects lost revenue, and recommends a plan with one-click Stripe activation. Reuses every engine already in the codebase — no duplicate funnels, no new auth flow.

## Route & entry points

- Canonical route: `/entrepreneur` (replaces current `PageEntrepreneursLanding` content; keep file, swap default export to new composition).
- Aliases that already exist keep working and redirect into the same page: `/je-suis-entrepreneur`, `/pro-landing`, `/entrepreneur/landing-aipp`.
- Homepage `/` "Je suis entrepreneur" CTA points to `/entrepreneur`.
- Deep-link params honored: `?company=`, `?website=`, `?phone=`, `?utm_*` (auto-prefill + skip step 1).

## Two operating modes (toggle, Alex-first default)

Default mode = **Alex Conversational**. A small pill switch ("Mode Alex" ↔ "Mode rapide") sits under the hero. Both modes write to the same `contractor_intake_sessions` row so progress survives mode switches.

### Mode A — Alex First (default)
- Reuses `AlexFloatingOrb` + `AlexHomepageConversation` from the homepage.
- Auto-start after 1.5 s (respects existing `useAlexHomeAutostart` guards: tab visible, no prior decline, mic permission state).
- First message (display / spoken split via existing `prepareAlexSpeechText`):
  - Display: "Bonjour. Je suis Alex d'UNPRO. Je vais analyser votre entreprise et voir combien de contrats vous pourriez décrocher de plus avec UNPRO."
  - Spoken: "Bonjour. Je suis Alex d'Un Pro. Je vais analyser votre entreprise…"
- Alex collects (one question at a time, ≤ 5 questions): company name OR website OR phone → trade → city → monthly project volume → average ticket.
- Each answer streams into the same intake session and triggers the live website scan + AIPP preview cards inline in the transcript.

### Mode B — Smart adaptive questionnaire
- 3 steps, progress bar, mobile-first stacked cards.
- Step 1 — Identification: Company Name, Website, Phone, RBQ (optional). Auto-detect on blur using existing `aipp-real-scan` + GMB enrichment edge functions.
- Step 2 — Situation (chips, not long forms): projects/month, avg ticket, quotes/month, close-rate slider, dead periods Y/N, lead sources (multi-select), crews, service radius, emergency Y/N, seasonal Y/N. Anything skipped is fine — recommendation engine handles partial input.
- Step 3 — Reveal (shared with Mode A).

## Reveal flow (shared by both modes)

1. **Instant Website Scan card** — appears the moment a website/phone is captured: live screenshot (Firecrawl), 4 detected issues, mini-score preview. Pure dopamine trigger, drives completion.
2. **AIPP Score reveal** — full-screen animated number + 6 category bars (SEO, Google Trust, Conversion, Branding, AEO, Content Authority). Reuses `useScoreRevealEngine` + `AlexAIPPScoreCard`.
3. **Revenue Opportunity Projection** — current vs. UNPRO leads/month, estimated lost revenue range. Computed deterministically from intake (avg ticket × close-rate gap × territory density).
4. **Plan Recommendation card** — pulsing, single recommended plan from `recommendPlan()` with 3 reasons, included features, scarcity badge ("3 places restantes à <ville>") sourced from existing availability checker.
5. **Dual CTA** — Primary "Activer mon profil UNPRO" → existing native Stripe checkout (`/entrepreneur/checkout` flow, no new payment code). Secondary "Voir mon rapport détaillé" → `/entrepreneur/score` reveal page.

## What to build vs. what to reuse

**Reuse as-is (do not duplicate):**
- AIPP scoring: `aipp-real-scoring-engine` edge fn + `useAIPPv2Audit`
- Website scan: existing Firecrawl `aipp-real-scan` edge fn
- Plan recommender: `services/planRecommendationService.ts`
- Stripe checkout: `PageContractorCheckout` + existing edge fns
- Alex voice: `AlexFloatingOrb`, `AlexHomepageConversation`, `alexVoiceConfig`, `alexCorePrompt`
- Score reveal: `useScoreRevealEngine`, `AlexAIPPScoreCard`
- Availability scarcity: `useAvailabilityCheck`
- Pricing copy: `config/contractorPlans.ts`

**New (frontend-only composition):**
- `src/pages/entrepreneur/PageEntrepreneurDiagnosticLanding.tsx` — page shell, mode toggle, intake state machine.
- `src/components/entrepreneur-landing/HeroDiagnostic.tsx` — headline, sub, orb slot, mode toggle.
- `src/components/entrepreneur-landing/QuestionnaireSmart.tsx` — 3-step adaptive form (chips/sliders, no long inputs).
- `src/components/entrepreneur-landing/InstantScanCard.tsx` — live website screenshot + detected issues.
- `src/components/entrepreneur-landing/RevenueProjectionCard.tsx` — current vs UNPRO + lost-revenue range.
- `src/components/entrepreneur-landing/PlanRecommendationCard.tsx` — single recommended plan, scarcity, dual CTA.
- `src/components/entrepreneur-landing/TrustStrip.tsx` — live counters, real review snippets, before/after AIPP, territory scarcity (data already in DB, queried via existing hooks).
- `src/hooks/useContractorIntakeSession.ts` — orchestrates session row + edge calls + mode bridge.

## Data — minimal additive migration

Only one table is new; the rest already exist (`contractor_aipp_scores` lives under `contractors.aipp_score` + `aipp_audits`, `contractor_growth_projection` is computed not stored).

```text
contractor_intake_sessions (
  id uuid pk,
  user_id uuid null,                -- nullable for guest pre-checkout
  anon_session_id text,             -- localStorage uuid for guests
  mode text check (mode in ('alex','form')),
  company_name text, website text, phone text, rbq text,
  detected_trade text, detected_region text,
  answers jsonb default '{}'::jsonb,
  ai_summary text,
  recommended_plan text,
  projected_revenue_low int, projected_revenue_high int,
  aipp_score int,
  completion_percentage int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```
RLS: insert/update allowed for anon by `anon_session_id` match; once `user_id` set, only owner can read. No PII leaked. Realtime enabled so the form and Alex see each other's writes.

## Conversion guardrails

- Value visible < 5 s: scan card renders skeleton instantly, fills in as soon as website/phone hits.
- ≤ 5 questions before any reveal in Alex mode; ≤ 3 inputs before partial reveal in form mode.
- Single recommended plan, no comparison table on landing (link to `/entrepreneur/plans` for that).
- Sticky bottom CTA on mobile from scroll > hero.
- Loading, empty, error, mic-denied, scan-failed states all designed (fallback recommendation if scan fails, never block CTA).

## Out of scope (do not touch)

- Existing `/entrepreneur/checkout`, Stripe edge functions, auth flow, contractor onboarding post-payment.
- Database for `contractors`, `aipp_audits`, pricing catalog.
- Homepage `/` Alex orb implementation (reused, not modified).
- Admin dashboards, sniper/outbound, leads CRM.

## Tasks (build order)

1. Migration: create `contractor_intake_sessions` + RLS + realtime.
2. Add `useContractorIntakeSession` hook + intake state machine.
3. Build `PageEntrepreneurDiagnosticLanding` shell with mode toggle.
4. Wire `QuestionnaireSmart` (3 steps, chips/sliders).
5. Wire Alex mode reusing homepage orb + first-message override.
6. Build `InstantScanCard` against existing `aipp-real-scan` edge fn.
7. Build AIPP reveal section (reuse `useScoreRevealEngine` + `AlexAIPPScoreCard`).
8. Build `RevenueProjectionCard` (deterministic calc from intake).
9. Build `PlanRecommendationCard` calling `recommendPlan()` + `useAvailabilityCheck`.
10. Wire dual CTA to existing checkout + score detail routes.
11. Swap `/entrepreneur` route to new page; keep aliases.
12. QA: mobile 384 px, desktop, mic-denied, scan-failed, partial answers, deep-link prefill, dark theme.

## Success

- One route, two modes, zero duplicate funnels.
- < 5 s to first personalized value (scan card).
- < 30 s to plan recommendation in Alex mode.
- Single CTA path into existing Stripe checkout — no new payment code.
- Intake survives refresh + mode toggle via session row.
