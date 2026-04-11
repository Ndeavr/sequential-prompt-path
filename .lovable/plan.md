

# AlexInChatAppOrchestratorV1 — Plan

## Summary

Transform Alex's chat into a transactional cockpit where actions (forms, contractor selection, booking, checkout, image analysis, before/after) render inline as interactive cards — without leaving the conversation. Build on the existing `useAlexConversationLite` + `InlineCardType` pattern already in place.

## What Already Exists

The codebase already has a strong foundation:
- `PageHomeAlexConversationalLite` renders inline cards via `cardType` on messages
- 15+ inline card types already working (entrepreneur, booking, quote analysis, photo, address, profile completion)
- `useAlexConversationLite` with intent detection, guards, and flow state machine
- `alexUiActionDispatcher.ts` for dispatching UI actions from Alex brain
- Mock data for contractors, slots, analysis

**Key insight**: The existing `InlineCardType` + `renderCard()` pattern IS the orchestrator pattern. We extend it, not replace it.

---

## Phase 1 — Core Runtime + New Inline Surfaces (priority)

### 1A. Extend InlineCardType system

**File: `src/components/alex-conversation/types.ts`**
- Add new card types: `"inline_form"`, `"before_after"`, `"contractor_picker"`, `"booking_scheduler"`, `"checkout_embedded"`, `"next_best_action"`, `"image_gallery"`, `"task_progress"`, `"address_confirmation"`, `"form_autofill_preview"`
- Add corresponding data interfaces

### 1B. Build Action Planner service

**File: `src/services/alexActionPlanner.ts`**
- Given user message + flow state + memory context → determine:
  - `actionType` (show_form, suggest_contractors, book, checkout, analyze_photo, etc.)
  - `renderMode` (inline_card, drawer, modal)
  - `prefillData` from memory
  - `confirmationRequired` boolean
  - `nextBestAction`
- Replaces/extends current `ANALYSIS_KEYWORDS` keyword matching with a structured planner

### 1C. Build core inline action cards

| Component | Purpose |
|-----------|---------|
| `PanelAlexInlineFormRenderer.tsx` | Generic form rendered inline in chat (fields from schema, prefilled from memory) |
| `PanelAlexContractorPicker.tsx` | 2-3 contractor cards with Compare/Select/Book buttons |
| `PanelAlexBookingScheduler.tsx` | Inline slot picker with confirm button |
| `PanelAlexCheckoutEmbedded.tsx` | Plan summary + Stripe Payment Element inline |
| `PanelAlexBeforeAfterStudio.tsx` | Before/after image comparison with regenerate button |
| `PanelAlexInlineImageGallery.tsx` | Scrollable image gallery inline |
| `PanelAlexNextBestActionCard.tsx` | "I can do X next" proactive suggestion card |
| `PanelAlexLiveTaskStack.tsx` | Visual step progress (done/active/pending) |
| `CardAlexAddressConfirmation.tsx` | "C'est bien pour votre condo à Laval?" confirm/edit card |
| `PanelAlexFormAutoFillPreview.tsx` | Shows prefilled data with "Vérifiez" CTA |

### 1D. Wire into PageHomeAlexConversationalLite

- Extend `renderCard()` switch with new card types
- Connect action planner to `sendMessage` flow in `useAlexConversationLite`

---

## Phase 2 — Task Stack + Memory Integration

### 2A. Task State Machine

**File: `src/services/alexTaskStateMachine.ts`**
- Track multi-step flows: problem → match → book → pay
- States: pending, active, done, blocked, skipped
- Rendered via `PanelAlexLiveTaskStack`

### 2B. Memory-powered prefill

- Connect `usePersistentUserMemory` to action planner
- Auto-prefill address, property type, project context
- Show "Déjà connu" badges on prefilled fields

### 2C. Proactive next-best-action

**File: `src/services/alexNextBestActionEngine.ts`** (already exists, extend)
- After each action completes, compute next step
- Render as `PanelAlexNextBestActionCard` inline

---

## Phase 3 — Embedded Checkout + Advanced

### 3A. Embedded checkout card
- Use existing Stripe integration (`stripeService.ts`)
- Render Payment Element inside chat card
- Show plan summary, taxes, coupon inline
- Confirm success as chat message

### 3B. Image generation before/after
- Use Lovable AI gateway (Gemini image models) for before/after generation
- Upload source photo inline → generate → display comparison

### 3C. Undo/retry
- Each action run gets an ID
- "Annuler" button on completed actions
- Retry on failed actions

---

## Database (12 tables)

Single migration creating:
- `alex_action_sessions` — session tracking
- `alex_action_runs` — individual action executions
- `alex_action_intents` — detected intents with confidence
- `alex_ui_surfaces` — registered UI surfaces
- `alex_generated_assets` — generated images/documents
- `alex_form_drafts` — form state persistence
- `alex_booking_intents` — booking flow state
- `alex_checkout_intents` — checkout flow state
- `alex_contractor_shortlists` — contractor comparison lists
- `alex_task_state` — multi-step task progress
- `alex_inline_confirmations` — user confirmations
- `alex_action_failures` — failure logging

All with RLS policies scoped to `auth.uid()`, nullable `user_id` for anonymous sessions, and indexes on `user_id`, `alex_action_session_id`, `created_at`.

---

## Files Created/Modified

| File | Action |
|------|--------|
| `src/components/alex-conversation/types.ts` | Extend with new card types + interfaces |
| `src/services/alexActionPlanner.ts` | **New** — intent → action → render mode |
| `src/services/alexTaskStateMachine.ts` | **New** — multi-step flow tracker |
| `src/components/alex-conversation/PanelAlexInlineFormRenderer.tsx` | **New** |
| `src/components/alex-conversation/PanelAlexContractorPicker.tsx` | **New** |
| `src/components/alex-conversation/PanelAlexBookingScheduler.tsx` | **New** |
| `src/components/alex-conversation/PanelAlexCheckoutEmbedded.tsx` | **New** |
| `src/components/alex-conversation/PanelAlexBeforeAfterStudio.tsx` | **New** |
| `src/components/alex-conversation/PanelAlexInlineImageGallery.tsx` | **New** |
| `src/components/alex-conversation/PanelAlexNextBestActionCard.tsx` | **New** |
| `src/components/alex-conversation/PanelAlexLiveTaskStack.tsx` | **New** |
| `src/components/alex-conversation/PanelAlexFormAutoFillPreview.tsx` | **New** |
| `src/components/alex-conversation/CardAlexAddressConfirmation.tsx` | **New** |
| `src/hooks/useAlexConversationLite.ts` | Integrate action planner |
| `src/pages/PageHomeAlexConversationalLite.tsx` | Add new card renderers |
| `supabase/migrations/[timestamp].sql` | 12 tables + RLS + indexes |

---

## Implementation Priority

1. **Database migration** (12 tables)
2. **Action planner service** + task state machine
3. **Phase 1 inline cards** (form, contractor picker, booking, checkout, gallery, before/after, next action, task stack)
4. **Wire into conversation hook + page**
5. **Memory prefill integration**

