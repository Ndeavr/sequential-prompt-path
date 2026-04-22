

# Contractor Activation Funnel — Premium Rebuild

## Overview
Rebuild the contractor onboarding into a 9-screen conversion funnel with two modes (Solo + Alex-assisted). Replace scattered pages with a unified, progressive-trust flow: hook → auto-import → score reveal → smart checklist → plan → pay → activate.

---

## Phase 1 — Database: `contractor_activation_funnel` table

New migration creating a unified funnel state table:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| user_id | uuid NOT NULL | Auth user |
| mode | text default 'solo' | solo / alex |
| current_screen | integer default 1 | 1-9 screen tracker |
| business_name | text | Input |
| phone | text | Input |
| email | text | Input |
| website | text | Optional input |
| import_status | text default 'pending' | pending/running/completed/failed |
| imported_data | jsonb default '{}' | All auto-imported fields |
| aipp_score | jsonb | Preliminary score breakdown |
| checklist_state | jsonb default '{}' | Per-section completion state |
| selected_services | jsonb default '[]' | Confirmed services |
| selected_zones | jsonb default '[]' | Confirmed zones |
| media_uploads | jsonb default '[]' | Uploaded file refs |
| preferences | jsonb default '{}' | Business preferences |
| calendar_connected | boolean default false | |
| selected_plan | text | Plan code |
| billing_cycle | text | monthly/yearly |
| stripe_session_id | text | Checkout ref |
| payment_status | text default 'pending' | pending/paid/failed |
| completed_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Users manage own rows. Admin full access. Auto-update trigger on updated_at.

## Phase 2 — Edge Function: `contractor-activation-enrich`

New edge function that orchestrates auto-import for the funnel:

**Input:** `{ funnel_id, business_name, phone?, website? }`

**Actions (sequential, with `EdgeRuntime.waitUntil` for background):**
1. Google Places Text Search → name, address, phone, website, rating, reviews, categories, photos, hours
2. Website scrape via Firecrawl (if website provided) → description, logo, services, zones mentioned
3. RBQ lookup (if detectable from business name/website) → licence number, classes, validity
4. NEQ lookup stub (structured for future connection)
5. Compute preliminary AIPP score from imported signals (reuse scoring logic from `aipp-real-scan`)

**Output:** Updates `contractor_activation_funnel.imported_data` and `aipp_score` in DB. Returns immediate 202 with polling endpoint.

**Polling action:** `{ action: "status", funnel_id }` returns current import_status and imported_data.

## Phase 3 — 9 Funnel Screen Pages

All screens share `FunnelLayout` with updated progress bar (9 steps). Mobile-first, glassmorphism, fr-CA.

### Screen 1: `/entrepreneur/activer` — Landing/Promise
- Headline: "Obtenez votre score AIPP et activez votre profil UNPRO"
- Subheadline about auto-import
- Two CTAs: "Créer mon profil maintenant" (solo) → Screen 2, "Le faire avec Alex" (alex) → opens Alex voice with `contractor_activation` surface
- Value pills, scarcity badge
- Replaces current `PageEntrepreneurJoin`

### Screen 2: `/entrepreneur/activer/compte` — Quick Account
- Email or phone field
- Business name (required)
- Phone (required)
- Website (optional)
- Single "Continuer" CTA
- If not authenticated: create account with email/password (minimal)
- If authenticated: pre-fill from profile
- On submit: create funnel row, navigate to Screen 3, trigger enrichment edge function

### Screen 3: `/entrepreneur/activer/analyse` — Auto-Import Loading
- Animated progress sequence with 10 import steps (reuse `IMPORT_TIMELINE_STEPS` type)
- Each step animates from pending → running → completed/failed
- Real polling every 3s to `contractor-activation-enrich` for status
- Alex observation panel (existing `PanelAlexObservesImport` component)
- Auto-navigates to Screen 4 when complete

### Screen 4: `/entrepreneur/activer/score` — AIPP Score Reveal
- Large animated score number with cinematic reveal
- 8 subscore cards: Visibility, Trust/Compliance, Reviews, Media, Conversion, AI/AEO, Service Precision, Geographic Precision
- "Found automatically" section with green checkmarks
- "Missing to improve" section with amber indicators and impact points
- CTA: "Compléter mon profil" → Screen 5

### Screen 5: `/entrepreneur/activer/profil` — Smart Completion Checklist
- Accordion/card sections, each showing: title, completion %, estimated time, business impact badge
- **Section A — Business Identity**: Pre-filled fields with confirm/edit
- **Section B — RBQ & Compliance**: Licence status, classes, validation states (green/yellow/red)
- **Section C — Services**: Toggle chips from auto-detected services
- **Section D — Zones**: Auto-suggested zones + add by city/radius, priority vs secondary
- **Section E — Media**: Drag-drop logo, photos, before/after. Show auto-detected images for confirm/remove
- **Section F — Preferences**: Job types, min value, emergency, languages, capacity
- Each section saves independently to `checklist_state` in DB
- CTA: "Continuer" → Screen 6

