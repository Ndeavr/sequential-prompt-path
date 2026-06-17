## Alex V3 — Universal Qualification Engine

Transform Alex from a contractor-recommender into a Home Project Orchestrator that qualifies before it recommends. Recommendations are hard-gated behind a qualification score ≥ 70.

---

### 1. Qualification Engine (core)

New module `src/lib/alexQualification/` (and Deno mirror `supabase/functions/_shared/alexQualification/`):

- `qualificationGraph.ts` — universal state object:
  ```
  { homeowner, property, problem, urgency, budget,
    quotes, photos, compatibility, project_context,
    score, missing_dimensions, ready_for_match,
    matching_confidence }
  ```
- `scoringEngine.ts` — deterministic 0-100 score:
  - Property identified (address validated) → 25
  - Problem category + sub-type → 20
  - Timeline / urgency → 15
  - Property type → 10
  - Photos → 10
  - Quotes uploaded → 10
  - Budget signal → 5
  - Compatibility signals → 5
  - Hard gate: `ready_for_match = (property && problem && urgency && score ≥ 70)`
- `categoryDecisionTrees.ts` — per-trade question trees (roofing, foundation, electrical, plumbing, HVAC/heat pump, insulation, mold, windows, kitchen reno, landscaping). Each tree returns the next single question based on current graph state.
- `nextQuestionSelector.ts` — picks ONE question at a time, in this priority: property address → problem sub-type → urgency → quotes-if-relevant → photos-if-relevant → budget → compatibility.
- `serviceSpecialtyValidator.ts` — `validateContractorMatch(category, contractor)`; blocks display + logs `alex_runtime_conflicts` on mismatch.

### 2. Edge function: `alex-qualify-turn`

New function replacing the recommendation path in `alex-process-turn` for any "find a pro" intent. Flow per turn:

1. Load/create `alex_qualification_sessions` row (guest-safe, same pattern as the recent guest-session fix).
2. Merge new user input into qualification graph (LLM extraction via `google/gemini-2.5-flash` with structured schema).
3. Compute score + missing dimensions.
4. If `score < 70` or required fields missing → return `{ next_question, why_this_question, progress }`.
5. If `score ≥ 70` → call internal `unified-matching` with strict `service_category` filter, run `serviceSpecialtyValidator`, require `matching_confidence ≥ 0.70`, return single best match with evidence.
6. Persist every turn to `alex_qualification_turns` for the Homeowner Qualification Graph moat.

### 3. Database (one migration)

```
alex_qualification_sessions (
  id, session_token, user_id nullable, property_id nullable,
  graph jsonb, score int, ready_for_match bool,
  service_category text, created_at, updated_at
)
alex_qualification_turns (
  id, session_id, question_asked, user_answer,
  extracted jsonb, score_delta int, created_at
)
homeowner_qualification_graph (
  id, property_id, problem_category, symptoms jsonb,
  budget_band, urgency, quotes_count, contractor_id nullable,
  outcome text, satisfaction int, created_at
)
```
All public-schema tables get full GRANT block (authenticated + service_role; no anon). RLS: user_id = auth.uid() OR session_token cookie match for guests.

### 4. Property identification

- Replace any "city first" prompt with `AddressAutocompleteInput` (existing `src/components/AutocompleteInput` + Google Maps connector via gateway). Required before STEP 4.
- After address validation → upsert `properties` row, trigger PIM creation (existing flow) and offer "Créer votre Passeport Intelligence Maison" inline card (non-blocking).

### 5. Quote & photo intelligence cards (inline in chat)

New conversation UI cards rendered from `metadata.type`:
- `QuoteUploadInviteCard` — appears when category ∈ {reno, repair, insulation, roofing, foundation, HVAC, electrical, plumbing}. Reuses existing quote analyzer service.
- `PhotoUploadInviteCard` — appears for roofing, foundation, exterior, mold, landscaping, renovation.
- `WhyThisQuestionTooltip` — internal-facing badge on every Alex question explaining what dimension it unlocks.

### 6. Recommendation card (replaces current)

`RecommendationCardQualified.tsx`:
- Headline: "Après analyse de votre projet, voici le professionnel qui correspond le mieux à votre situation."
- Shows compatibility score, UNPRO score, availability, distance, credentials, relevant experience, evidence bullets (which qualification answers drove the match).
- CTA: "Réserver un rendez-vous exclusif".
- Never rendered if `serviceSpecialtyValidator` fails.

### 7. Wiring

- `useAlexConversation` + `useAlexHomeownerSession`: route homeowner "find a pro" intents to `alex-qualify-turn` instead of the legacy recommendation branch. Keep legacy path behind feature flag `alex_v3_qualification_engine` (default ON) in `alexFeatureFlags.ts` for instant revert.
- `alexMemoryEngine.ts`: extend `AlexSessionMemory` with `qualification_score`, `ready_for_match`, `matching_confidence`.
- Behavioral kernel update (`mem://ai/alex/behavioral-kernel`): add the NEVER/ALWAYS rules and the 9-step universal flow as hard constraints.

### 8. Out of scope (explicit)

- Contractor-side Alex (Growth Advisor) — untouched.
- Voice config, Stripe, condo flow, outbound — untouched.
- No redesign of public landing pages.
- Existing `alex-process-turn` kept for non-matching intents (Q&A, diagnostics, etc.).

### 9. Files

**Created**
- `src/lib/alexQualification/{qualificationGraph,scoringEngine,categoryDecisionTrees,nextQuestionSelector,serviceSpecialtyValidator}.ts`
- `src/components/alex/{QuoteUploadInviteCard,PhotoUploadInviteCard,WhyThisQuestionTooltip,RecommendationCardQualified}.tsx`
- `supabase/functions/alex-qualify-turn/index.ts`
- `supabase/functions/_shared/alexQualification/*` (mirror)
- Migration for the 3 new tables + GRANTs + RLS

**Edited**
- `src/hooks/useAlexConversation.ts`, `src/hooks/useAlexHomeownerSession.ts`
- `src/services/alexMemoryEngine.ts`
- `src/lib/alexFeatureFlags.ts`
- `supabase/functions/alex-process-turn/index.ts` (delegate matching intents)
- Memory: `mem://ai/alex/behavioral-kernel`, new `mem://features/alex-v3-qualification-engine`

### Success criteria

- 0 recommendations rendered with `score < 70` or `matching_confidence < 0.70`.
- 0 contractor displays with `service_category !== contractor.specialty` (enforced + logged).
- Avg 5-8 qualification questions per homeowner session.
- 100% of "find a pro" sessions persist to `homeowner_qualification_graph` for the moat.
