## Goal

Make Alex strictly **event-driven**. Voice starts only on explicit user action, greets exactly once per browser session, and never silently retries.

## Root causes found

1. **Two contractor landing pages auto-open Alex on first gesture** (`PageContractorVoiceFirstLanding.tsx`, `PageContractorAIGrowth.tsx`) — first scroll/tap fires `openAlex()` even when the user just wanted to read.
2. **Greeting fires every overlay boot** (`OverlayAlexVoiceFullScreen.tsx` line 371-375 + `buildGreeting` passed as `initialGreeting` on every `start()`), with no per-session memory of "already greeted".
3. **Silent auto-retries on first-audio timeout** (`MAX_AUTO_RETRIES = 2`) re-call `startRef.current` with a fresh greeting → user hears "Bonsoir Yanick" again.
4. **Token retry chain inside `useLiveVoice.ts`** (`MAX_TOKEN_RETRIES = 2`) re-opens the WS session three times for the same boot.
5. **Fallback chat panel re-launches voice** automatically via "Activer la voix" being styled as a primary CTA, and prepends "Je continue ici avec vous." on top of the existing greeting.
6. **Dead code still present**: `useAlexHomeAutostart.ts` exists (currently unused but a footgun).

## Changes

### 1. Add `alexSessionState` (sessionStorage-backed)

New file `src/lib/alexSessionState.ts`:

```text
keys (sessionStorage):
  unpro.alex.hasGreeted         "1" | null
  unpro.alex.voiceStarted       "1" | null
  unpro.alex.userInitiated      "1" | null
  unpro.alex.lastInteractionAt  ISO timestamp

API:
  markGreeted() / hasGreeted()
  markVoiceStarted() / wasVoiceStarted()
  markUserInitiated() / wasUserInitiated()
  touchInteraction()
  resetSession()  // only called on explicit user close + retry
```

### 2. `OverlayAlexVoiceFullScreen.tsx`

- Inside the boot `useEffect` (line 335-516):
  - Compute `greeting = hasGreeted() ? "" : buildGreeting()`.
  - Only push the preview bubble when `greeting` is non-empty.
  - Pass `initialGreeting: greeting` (empty string means "do not seed").
  - Call `markGreeted()` once the greeting was actually sent.
- **Remove silent retries**: set `MAX_AUTO_RETRIES = 0`. `armFirstAudioTimer` now goes straight to `bailToChat("no_first_audio")` — no second `startRef.current` call, no second greeting.
- **`onConnect` nudge** (line 188-200): only send the seed when `!hasGreeted()`. Otherwise stay silent and let the user speak.
- **Cleanup on overlay close** (line 543-570): do NOT reset `hasGreeted` / `voiceStarted` — they persist for the whole browser tab session.

### 3. `useLiveVoice.ts`

- Set `MAX_TOKEN_RETRIES = 0`. One attempt; on failure, surface `onError` and stop. No silent reconnects.
- Remove the post-`onDisconnect` cooldown reconnect path.

### 4. Kill auto-open on landing pages

- `src/pages/contractor-landing/PageContractorVoiceFirstLanding.tsx`: delete the `pointerdown/keydown/touchstart` listener `useEffect` (lines 61-86). Voice starts only when the user taps the orb / "Parler à Alex" button.
- `src/pages/contractor-growth/PageContractorAIGrowth.tsx`: delete the equivalent `useEffect` (lines 42-58).
- `src/pages/HomeProfessionalAdaptive.tsx`, `HomeIntentRouterDynamic.tsx`, `OwnerMenuPreviewPage.tsx`, `HomeContractorAdaptive.tsx`: verify no mount-`openAlex` (already user-driven — confirmed).

### 5. Delete unused `useAlexHomeAutostart.ts`

No consumers exist. Removed to prevent future regressions.

### 6. `AlexChatFallbackPanel.tsx`

- Replace the chat-panel intro line (line 105) and header subtitle (line 71) with a **single** message: `"Je peux continuer ici avec vous."` (no duplicate of the voice greeting).
- "Activer la voix" button becomes a small ghost icon, requires a deliberate tap, and clears `voiceStarted` flag so a fresh start is allowed — but `hasGreeted` stays set so the user is not re-introduced.

### 7. Greeting source of truth

`buildGreeting()` stays in the overlay (already personality-aware), but is **only ever used once** per session. The contextual hint nudge that previously prepended "Je continue ici avec vous." everywhere is removed in favour of: a single greeting on first boot, silence on every subsequent reopen.

## Acceptance

- Open `/`, open overlay, close overlay, reopen → user hears no second greeting.
- Voice times out → fallback chat appears once, no auto-retry chain, no duplicate greeting bubble.
- Reload `/contractor` landing pages → Alex does NOT open until the user taps the orb or CTA.
- Console shows one `Starting session, greeting: ...` per browser tab session.
- "Activer la voix" inside the fallback panel reopens voice without replaying the greeting.

## Out of scope

- Server-side `alex_session_state` table (sessionStorage is sufficient for the loop fix; DB-backed memory already covered by `Persistent User Memory`).
- Voice provider / ElevenLabs config (locked Sophia voice unchanged).
