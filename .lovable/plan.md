

# UNPRO Real AIPP Scoring System v1

## Summary

Replace the current approximate AIPP scoring with a deterministic, signal-based scoring engine. New database tables store raw signals and audit provenance. A new edge function (`aipp-run-audit`) performs real website analysis via Firecrawl and computes weighted scores. The frontend renders 4 distinct states (empty, running, partial, complete) with premium glassmorphic UI and trust-first guardrails.

---

## Technical Details

### Block 1 -- Database Migration

Create one migration with:

**Enums**: `aipp_analysis_status`, `aipp_confidence_level`, `aipp_job_type`, `aipp_job_status`

**Tables** (as specified in the prompt):
- `contractor_aipp_audits` -- scores, blockers, strengths, recommendations, raw signals, confidence, source counts
- `contractor_aipp_signal_logs` -- individual signal records per audit
- `contractor_aipp_jobs` -- job tracking with progress and step info

**Triggers**: `set_updated_at()` on contractors, contractor_aipp_audits, contractor_aipp_jobs

**RLS**: Enable on all 3 new tables. Policies:
- Contractors can read own audits/signals/jobs via `auth.uid()` matching `contractors.user_id`
- Service role bypasses for edge functions
- Public read for audits (needed for unauthenticated AIPP intake)

**Indexes**: On contractor_id, audit_id, status, created_at as specified

Note: The existing `contractors` table already has all needed columns (website, phone, rbq_number, neq, city, etc). No schema changes needed there.

### Block 2 -- Edge Function: `aipp-run-audit`

New Deno edge function at `supabase/functions/aipp-run-audit/index.ts`.

**Input**: `{ contractor_id: string }`

**Flow**:
1. Load contractor from `contractors` table
2. Create `contractor_aipp_audits` row (status: running)
3. Create `contractor_aipp_jobs` row (job_type: full_audit)
4. **Website signals** -- Firecrawl scrape of `contractor.website`. Extract all web, AI visibility, and conversion signals from HTML/markdown
5. **Google signals** -- Parse existing `google_business_url` data. Score GBP presence, rating (from `contractor.rating`), review count (from `contractor.review_count`)
6. **Trust signals** -- Validate RBQ format, NEQ presence, business name consistency, contact consistency
7. Persist each signal to `contractor_aipp_signal_logs`
8. Run deterministic `computeAippScore()` with the exact signal map and formulas from the prompt (Web /20, Google /20, Trust /20, AI Visibility /25, Conversion /15)
9. Compute confidence level and potential score
10. Generate blockers/strengths/recommendations in Quebec French business language
11. Update audit row with all computed data
12. Mark job complete

**Signal model**: Uses the unified `SignalResult` type with key, group, source, found, rawValue, normalizedValue, maxPoints, earnedPoints, reason, blocker, strength, recommendation.

**Scoring functions**: All formulas from the prompt implemented exactly (`scoreGbpRating`, `scoreGbpReviewCount`, `scoreServicePages`, `scoreLocationPages`, `scoreOwnerResponses`, `computeConfidence`, `computePotentialScore`, `canShowFinalScore`).

Uses `https://esm.sh/@supabase/supabase-js@2.49.1` per project constraint.

### Block 3 -- Scoring Service (Client-side)

New file: `src/services/aippRealScoringService.ts`
- `mapAuditToViewModel()` function converting DB rows to `AippAuditViewModel`
- Score label derivation (Critique/Faible/Moyen/Fort/Dominant)
- Source badge status mapping
- Technical blocker to business language translation
- Caps blockers at 3, strengths at 5

New file: `src/types/aippReal.ts`
- All TypeScript types: `AippConfidence`, `AippAnalysisStatus`, `AippCategoryBreakdown`, `AippSourceStatus`, `AippBlocker`, `AippStrength`, `AippAuditViewModel`

### Block 4 -- React Hook

New file: `src/hooks/useContractorAippAudit.ts`
- `useContractorAippAudit(contractorId)` -- fetches latest audit, polls if running/pending
- `useLaunchAippAudit()` -- triggers `aipp-run-audit` edge function
- Returns `AippAuditViewModel` via mapper

