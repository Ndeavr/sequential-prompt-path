

# Phase 1 Revenue Engine — Audit, Unify, and Fill Gaps

## Current State

The UNPRO codebase already has **90%+ of the requested modules** built across two parallel funnel systems, 200+ edge functions, and extensive admin tooling. This plan focuses on the **missing 10%**: unifying the two funnel paths, adding the CRM follow-up automation, filling analytics gaps, and wiring real data where mock data exists.

---

## What Already Exists (No rebuild needed)

| Module | Status | Location |
|--------|--------|----------|
| Contractor Landing Page | Built | `PageContractorLandingAcquisition`, `PageContractorVoiceFirstLanding` |
| Easy Signup | Built | `PageContractorOnboardingStart` (business name, phone, website, RBQ) |
| Auto Business Import | Built | `PageContractorImportWorkspace`, `onboarding-import` edge fn |
| AIPP Trust Funnel | Built | `PageContractorAIPPBuilder`, `aipp-real-scan`, `aipp-v2-analyze` |
| Onboarding Wizard | Built | `ProSetupWizard` (6 steps) + Activation funnel (9 screens) |
| Plan Recommendation | Built | `PageContractorPlanRecommendation`, `compute-plan-recommendation` |
| Stripe Checkout | Built | `PageContractorCheckout`, `ScreenPayment`, `create-stripe-checkout-session` |
| Post-Activation Dashboard | Built | `PageContractorDashboardPostActivation` |
| Outbound Acquisition | Built | Full pipeline (scrape, enrich, send, track) |
| Alex Guided Mode | Built | `alex-voice-sales`, `alex-sales-process-turn`, voice onboarding |
| Personalized Landing | Built | `/pro/:slug` nuclear close, `/contractor/score/:token` |
| SEO Engine | Built | `seed-seo-pages`, `seo-generator`, prerender |
| Analytics Events | Partially built | `landing_visits`, `onboarding_entry_events`, auth tracking |

---

## What Needs to Be Built / Fixed

### 1. Unify the Two Funnel Paths

**Problem**: Two parallel contractor funnels exist:
- **Funnel A** (`useContractorFunnel`): sessionStorage-based, 9 steps via `/entrepreneur/*`
- **Funnel B** (`useActivationFunnel`): Supabase-persisted, 9 screens via activation screens

These must be consolidated into a single canonical path.

**Action**: Deprecate the sessionStorage-only funnel. Make `useActivationFunnel` the single source of truth. Update `useContractorFunnel` to read/write from the same Supabase table, adding missing fields. Update all contractor-funnel pages to use the unified hook.

**Files**: `src/hooks/useContractorFunnel.ts`, all `src/pages/contractor-funnel/*.tsx`

### 2. CRM Follow-Up Automation

**Problem**: No automated follow-up for contractors who drop off without paying.

**Action**:
- Create `contractor_followup_queue` table (user_id, trigger_type, scheduled_at, sent_at, status)
- Create `process-contractor-followups` edge function triggered by cron (every 15 min)
- Rules: 1h after drop-off → "Besoin d'aide?", 24h → "Votre profil vous attend", 3d → "Des contrats vous attendent"
- Each follow-up sends via `send-transactional-email` with appropriate template
- Create 3 email templates: `contractor-followup-1h`, `contractor-followup-24h`, `contractor-followup-3d`

**Files**: New migration, new edge function, 3 new email templates

### 3. Funnel Analytics Event Tracking

**Problem**: No unified funnel analytics table tracking every step conversion.

**Action**:
- Create `contractor_funnel_events` table (session_id, user_id, event_type, step, metadata, created_at)
- Event types: `landing_viewed`, `signup_started`, `signup_completed`, `import_started`, `import_completed`, `aipp_viewed`, `plan_selected`, `checkout_started`, `payment_completed`, `activation_viewed`
- Add tracking calls to each funnel screen's mount/action handlers
- Create a utility `trackFunnelEvent(event, metadata)` used across all screens

**Files**: New migration, new `src/utils/trackFunnelEvent.ts`, modify all 9 activation screens + contractor-funnel pages

