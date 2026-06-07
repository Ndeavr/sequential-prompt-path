## Problem

Three architectural bugs in Alex:

1. **"Êtes-vous toujours là ?" fires after the conversation is effectively over** (booking done, recommendation delivered, user said merci/au revoir). The silence hook only knows "user activity"; it has no terminal state.
2. **Persona is auth-derived only.** `resolveAlexMode` (`src/config/alexModes.ts`) picks contractor vs. homeowner from `user_role` / contractor profile. A logged-out (or homeowner-logged-in) visitor typing "je veux plus de clients" stays in HOMEOWNER mode and gets the "projets résidentiels" answer from `alexCorePrompt.ts`.
3. **Voice can drift between sentences.** `ALEX_VOICE_BASE` is locked in code, but there is no per-session lock and no pre-TTS assertion. A reconnection, mode swap mid-session, or any caller passing a custom `voiceId` can change voice.

## Scope (3 surgical fixes, no UX redesign)

### Fix 1 — Terminal conversation state (silence engine)

- File: `src/hooks/useAlexSilenceControl.ts`
  - Add a `conversation_status` ref: `"active" | "closed" | "abandoned"`.
  - Public API additions: `markClosed(reason: "booked"|"recommended"|"summary"|"thanks"|"goodbye"|"manual")`, `markActive()`.
  - `startIdleTimer()` returns immediately if `conversation_status !== "active"`.
  - `recordActivity()` does NOT re-arm the timer if status is `closed`/`abandoned`.
  - Replace the single hard-coded prompt + immediate pause with **2-attempt** ladder per spec:
    - Attempt #1 (`PROMPT_TEXT[language]`): "Êtes-vous toujours là ?"
    - Attempt #2: "Je vais fermer cette conversation pour le moment. Revenez quand vous voulez."
    - Attempt #3 = STOP, mark `abandoned`, persist, no message.
  - Keep `sessionPromptUsedRef` semantics intact for paused/resume.
- File: `src/engines/alexReEngagementEngine.ts`
  - Add `markTerminal()` that stops timers and flips internal state to `passive`.
  - `scheduleReEngagements()` early-returns if terminal.
- Wire the markers (single integration point — keep blast radius minimal):
  - `src/components/alex-voice-persona/VoiceEngineAlexController.tsx` — call `markClosed("booked")` / `markClosed("recommended")` when its existing handlers detect booking confirmation / recommendation delivered events from the message stream.
  - Detect goodbye/thanks in user transcript via a tiny pure helper `src/lib/alexTerminalIntents.ts`:
    - `detectTerminalIntent(text): "thanks"|"goodbye"|null` matching FR/EN: `merci`, `merci beaucoup`, `bye`, `salut`, `au revoir`, `bonne journée`, `thanks`, `thank you`, `goodbye`.
  - Same controller calls `markClosed("thanks"|"goodbye")` on match.

### Fix 2 — Intent Router runs BEFORE response (persona detection)

- New file: `src/features/alex/intent/alexPersonaRouter.ts`
  - Pure function `detectPersona(text: string): "HOMEOWNER" | "CONTRACTOR" | "PROPERTY_MANAGER" | "PARTNER" | "UNKNOWN"`.
  - Contractor triggers (FR): `plus de clients`, `visibilité`, `référencement`, `RBQ`, `NEQ`, `soumissions`, `leads`, `appels`, `rendez-vous`, `entreprise`, `employés`, `chiffre d'affaires`, `marketing`, `publicité`, `Google`, `développer mon entreprise`, `obtenir des contrats`.
  - Property manager triggers: `copropriété`, `condo`, `syndicat`, `Loi 16`, `gestionnaire`, `immeuble`, `unités`.
  - Homeowner triggers: `ma maison`, `mon condo personnel`, `j'ai un problème de`, `infiltration`, `chauffage`, `humidité`, `rénovation`, `je veux rénover`.
- Integrate in TWO spots (both already mode-aware):
  1. `src/config/alexModes.ts` — add optional `lastUserText` to `AlexModeContext`. In `resolveAlexMode`, if `role` is `null`/`homeowner` AND `lastUserText` matches CONTRACTOR, return `CONTRACTOR_DESCRIPTOR`. If matches PROPERTY_MANAGER, return `CONDO_DESCRIPTOR`. Explicit auth role still wins for logged-in users (homeowners don't get hijacked into contractor flow unless they were already contractors).
  2. `src/hooks/useContractorMode.ts` — accept `lastUserText` option, forward to `resolveAlexMode`.
- Update default greetings in `src/config/alexModes.ts` to spec:
  - Homeowner: `"Bonjour [Prénom]. Quel problème ou projet souhaitez-vous régler aujourd'hui ?"`
  - Contractor: `"Bonjour [Prénom]. Comment puis-je vous aider à développer votre entreprise aujourd'hui ?"`
- Update `src/features/alex/voice/alexCorePrompt.ts` to add a hard CONTRACTOR-detection rule at the top: "Si l'utilisateur parle de plus de clients, visibilité, leads, RBQ, soumissions, marketing, entreprise → bascule immédiatement en mode entrepreneur. NE JAMAIS répondre 'projets résidentiels' à un entrepreneur."

### Fix 3 — Session voice lock + pre-TTS guard

- File: `src/stores/alexVoiceLockedStore.ts` (already exists per repo listing)
  - Add fields: `sessionVoiceId`, `sessionVoiceProvider`, `sessionLanguage`, `sessionMode`, `lockedAt`.
  - Actions: `lockForSession(input)`, `assertVoice(currentVoiceId)`, `unlock()`.
  - `assertVoice` returns `{ ok, expected, got }`; on mismatch consumers must force the correct voice (no provider swap).
- File: `src/features/alex/voice/alexAgentOverrides.ts`
  - On `buildAlexAgentOverrides`, if `alexVoiceLockedStore.sessionVoiceId` is set, IGNORE `input.voiceId` and use the locked one. If unset, lock it now with `ALEX_VOICE_ID` + current mode.
- File: `src/contexts/AlexVoiceContext.tsx` (or the closest single entry point that starts sessions — to confirm with quick read at edit time)
  - On session start: `lockForSession({ voiceId: ALEX_VOICE_ID, provider: ALEX_TTS_PROVIDER, language, mode })`.
  - On session end: `unlock()`.
- File: `src/services/alexVoiceService.ts` (and any other surface that calls TTS)
  - Before each TTS request, call `assertVoice(currentVoiceId)`. On mismatch, log to `alex-voice-log-error` (existing edge fn) and use the locked voice id.

## Validation

- Manual: trigger silence after a booking confirmation message → no "Êtes-vous toujours là ?". Type "je veux plus de clients" unauthenticated → contractor greeting + contractor framing. Force a voice override attempt mid-session via debug panel → assertion blocks the swap, voice stays locked.
- Tests: extend `src/__tests__/pricingAndContractorMode.test.ts` with `resolveAlexMode` + `lastUserText` cases (contractor signals override homeowner default; explicit contractor role still wins; homeowner-authenticated user with contractor signals does NOT switch).
- Lighthouse-style smoke: `src/lib/voiceSmokeTest.ts` already inspects mode transitions — add `assertVoice` integrity check.

## Out of scope

- No UI redesign, no new admin cockpit, no new tables.
- No changes to ElevenLabs agent config (the in-dashboard overrides already accept `voiceId`).
