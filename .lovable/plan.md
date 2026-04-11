

# Fix Alex Voice: Dual Instance + Contextual Greeting

## Problems Identified

1. **Dual instance bug**: When `openAlex()` is called, it opens the locked full-screen overlay (`OverlayAlexVoiceFullScreen`) via Zustand AND sets `isOpen=true` in context state. When the user closes the full-screen overlay, `isOpen` remains `true` in `AlexVoiceContext`, causing `GlobalAlexOverlay` to render a second `AlexVoiceMode` instance underneath. This second instance waits for user input instead of speaking proactively.

2. **No contextual greeting**: All calls use `openAlex("general")` — the greeting is always generic ("Que puis-je faire pour vous?"). The SEO page context (e.g., "Moisissure à Laval") is never passed to the voice session.

## Plan

### Step 1 — Fix dual instance (AlexVoiceContext.tsx)

- In `openAlex()`: do NOT set `isOpen=true` anymore — the locked overlay is the only voice UI now.
- Subscribe to the locked store's close event: when `isOverlayOpen` becomes `false`, automatically reset `isOpen`, `voiceActive` to false in context.
- This prevents `GlobalAlexOverlay` from rendering after the locked overlay closes.

### Step 2 — Remove GlobalAlexOverlay from providers.tsx

Since `openAlex()` now exclusively uses the locked overlay, remove `<GlobalAlexOverlay />` from `src/app/providers.tsx` entirely to eliminate any possibility of a second instance.

### Step 3 — Pass contextual greeting to voice session

- Extend `openAlex(feature, context?)` to accept an optional context string (e.g., "Moisissure à Laval").
- Store context in the locked store (`openVoiceSession` gets a `contextHint` param).
- In `OverlayAlexVoiceFullScreen`, use `store.contextHint` to build a contextual greeting like: "Bonjour. Je vois que vous vous intéressez à la moisissure à Laval. Comment puis-je vous aider?"

### Step 4 — Pass context from SEO pages

- In `SeoPageRenderer.tsx`, change `openAlex("general")` to `openAlex("seo", "Moisissure à Laval")` using the page's `profession` and `city` fields.
- Same pattern for other callers that have context (ContractorProfile, AlexBookingBubble, etc.).

### Files Modified

| File | Change |
|------|--------|
| `src/contexts/AlexVoiceContext.tsx` | Remove `setIsOpen(true)` from `openAlex`, add store sync |
| `src/app/providers.tsx` | Remove `<GlobalAlexOverlay />` import and render |
| `src/stores/alexVoiceLockedStore.ts` | Add `contextHint` field to store |
| `src/components/voice/OverlayAlexVoiceFullScreen.tsx` | Use `contextHint` in `buildGreeting()` |
| `src/pages/seo/SeoPageRenderer.tsx` | Pass page context to `openAlex()` |
| `src/components/alex/GlobalAlexOverlay.tsx` | No changes (file kept but unused) |

