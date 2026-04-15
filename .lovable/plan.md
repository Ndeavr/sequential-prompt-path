

# Plan: ModuleAlexIntentFunnelAndMatchEngine + ModulePlatformEnhancementsPriorityStack

## Current State

**Already exists:**
- `intent_sessions` table (minimal — missing `raw_input`, `detected_intent`, `confidence_score`)
- `quote_analysis_results` table
- `contractor_scores` table
- Alex conversation UI (`PageHomeAlexConversationalLite`) with inline cards for quotes, business analysis, match results
- Mock intent detection in `useAlexConversationLite.ts`
- Existing booking infrastructure (`bookings`, `availability_slots`)

**Does NOT exist (must build):**
- Module 1 pages: `PageEntryUnifiedIntent`, `PageMatchResultsDynamic`, `PageBookingInstant`
- Module 1 components: `CardPredictionProblem`, `CardContractorMatchScore`, `PanelDNAFitBreakdown`, `WidgetInstantBookingSlots`, `ModalProfileCompletionGate`
- Module 1 tables: `intent_answers`, `match_scores`, `user_profiles_extended` (need to add `raw_input`/`detected_intent` to `intent_sessions`)
- Module 1 RPCs: `detect_intent_from_input`, `generate_followup_questions`, `compute_dna_match_score`, `rank_contractors`, `generate_booking_slots`
- Module 2 components: `PanelQuoteAnalysisAI`, `PanelTrustSignalsUltra`, `PanelRevenueProjectionContractor`, `PanelLiveActivityFeed`, `WidgetScarcityTerritory`, `BadgeFounderAccess`, `PanelAlexPredictionSavings`

---

## Phase 1 — Database (1 migration)

**Alter** `intent_sessions`: add `raw_input text`, `detected_intent text`, `confidence_score numeric`, `input_type text`, `context_json jsonb`.

**Create** 4 new tables:
- `intent_answers` (id, session_id FK, question, answer, weight, created_at)
- `match_scores` (id, session_id FK, contractor_id FK, score, breakdown_json, rank, created_at)
- `booking_requests` (id, user_id, contractor_id, session_id, time_slot timestamptz, status, notes, created_at)
- `user_profiles_extended` (user_id FK profiles, address, phone, city, property_type, preferences_json, constraints_json, updated_at)

**Create** 2 new tables for Module 2:
- `scarcity_tracker` (id, city_slug, category_slug, total_slots, filled_slots, updated_at)
- `live_activity_events` (id, event_type, city, message, created_at)

RLS: authenticated users on own data; admin full access.

Seed mock data: 5 scarcity entries, 10 activity events.

## Phase 2 — Intent Funnel Hook + RPCs

Create `src/hooks/useIntentFunnel.ts`:
- `useDetectIntent` — calls edge function `alex-intent-detect` (already partially exists) or uses mock fallback
- `useFollowupQuestions` — generates 3-5 smart questions based on detected intent
- `useDNAMatchScore` — computes match score (service fit, region, availability, language, style)
- `useRankContractors` — returns 1-3 ranked contractors
- `useBookingSlots` — fetches available slots for matched contractor

All functions use existing `contractors`, `availability_slots`, `contractor_scores` tables.

## Phase 3 — Module 1 Pages (4 pages)

1. **PageEntryUnifiedIntent** (`/intent`) — Hero with voice orb + text input, zero search fields, chips for common intents. Replaces directory browsing entry point.

2. **PageAlexConversation** — Enhanced version of existing `PageHomeAlexConversationalLite`, wired to intent funnel. Shows `CardPredictionProblem` after intent detection, transitions to match results.

3. **PageMatchResultsDynamic** (`/match/:sessionId`) — Shows 1-3 `CardContractorMatchScore` with `PanelDNAFitBreakdown`. Single primary recommendation highlighted.

4. **PageBookingInstant** (`/book/:contractorId`) — `WidgetInstantBookingSlots` with calendar, instant confirmation. `ModalProfileCompletionGate` triggers if address/phone missing.

## Phase 4 — Module 1 Components (8 components)

All in `src/components/intent-funnel/`:

- `HeroSectionIntentEntry` — Voice orb + text, zero filters
- `PanelAlexVoiceChat` — Embedded Alex with intent context
- `ChatThreadDynamic` — Conversation thread with inline cards
- `CardPredictionProblem` — Shows detected problem + confidence + icon
- `CardContractorMatchScore` — Contractor card with DNA score ring, badges (RBQ, NEQ, reviews)
- `PanelDNAFitBreakdown` — Radar chart showing fit dimensions (service, region, availability, language, style)
- `WidgetInstantBookingSlots` — Calendar grid with available slots
- `ModalProfileCompletionGate` — Drawer asking for missing fields (address, phone) before booking

## Phase 5 — Module 2 Components (8 components)

All in `src/components/platform-enhancements/`:

- `PanelQuoteAnalysisAI` — Upload 3 quotes, auto-analyze, show quality/price/risk scores + recommendation
- `PanelTrustSignalsUltra` — RBQ verified, NEQ confirmed, AI-analyzed reviews, dynamic trust badges
- `PanelRevenueProjectionContractor` — "Revenue lost without UNPRO" based on closing rate, capacity, avg job value
- `PanelLiveActivityFeed` — Real-time social proof: "3 propriétaires ont réservé aujourd'hui"
- `WidgetScarcityTerritory` — Dynamic counter: "Il reste 2 places à Laval en isolation"
- `BadgeFounderAccess` — Founder badge with priority territory access indicator
- `PanelAlexPredictionSavings` — Estimated savings + errors avoided
- `ModeUrgence24` — Emergency button for instant no-friction booking

## Phase 6 — Route Registration

Add routes to `router.tsx`:
- `/intent` → PageEntryUnifiedIntent
- `/match/:sessionId` → PageMatchResultsDynamic
- `/book/:contractorId` → PageBookingInstant

## Technical Details

- All components use glassmorphism + glow effects matching existing UNPRO dark theme (#060B14)
- Mobile-first (384px viewport currently active)
- Mock data for contractors/slots when no real matches exist
- DNA match scoring uses weighted formula: service_fit (30%) + region (25%) + availability (20%) + reviews (15%) + language (10%)
- Realtime subscription on `live_activity_events` for social proof feed
- French-first labels throughout

## Files Created/Modified

- 1 migration file (alter intent_sessions + 6 new tables)
- 1 hook file (`useIntentFunnel.ts`)
- 4 page files (Module 1)
- 8 component files (Module 1 — `src/components/intent-funnel/`)
- 8 component files (Module 2 — `src/components/platform-enhancements/`)
- `src/app/router.tsx` (3 new routes)