### Block 5 -- Frontend Components

All in `src/components/aipp-real/`:

| Component | Purpose |
|---|---|
| `AippAuditExperience` | Root layout: 12-col desktop, single-col mobile |
| `AippHeroHeader` | Company name, title, subtitle, last updated |
| `AippStatusBanner` | Running/partial/complete/failed state banners |
| `AippMainScoreCard` | Score ring (only when real), confidence badge, source badges, CTAs |
| `AippSourcesCard` | Source provenance badges (validated/in_progress/unavailable) |
| `AippBreakdownGrid` | 5 category cards with score, summary, expandable details |
| `AippPriorityBlockersCard` | Top 3 blockers in business French with impact badges |
| `AippStrengthsCard` | Positive signals with hopeful messaging |
| `AippPotentialCard` | Current vs potential dual display |
| `AippActionPlanCard` | 3 priority steps |
| `AippConversionCard` | Premium CTA: "Corriger maintenant" / "Parler a Alex" |
| `AippAuditTimelineCard` | Audit step history |
| `AippDebugDrawer` | Admin-only: raw signals, scoring details, job status, errors |

**State handling**:
- State A (empty): Input form + "Lancer mon analyse"
- State B (running): Animated progress, live checklist, no score ring
- State C (partial): Provisional score with amber badge, confidence label
- State D (complete): Full experience with all cards

**Trust guardrails**: If `overall_score` is null, no ring renders. Score ring animates only on real data. Confidence and source badges always visible.

### Block 6 -- Page and Routing

New page: `src/pages/PageContractorAippAudit.tsx`
- Route: `/contractor/aipp-audit/:contractorId`
- Renders `AippAuditExperience` with data from `useContractorAippAudit`

Admin debug page: `src/pages/admin/PageAippDebug.tsx`
- Route: `/admin/aipp-debug`
- Table of recent audits with raw signals, job status, errors

Register both routes in `src/app/router.tsx`.

### Block 7 -- Visual System

- Dark glass panels with `glass-card` classes
- Rounded 24px cards with translucent borders
- Framer Motion: stagger reveals for cards, fade-in for source badges
- Score ring uses existing `ScoreRing` component, only rendered when `canShowFinalScore` is true
- Colors: blue/teal for complete, amber for partial, muted red for failed, restrained green for strengths
- Mobile-first responsive, premium at desktop

### Block 8 -- Memory

Save `mem://features/aipp-real-scoring-engine` documenting the deterministic signal-based scoring system, weights, confidence formula, and trust guardrails.

---

## Files Created/Modified

| Action | File |
|---|---|
| Create | `supabase/migrations/xxx_aipp_real_scoring.sql` |
| Create | `supabase/functions/aipp-run-audit/index.ts` |
| Create | `src/types/aippReal.ts` |
| Create | `src/services/aippRealScoringService.ts` |
| Create | `src/hooks/useContractorAippAudit.ts` |
| Create | `src/components/aipp-real/AippAuditExperience.tsx` |
| Create | `src/components/aipp-real/AippHeroHeader.tsx` |
| Create | `src/components/aipp-real/AippStatusBanner.tsx` |
| Create | `src/components/aipp-real/AippMainScoreCard.tsx` |
| Create | `src/components/aipp-real/AippSourcesCard.tsx` |
| Create | `src/components/aipp-real/AippBreakdownGrid.tsx` |
| Create | `src/components/aipp-real/AippPriorityBlockersCard.tsx` |
| Create | `src/components/aipp-real/AippStrengthsCard.tsx` |
| Create | `src/components/aipp-real/AippPotentialCard.tsx` |
| Create | `src/components/aipp-real/AippActionPlanCard.tsx` |
| Create | `src/components/aipp-real/AippConversionCard.tsx` |
| Create | `src/components/aipp-real/AippAuditTimelineCard.tsx` |
| Create | `src/components/aipp-real/AippDebugDrawer.tsx` |
| Create | `src/pages/PageContractorAippAudit.tsx` |
| Create | `src/pages/admin/PageAippDebug.tsx` |
| Modify | `src/app/router.tsx` -- add 2 routes |
| Create | `mem://features/aipp-real-scoring-engine` |

