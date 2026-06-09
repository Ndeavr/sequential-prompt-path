## Goal

Replace every Alex opening line with role + intent-aware templates. Alex stops sounding like a chatbot ("Je peux vous aider avec {sujet}") and sounds like a Home Project Orchestrator helping the user reach an outcome.

## 1. New shared module

Create `src/services/alexOpeningTemplates.ts` exporting:

```ts
type AlexIntent = "renovation" | "repair" | "emergency" | "comparison" | "contractor" | "generic";

export function detectAlexIntent(hint?: string | null, feature?: string | null): AlexIntent
export function buildAlexOpening(args: {
  firstName?: string | null;
  role?: "homeowner" | "contractor" | "condo_manager" | null;
  intent?: AlexIntent;
  hint?: string | null;
  feature?: string | null;
}): string
```

Templates exactly as specified by the user:

- Generic homeowner — `Bonjour {first_name}. Je vais vous aider à comprendre votre situation et à trouver le bon professionnel si nécessaire. Que se passe-t-il ?`
- Renovation — `…évaluer votre projet et à trouver le bon entrepreneur pour ce type de travaux. Que souhaitez-vous réaliser ?`
- Repair — `…comprendre le problème et à déterminer la meilleure marche à suivre. Que remarquez-vous exactement ?`
- Emergency — `…évaluer rapidement la situation et à trouver le bon professionnel. Que se passe-t-il ?`
- Comparison — `…analyser les options avec vous et vous aider à prendre une décision éclairée. Expliquez-moi votre situation.`
- Contractor — `…développer votre visibilité et à être recommandé aux bons propriétaires. Comment puis-je vous aider aujourd'hui ?`

Without `firstName` → drop the name token but keep punctuation.

`detectAlexIntent` keyword map (FR, accent/case-insensitive):
- emergency: `urgent`, `urgence`, `inondation`, `fuite majeure`, `gaz`, `feu`, `dégât`, `panne chauffage`
- renovation: `rénov`, `refaire`, `transformer`, `projet`, `réaliser`, `agrandir`, `cuisine`, `salle de bain`
- repair: `problème`, `réparer`, `brisé`, `ne fonctionne`, `bruit`, `fuite`, `thermopompe`, `chauffe-eau`
- comparison: `comparer`, `soumission`, `devis`, `options`, `analyser une soumission`
- contractor: feature starts with `contractor_`, `pro_`, or role === contractor
- else generic

## 2. Plumb `intent` through the open-Alex chain

- `src/contexts/AlexVoiceContext.tsx` — extend `openAlex(feature?, contextHint?, displayMode?, intent?)`.
- `src/stores/alexVoiceLockedStore.ts` — add `intent: AlexIntent | null` (+ setter on `openVoiceSession`, cleared on close/reset).
- Backward compatible: when `intent` omitted, it is inferred from `feature` + `contextHint` inside `buildAlexOpening`.

## 3. Rewrite every opening site to use `buildAlexOpening`

Greeting builders (replace inline opening strings):
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx` — replace `buildGreeting` (lines 98–121).
- `src/hooks/useAlexVoiceBootstrap.ts` — `buildGreeting` (line 71).
- `src/components/alex/AlexVoiceMode.tsx` — `buildGreeting` (line 64).
- `src/features/alex/hooks/useAlexBootstrap.ts` — internal `buildGreeting` (line 52).
- `src/features/alex/services/alexWelcomeManager.ts` — `buildGreeting` method.
- `src/services/alexGreetingEngine.ts` — opener line 59.
- `src/services/alexRoleDetector.ts` — `homeowner` greeting (line 97) and any sibling role greetings → route through `buildAlexOpening({ role })`.
- `src/services/alexContextPromptEngine.ts` — replace forbidden `greetingText` values (lines 170, 183, 208, 271) with intent-appropriate templates.
- `src/stores/copilotConversationStore.ts` — chat fallback opener (lines 222, 249) → generic homeowner template.
- `src/components/alex/AlexConcierge.tsx` — subtitle line 337 → outcome-oriented copy ("Votre orchestrateur de projets résidentiels.").
- `src/components/booking/AlexBookingBubble.tsx` — default copy line 39 → outcome-oriented helper text (no "Je peux vous aider").
- `src/pages/PublicBookingPage.tsx` — `alexHints.types` (line 273) rewritten to outcome-style.

## 4. Update entry points to pass intent

- `src/components/home-unicorn/AlexCapabilitiesStrip.tsx` — replace `topic` field with `intent` + short outcome `hint`. Each tile maps to a precise intent:
  - "Comprendre un problème" → `repair`
  - "Analyser une photo" → `repair` (hint: "ce que vous voyez sur la photo")
  - "Estimer un coût" → `renovation`
  - "Comparer une soumission" → `comparison`
  - "Trouver des subventions" → `renovation`
  - "Recommander un professionnel" → `generic`
  - Call: `openAlex("home_capability", hint, undefined, intent)`.
- `src/pages/PageHomeUnicorn.tsx` — `QUICK_CHIPS` items get `intent` and pass it through `openAlex`.
- `src/pages/seo/SeoArticlePage.tsx` — pass `intent` derived from the article topic (default `repair`).
- `src/components/intent-pages/OrbAlexPrimaryEntry.tsx` — accept and forward optional `intent` prop.

## 5. Forbidden-phrase guard (lightweight)

Add a `assertNoForbiddenOpening(text)` helper in `alexOpeningTemplates.ts` that throws in dev only when the produced string contains any of:
- `Je peux vous aider avec`
- `Je peux définitivement vous aider avec`
- `Je peux vous assister avec`
- `Dites-m'en plus sur ce sujet`

Call it inside `buildAlexOpening` so any future regression is caught immediately in dev/preview.

## 6. Out of scope

- ElevenLabs voice/agent config, recovery engine, session state machine.
- Example dialogue inside `src/features/alex/voice/alexCorePrompt.ts` and admin reference copy in `PanelVoiceToneControl.tsx` (these are model coaching examples, not user-facing openings) — leave untouched.
- Any backend/SQL changes.

## Files

Create: `src/services/alexOpeningTemplates.ts`
Edit: `src/contexts/AlexVoiceContext.tsx`, `src/stores/alexVoiceLockedStore.ts`, `src/components/voice/OverlayAlexVoiceFullScreen.tsx`, `src/hooks/useAlexVoiceBootstrap.ts`, `src/components/alex/AlexVoiceMode.tsx`, `src/features/alex/hooks/useAlexBootstrap.ts`, `src/features/alex/services/alexWelcomeManager.ts`, `src/services/alexGreetingEngine.ts`, `src/services/alexRoleDetector.ts`, `src/services/alexContextPromptEngine.ts`, `src/stores/copilotConversationStore.ts`, `src/components/alex/AlexConcierge.tsx`, `src/components/booking/AlexBookingBubble.tsx`, `src/pages/PublicBookingPage.tsx`, `src/components/home-unicorn/AlexCapabilitiesStrip.tsx`, `src/pages/PageHomeUnicorn.tsx`, `src/pages/seo/SeoArticlePage.tsx`, `src/components/intent-pages/OrbAlexPrimaryEntry.tsx`
