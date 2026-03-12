

# Audit: What Has Been Built vs. What's Missing

## Already Generated and Functional

### SQL/Database (via migrations)
- **13 tables**: `alignment_questions`, `profile_alignment_answers`, `homeowner_dna_profiles`, `contractor_dna_profiles`, `dna_fit_results`, `project_context_snapshots`, `review_items`, `review_insights`, `review_theme_taxonomy`, `contractor_review_dimension_scores`, `contractor_performance_metrics`, `contractor_public_scores`, `match_evaluations`, `matching_runs`
- **RLS policies**: All tables have proper RLS (admin, service_role, user-scoped)
- **Views**: `ccai_answer_matrix`, `dna_profile_summary`
- **Functions**: `get_ccai_answer_pairs`, `set_updated_at` trigger
- **Seed data**: 25 CCAI questions inserted with `display_order`
- **Indexes and triggers**: `updated_at` triggers on DNA tables

### TypeScript Services
- `src/services/ccaiEngine.ts` (251 lines) — Full CCAI computation with category breakdown, labels, strengths/watchouts
- `src/services/dnaEngine.ts` (280 lines) — Trait derivation from CCAI, classification (6 homeowner + 6 contractor types), DNA Fit scoring
- `src/services/matchingEngine.ts` (329 lines) — URS formula, success probability, conflict risk, CCAI from `types/matching`
- `src/services/ccaiSeedData.ts` — Seed question data
- `src/services/reviewTaxonomySeed.ts` — Review taxonomy seed

### React Components
- `src/pages/MatchingResultsPage.tsx` — Ranked results with mock data fallback
- `src/components/matching/MatchCard.tsx` — Full contractor card with URS, success %, conflict risk, reasons/watchouts
- `src/components/matching/CompareDrawer.tsx` — 2-3 contractor comparison
- `src/components/matching/AlexMatchingModule.tsx` — Decision copilot with quick filters

### Types
- `src/types/matching.ts` — Complete type definitions for all matching entities

### Hooks
- `src/hooks/useMatchingEngine.ts` — Data fetching from database

---

## What's Missing or Needs Attention

### 1. Duplicate CCAI Logic
There are **two** CCAI implementations:
- `src/services/ccaiEngine.ts` — Standalone, uses its own types (`CCAIQuestion`, `CCAIAnswer`)
- `src/services/matchingEngine.ts` — Uses `types/matching.ts` types (`AlignmentAnswer`)

These should be consolidated so the matching engine calls the ccaiEngine.

### 2. Review Taxonomy Seed Not Inserted
`reviewTaxonomySeed.ts` exists as TypeScript data but hasn't been inserted into the `review_theme_taxonomy` table via a migration or insert.

### 3. Review Authenticity Score (RAS)
The 7-dimension RAS formula is defined in `matchingEngine.ts` but there's no service to **compute** individual review authenticity from `review_items` data. The fields exist in the DB (`temporal_suspicion_score`, `reviewer_credibility_score`, etc.) but no processing pipeline populates them.

### 4. UNPRO Score + AIPP Score Calculators
The formulas are referenced in the architecture but there's no dedicated service that computes these from their component inputs. `contractor_public_scores` table exists but nothing writes to it.

### 5. Contractor Profile Page
No dedicated `/contractors/:id` page component exists yet showing AIPP/UNPRO badges, review intelligence summary, and the full profile layout described in the spec.

### 6. No `buildCCAIEngineOutput` Wired to Matching
The `buildCCAIEngineOutput` function in `ccaiEngine.ts` produces the recommendation text but isn't called from the matching pipeline.

---

## Summary

| Layer | Status |
|-------|--------|
| SQL schema + RLS | Done |
| CCAI questions seed | Done |
| Review taxonomy seed | TypeScript only, not in DB |
| CCAI scoring logic | Done (2 versions, need consolidation) |
| DNA engine | Done |
| URS formula | Done |
| Success/Conflict logic | Done |
| Matching results page | Done (with mock fallback) |
| Match card component | Done |
| Compare drawer | Done |
| Alex copilot module | Done |
| Contractor profile page | Missing |
| RAS computation pipeline | Missing |
| UNPRO/AIPP score services | Missing |

**Bottom line**: The SQL/RLS layer and core React components are fully generated. The gaps are in the data processing pipelines (RAS, UNPRO Score, AIPP Score calculators) and the contractor profile page. The CCAI engine duplication should be resolved.

Want me to proceed with filling these gaps?

