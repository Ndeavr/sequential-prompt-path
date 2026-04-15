

# ModuleAlexIntelligenceCoreRulesAndMemoryEngine + ModuleAlexVisualIntelligenceAndPhotoPromptingEngine

## Overview

Two complementary modules that transform Alex from a static keyword-matching chatbot into an intelligent, contextual, learning AI decision engine with visual analysis capabilities.

**Current state**: Alex uses client-side keyword matching (`useAlexConversationLite.ts`) with mock data and a basic edge function (`alex-process-turn`) that calls `alexVoiceBrain`. Memory exists in `alexMemoryBrain.ts` but is limited to simple key-value caching. No learning loop, no structured answers, no quality scoring, no visual intelligence.

**Target state**: Alex understands intent deeply, uses persistent memory to avoid redundant questions, produces structured 4-block answers, learns from outcomes, and proactively requests/analyzes photos when visual context would improve decisions.

---

## Technical Design

### Phase 1 — Database Schema (Migration)

**6 new tables** for intelligence core + **5 new tables** for visual intelligence:

```text
alex_user_memory        — persistent per-user facts (property, preferences, constraints)
alex_conversation_log   — full conversation log with intent tagging  
alex_context_snapshots  — consolidated context JSON per turn
alex_learning_events    — outcome tracking (accepted, abandoned, converted)
alex_answer_scores      — clarity/usefulness/progression/conversion per message
alex_inferred_prefs     — derived preferences with confidence

alex_photo_requests     — when/why Alex asked for a photo
alex_uploaded_images    — user photos linked to sessions
alex_visual_analyses    — AI analysis results per image  
alex_visual_projections — generated before/after renders
alex_photo_prompt_events— acceptance/dismissal tracking
```

All tables RLS-protected: authenticated users see only their own data; service role for edge functions.

### Phase 2 — Cognitive Rules Engine (Client-Side)

**New file**: `src/services/alexCognitiveRulesEngine.ts`

8 strict rules encoded as a pipeline that wraps every Alex response:

1. **Fast intent classification** — reuse existing `alexIntentClassifier` but add question-type detection (problem/project/comparison/validation/estimation/urgency)
2. **Structured answer builder** — enforces 4-block pattern: Comprehension → Useful Answer → Context → Action
3. **No-repeat guard** — checks `alex_user_memory` before asking any question
4. **Forward-only** — every response must include a next-step CTA
5. **Precision over length** — word budget per block
6. **Expert tone** — domain-specific vocabulary injection
7. **Adaptive tone** — adjusts based on urgency/hesitation signals
8. **Single question** — max 1 question per turn

### Phase 3 — Memory Learning Engine (Client + Edge)

**New file**: `src/services/alexMemoryLearningEngine.ts`

- After each user message: extract implicit signals (property type, budget hints, location, constraints) and persist to `alex_user_memory`
- Before each Alex response: load user memory, inject into context
- **New edge function**: `alex-store-memory` — persists extracted signals server-side
- **New edge function**: `alex-score-answer` — logs answer quality post-interaction

### Phase 4 — Context Resolver

**New file**: `src/services/alexContextResolver.ts`

Consolidates from 4 sources into a single context object:
- Current message
- Conversation history (last 10 turns)
- User memory (persistent)
- Implicit signals (time of day, device, page origin)

### Phase 5 — Answer Builder Integration

**Modify**: `src/hooks/useAlexConversationLite.ts`

Replace the current intent-based switch/case response generation with:
1. Context resolution → cognitive rules pipeline → structured answer output
2. Follow-up suggestions card (`CardAlexFollowUpSuggestions`)
3. Contextual badges (memory used, confidence score)

### Phase 6 — Visual Intelligence Engine

**New file**: `src/services/alexVisualIntelligenceEngine.ts`

- **Photo prompting rules**: Detects when visual input would accelerate diagnosis (problem keywords: fuite, moisissure, fissure, toiture) or enable design projection (cuisine, salle de bain)
- **Visual mode**: When `visual_mode=true`, relaxes the 1-question limit to allow guided photo-driven qualification
- **Analysis integration**: Calls existing `visual-search` edge function for AI analysis, renders results via `CardPhotoAnalysisResult`

### Phase 7 — UI Components

**New components**:
- `CardAlexAnswerStructured.tsx` — renders 4-block answer with visual hierarchy
- `CardAlexFollowUpSuggestions.tsx` — contextual next-step buttons
- `BadgeContextUsed.tsx` — "Based on your history" indicator
- `BadgeConfidenceScore.tsx` — confidence level badge
- `CardPhotoRequestContextual.tsx` — natural photo request with benefit explanation
- `CardPhotoAnalysisResult.tsx` — visual analysis summary with confidence
- `CardVisualProjectionPreview.tsx` — before/after projection display
- `BadgeVisualModeActive.tsx` — indicates visual analysis mode

### Phase 8 — Learning Loop (Edge Function)

**New edge function**: `alex-learning-loop`

Post-conversation analysis:
- Did user continue after response? → positive signal
- Did user abandon? → negative signal  
- Did user convert (booking/signup)? → strong positive
- Adjusts response templates and question ordering based on aggregate outcomes

---

## File Changes Summary

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/services/alexCognitiveRulesEngine.ts` | 8-rule pipeline |
| Create | `src/services/alexContextResolver.ts` | Context consolidation |
| Create | `src/services/alexAnswerBuilder.ts` | Structured 4-block answers |
| Create | `src/services/alexMemoryLearningEngine.ts` | Memory extraction + injection |
| Create | `src/services/alexVisualIntelligenceEngine.ts` | Photo prompting + visual mode |
| Modify | `src/hooks/useAlexConversationLite.ts` | Wire new engines into conversation flow |
| Create | `src/components/alex-conversation/CardAlexAnswerStructured.tsx` | Structured answer UI |
| Create | `src/components/alex-conversation/CardAlexFollowUpSuggestions.tsx` | Follow-up CTAs |
| Create | `src/components/alex-conversation/BadgeContextUsed.tsx` | Memory indicator |
| Create | `src/components/alex-conversation/BadgeConfidenceScore.tsx` | Confidence badge |
| Create | `src/components/alex-conversation/CardPhotoRequestContextual.tsx` | Smart photo request |
| Create | `src/components/alex-conversation/CardPhotoAnalysisResult.tsx` | Analysis results |
| Create | `src/components/alex-conversation/CardVisualProjectionPreview.tsx` | Before/after preview |
| Create | `src/components/alex-conversation/BadgeVisualModeActive.tsx` | Visual mode indicator |
| Create | `supabase/functions/alex-store-memory/index.ts` | Persist memory signals |
| Create | `supabase/functions/alex-score-answer/index.ts` | Answer quality scoring |
| Create | Migration SQL | 11 new tables |

---

## Constraints Respected

- Does not break existing Alex flow — new engines wrap existing logic
- Client-side first with edge function persistence (works offline)
- Mock data for contractor matching preserved
- All tables RLS-protected
- Response time target < 2 seconds (cognitive pipeline is synchronous, memory calls are async)
- Mobile-first UI for all new components
- French-first (fr-CA) for all user-facing text

