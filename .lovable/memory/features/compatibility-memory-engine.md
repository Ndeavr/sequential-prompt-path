---
name: Compatibility Memory Engine
description: Long-term homeowner/contractor DNA + memory events + adaptive questioning + match compatibility scoring across 6 dimensions
type: feature
---
Turns every Alex Q/A turn into structured long-term memory that improves future recommendations.

## Tables
- `homeowner_compat_dna` — one row per user with `communication`, `property`, `preferences`, `environment`, `behavior`, per-field `confidence` (jsonb). Distinct from legacy `homeowner_dna_profiles` (which stores dna_type/dna_label/traits).
- `homeowner_memory_events` — append-only Q/A extractions with `scope` (`temporary` | `long_term`) + `confidence`.
- `contractor_memory_events` — same shape for contractor side (fed from onboarding + accept/decline signals).
- `recommendation_explanations` — per-match 6-dimension scoring for UI transparency.
- `adaptive_question_bank` — question catalog with `information_gain`, `applies_when`, `updates_fields` — drives Alex's next question.

## Edge function
`supabase/functions/alex-memory-extract` — heuristic FR/EN classifier writes memory events + upserts into `homeowner_compat_dna` (only when new confidence ≥ stored). Fire-and-forget via `recordMemoryTurn` in `src/hooks/useHomeownerDNA.ts`.

## UI
- `src/components/matching/MatchCompatibilityCard.tsx` — 6-dimension bars (project/budget/region/availability/communication/performance) with cinematic dark tokens + blockers list.
- `/admin/memory-health` (`src/pages/admin/PageMemoryHealth.tsx`) — coverage, question bank ranking, recent extractions.
- `/journal/comment-unpro-recommande-le-bon-entrepreneur` — SEO article with Article + FAQPage + Breadcrumb JSON-LD.
- `public/llms-full.txt` — "UNPRO Recommendation Philosophy" section for NotebookLM/Perplexity corpus.

## Feature flag
`compat_memory_engine_v1` in `src/lib/alexFeatureFlags.ts` (default ON).

## Extension points (not wired yet)
- `nextQuestionSelector.ts` can read the bank and skip fields where `confidence >= 0.8`.
- `useMatchingEngine` can persist per-match dimensions into `recommendation_explanations` and render `MatchCompatibilityCard`.