### 4. Replace Mock AIPP Data in Funnel

**Problem**: `PageContractorAIPPBuilder` uses `MOCK_SCORE` hardcoded values instead of real AIPP data.

**Action**: Wire the AIPP builder to call `aipp-v2-analyze` or read from `aipp_scores` table using the contractor's imported data. Show real gaps from the scoring engine.

**Files**: `src/pages/contractor-funnel/PageContractorAIPPBuilder.tsx`

### 5. Replace Mock Dashboard Stats

**Problem**: `PageContractorDashboardPostActivation` shows hardcoded stats (Score 87, views "—", RDV 0).

**Action**: Fetch real data from `contractor_scores`, `bookings`, and profile completeness service. Show actual AIPP score, real appointment count, and calculated visibility improvement.

**Files**: `src/pages/contractor-funnel/PageContractorDashboardPostActivation.tsx`

### 6. Dynamic Personalized Landing Enhancement

**Problem**: Existing `/pro/:slug` pages work but don't support the `/contractor/{trade}-{city}` URL pattern described.

**Action**: Add a catch-all route `/contractor/:slug` that parses trade+city from the slug, resolves prospect data from `war_prospects`, and renders a personalized page with business name, city, trade, detected opportunities, and growth potential.

**Files**: New `src/pages/contractor-funnel/PageContractorPersonalizedLanding.tsx`, router update

### 7. Post-Payment Redirect Fix

**Problem**: After Stripe payment, user may land on a generic page instead of the activation dashboard.

**Action**: Ensure `create-stripe-checkout-session` success_url points to `/entrepreneur/activation-success` (or equivalent). Verify the activation success page exists and shows completion tasks.

**Files**: Verify `supabase/functions/create-stripe-checkout-session/index.ts`, `ScreenSuccess.tsx`

---

## Implementation Order

1. **Funnel analytics tracking** — `trackFunnelEvent` utility + table (foundation for measuring everything)
2. **Unify funnel hooks** — Single source of truth for contractor onboarding state
3. **CRM follow-up automation** — Table + edge function + email templates
4. **Wire real AIPP data** — Replace mocks in AIPP builder and dashboard
5. **Personalized landing route** — Dynamic `/contractor/:slug` pages
6. **Post-payment flow verification** — Ensure correct redirect chain

---

## Database Changes

| Table | Purpose |
|-------|---------|
| `contractor_funnel_events` | Unified funnel analytics |
| `contractor_followup_queue` | CRM follow-up scheduling |

## Files Summary

| Action | File |
|--------|------|
| Create | `src/utils/trackFunnelEvent.ts` |
| Create | `src/pages/contractor-funnel/PageContractorPersonalizedLanding.tsx` |
| Create | Email templates: `contractor-followup-1h.tsx`, `contractor-followup-24h.tsx`, `contractor-followup-3d.tsx` |
| Create | `supabase/functions/process-contractor-followups/index.ts` |
| Migration | `contractor_funnel_events` + `contractor_followup_queue` tables |
| Modify | `src/hooks/useContractorFunnel.ts` — unify with activation funnel |
| Modify | `src/pages/contractor-funnel/PageContractorAIPPBuilder.tsx` — wire real data |
| Modify | `src/pages/contractor-funnel/PageContractorDashboardPostActivation.tsx` — wire real data |
| Modify | All 9 activation screens — add `trackFunnelEvent` calls |
| Modify | `src/app/router.tsx` — add `/contractor/:slug` route |
| Verify | `supabase/functions/create-stripe-checkout-session/index.ts` — success_url |

## Expected Outcome
- Single unified contractor funnel (no parallel state confusion)
- Every funnel step tracked with conversion analytics
- Automated CRM follow-up for drop-offs (1h, 24h, 3d)
- Real AIPP scores replacing all mock data in the funnel
- Dynamic personalized landing pages for acquisition
- Correct post-payment activation flow
- Foundation for measuring all 8 success metrics (reply rate, start rate, completion rate, plan selection, payment, time-to-paid, CAC, MRR)

