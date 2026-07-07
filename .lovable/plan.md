
# Wire Compatibility Memory Engine — Final Activation

Goal: activate the already-shipped memory + DNA infrastructure so every Alex turn feeds memory, matches persist explanations, homeowners see compatibility, and Alex stops re-asking known facts.

## 1. Alex turn → memory extraction (fire-and-forget)

**File:** `src/services/alexRuntimeService.ts`
- After `processTurn(...)` resolves, if `getFeatureFlag("compat_memory_engine_v1")` is enabled and a `user_id` is available, call `recordMemoryTurn({ user_id, session_id, question: response.alex_question ?? "", answer: userMessage, source: "alex_runtime" })`.
- Wrapped in a non-blocking `void Promise.resolve().then(...)` — never awaited, never surfaced to UI.
- Pass `userId` in via `processTurn` signature (optional 4th arg) so existing callers keep working.

**Fallback hook path:** `src/components/alex/AlexConcierge.tsx` — where user messages are submitted, also invoke `recordMemoryTurn` for the chat-only flow that doesn't go through `AlexRuntimeService` (keeps parity between voice + chat).

## 2. Skip questions Alex already knows

**File:** `src/lib/alexQualification/qualificationGraph.ts` (+ `nextQuestionSelector` if present)
- Load `homeowner_compat_dna` once per session via a small helper `getKnownDnaFacts(userId)`.
- Before asking a question, check `applies_when` against DNA (pets, preferred_contact, preferred_language, communication style). If `confidence[field] >= 0.75`, mark the question as satisfied and skip.
- Add a shared map `QUESTION_TO_DNA_FIELD` covering: pets → `environment.pets`, preferred_contact → `communication.preferred_channel`, preferred_language → `communication.language`, communication_style → `communication.style`, budget band → `preferences.budget_band`, timing → `preferences.timing`.

## 3. Persist match explanations

**File:** `src/services/matchingEngine.ts` — add `persistRecommendationExplanation(match, homeownerId)`:
```
insert into recommendation_explanations {
  match_id, user_id, contractor_id,
  overall_match_score: recommendation_score,
  project_compatibility: project_fit_score,
  budget_compatibility: budget_fit_score,
  region_compatibility: property_fit_score,
  availability_compatibility: availability_score,
  communication_compatibility: ccai_score,
  performance_verified: unpro_score_snapshot >= 75,
  blockers: explanations.watchouts.map(w => w.text_fr),
  explanation_summary: top_reasons[0..2] joined
}
```
- Called from the results hook (`useMatchResults`) once matches finalize, best-effort (try/catch, no UX block).
- Idempotent via upsert on `(user_id, contractor_id)`.

## 4. Show `MatchCompatibilityCard` on selection

**File:** `src/pages/MatchingResultsPage.tsx`
- Add local `selectedMatchId` state. When a `MatchCard` is chosen (existing click handler / new "Voir compatibilité" affordance), render `<MatchCompatibilityCard match={selected} explanation={fetched} />` in a right-side panel / sheet.
- Fetch the persisted row from `recommendation_explanations` by `(user_id, contractor_id)`; fall back to inline scores if the row hasn't landed yet.

## 5. Admin `/admin/memory-health` extra metrics

**File:** `src/pages/admin/PageMemoryHealth.tsx` — add three KPI tiles and one small table:
- **Memory events today** — count where `created_at >= today`.
- **DNA profiles updated today** — count `homeowner_compat_dna` where `updated_at >= today`.
- **Avg extraction confidence (7d)** — `avg(confidence)` on `homeowner_memory_events`.
- **Failed extractions (7d)** — count where `extracted = '{}'::jsonb` or `scope = 'failed'`.
- **Recommendations with explanations saved** — count `recommendation_explanations` last 7d.
All queries are read-only, use existing supabase client, RLS already restricts to admins.

## 6. Success test scaffold

Add `docs/tests/compat-memory-smoke.md` with the manual QA script:
> Message: *"Oui j'ai deux chats et je préfère les textos en anglais."*
> Expect: `homeowner_memory_events` row created, `homeowner_compat_dna` upserted with `environment.pets.cats=true`, `communication.preferred_channel="sms"`, `communication.language="en"`, and next Alex turn does NOT re-ask those questions.

## Technical details

- Feature-flagged everywhere via `compat_memory_engine_v1` — off = old behavior.
- No schema changes; all tables + edge function already exist.
- Type access uses `(supabase as any)` where generated types don't yet cover new tables (matches existing pattern in the codebase).
- Zero blocking calls on the chat path; every memory write is fire-and-forget with `console.warn` on failure.
- No changes to auth, RLS, or edge-function contracts.

## Files touched

- edit `src/services/alexRuntimeService.ts`
- edit `src/components/alex/AlexConcierge.tsx`
- edit `src/lib/alexQualification/qualificationGraph.ts` (+ helper `src/lib/alexQualification/dnaGate.ts` new)
- edit `src/services/matchingEngine.ts` (+ helper `src/services/recommendationExplanationService.ts` new)
- edit `src/pages/MatchingResultsPage.tsx`
- edit `src/pages/admin/PageMemoryHealth.tsx`
- create `docs/tests/compat-memory-smoke.md`