### Screen 6: `/entrepreneur/activer/calendrier` — Calendar
- Google Calendar OAuth connect button (existing `calendar-google-oauth-start` edge function)
- Simple availability selector: available days + hours
- "Skip for now" option (calendar not required before payment)
- CTA: "Voir mon plan recommandé" → Screen 7

### Screen 7: `/entrepreneur/activer/plan` — Plan Recommendation
- AI recommendation banner: "Selon votre territoire et capacité, le meilleur plan est Premium"
- Plan cards (Pro/Premium/Elite/Signature) with appointments, territory exclusivity, features
- Revenue projection panel (reuse `PanelPlanCapacityProjection`)
- Monthly/annual toggle
- CTA: "Activer ce plan" → Screen 8

### Screen 8: `/entrepreneur/activer/paiement` — Stripe Checkout
- Plan summary card with price, billing cycle, savings
- Coupon code input
- Trust signals (SSL, Stripe secure)
- "Payer" button → invoke `create-stripe-checkout-session` → redirect to Stripe
- Success redirect to Screen 9

### Screen 9: `/entrepreneur/activer/succes` — Activation Dashboard
- Success animation + plan badge
- AIPP score progress since start
- Remaining optimization checklist (missing media, certifications)
- Profile preview link
- Calendar connection if skipped
- "Go to dashboard" CTA
- Alex button always visible for post-activation help

## Phase 4 — Alex-Assisted Mode Integration

When user clicks "Le faire avec Alex" on Screen 1:
- Set funnel mode to `alex`
- Open Alex voice/chat with `contractor_activation` surface
- Alex drives the same 9-screen flow but fills fields via conversation
- Alex can programmatically navigate between screens using existing `in-chat-orchestration` patterns
- Each Alex confirmation updates the funnel DB row
- Alex uses the same `contractor-activation-enrich` edge function for auto-import

No new Alex edge functions needed — leverage existing `alex-process-turn` with a new surface context.

## Phase 5 — Funnel Hook: `useActivationFunnel`

New hook replacing `useContractorFunnel` for the activation flow:
- Loads/creates funnel row from DB
- Provides: `screen`, `goToScreen`, `nextScreen`, `prevScreen`, `updateFunnel`, `importStatus`, `aippScore`, `completionBySection`
- Auto-saves on every update
- Computes per-section completion percentages
- Handles polling for import status

## Phase 6 — Route Registration

Add all 9 routes under `/entrepreneur/activer/*` to router with lazy loading.
Keep existing `/entrepreneur/onboarding/*` routes as fallback (no breaking changes).

## Phase 7 — Storage Bucket for Media

Create `contractor-media` storage bucket (public) for logo, photos, before/after uploads.
RLS: authenticated users can upload to their own folder (`user_id/`).

---

## Files to create/modify

| Action | File | Purpose |
|--------|------|---------|
| Migration | `contractor_activation_funnel` table + storage bucket | Funnel state + media |
| Create | `supabase/functions/contractor-activation-enrich/index.ts` | Auto-import orchestrator |
| Create | `src/hooks/useActivationFunnel.ts` | Funnel state hook |
| Create | `src/pages/entrepreneur/activation/ScreenLanding.tsx` | Screen 1 |
| Create | `src/pages/entrepreneur/activation/ScreenAccount.tsx` | Screen 2 |
| Create | `src/pages/entrepreneur/activation/ScreenImport.tsx` | Screen 3 |
| Create | `src/pages/entrepreneur/activation/ScreenScore.tsx` | Screen 4 |
| Create | `src/pages/entrepreneur/activation/ScreenChecklist.tsx` | Screen 5 |
| Create | `src/pages/entrepreneur/activation/ScreenCalendar.tsx` | Screen 6 |
| Create | `src/pages/entrepreneur/activation/ScreenPlan.tsx` | Screen 7 |
| Create | `src/pages/entrepreneur/activation/ScreenPayment.tsx` | Screen 8 |
| Create | `src/pages/entrepreneur/activation/ScreenSuccess.tsx` | Screen 9 |
| Modify | `src/app/router.tsx` | Add 9 routes |
| Modify | `src/components/contractor-funnel/FunnelProgressBar.tsx` | Update for 9 screens |

## Expected outcome
- Contractor goes from landing to paid activation in under 8 minutes
- Auto-import fills 60-80% of profile data automatically
- AIPP score shown before asking for effort
- Smart checklist replaces long forms
- Two modes: solo self-serve + Alex-assisted
- Stripe checkout after value proof
- Post-payment activation dashboard with next optimizations
- Mobile-first, premium glassmorphism UI throughout

