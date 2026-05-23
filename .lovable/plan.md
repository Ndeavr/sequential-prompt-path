
## Problem

Console logs confirm:
1. Voice token is obtained → ElevenLabs WebRTC connection hangs → 12s timeout fires
2. Recovery flow goes through phases ending at `greeting_test` ("Alex redémarre…")
3. If `startFn` hangs without throwing, the UI stays on that label forever
4. No mic ever opens, no female voice plays

The root causes are:
- `useAlexVoiceRecovery.ts` has no timeout around `startFn({ initialGreeting })` — it can hang indefinitely while the UI shows "Alex redémarre…"
- The recovery `greeting_test` phase label is misleading and lasts longer than 3s
- The user-visible string "Alex redémarre…" persists past the 3s budget

## Fix

### 1. Hard 3-second fail-safe in recovery (`src/hooks/useAlexVoiceRecovery.ts`)

- Wrap `startFn(...)` in `Promise.race` with a 3000ms timer.
- If it doesn't resolve in 3s:
  - Force `executeHardReset()` once more
  - Clear runtime locks (`unlockRuntime()`, `setRecovering(false)`)
  - Transition store to `listening`-safe state
  - Call `onFallbackChat?.()` so UI exits the stuck "Alex redémarre…" label and mic/chat becomes available
- Replace the `greeting_test` label `"Alex redémarre…"` with `"Connexion d'Alex…"` (shorter, non-alarming, and we'll never show it > 3s anyway).

### 2. Clean female-only startup sequence on overlay open (`src/components/voice/OverlayAlexVoiceFullScreen.tsx`)

In the existing boot effect that runs when `store.isOverlayOpen` becomes true:

- Before calling `start({ initialGreeting })`:
  1. `executeHardReset()` — kill any prior audio/streams/locks
  2. `unlockRuntime()` and reset local refs (already partly done in close path; mirror here on open)
  3. Reset `hasConnectedRef`, `firstAudioReceivedRef`, `ttsFallbackInProgressRef`, `autoRetryCountRef`, `bootInitiatedRef`
- Then call `start({ initialGreeting: buildGreeting() })` — which already pins Sophia female voice via `useLiveVoice` overrides (from previous work).
- Do NOT block on TTS first audio for mic readiness. The orb/mic indicator must reflect "listening" state even before first audio arrives.

### 3. Global 3s open-timeout (overlay)

Add a single `setTimeout(3000)` armed when the overlay opens:

```ts
if (alexStatus is still "initializing" / "restarting" after 3s) {
  await executeHardReset();
  unlockRuntime();
  setRecovering(false);
  // Force store into a listening-capable state, or open chat fallback if no audio
}
```

Concretely, after 3s of `isStabilizing || isRecoveringNow` with no `firstAudio`:
- If WebRTC connected but no audio: keep listening state, but stop showing restart label.
- If WebRTC never connected: switch to chat fallback immediately (no more 12s wait).

### 4. Greeting consistency

`buildGreeting()` must always return `"Bonjour {firstName}. Je vous écoute."` (already present from prior work — verify in `OverlayAlexVoiceFullScreen.tsx`).

### 5. Never display "Alex redémarre…" anywhere

- Remove the string from `PHASE_LABELS.greeting_test`.
- Confirm no other component renders it (search `redémarre` — only in `useAlexVoiceRecovery.ts`).

## Out of scope

- No changes to the ElevenLabs voice ID (Sophia stays locked).
- No changes to the conversational agent or backend.
- No new UI components.
- No removal of the recovery system — only adding fail-safes inside it.

## Files to edit

- `src/hooks/useAlexVoiceRecovery.ts` — add 3s race around `startFn`, change label, ensure `setRecovering(false)` in all paths.
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx` — clean reset on open, global 3s fail-safe with forced fallback, ensure mic readiness is independent of TTS first audio.

## Success criteria

- Open Alex → female Sophia voice says *"Bonjour Yanick. Je vous écoute."* within ≤ 3 s, OR chat fallback opens within ≤ 3 s.
- No "Alex redémarre…" string ever rendered.
- Mic indicator becomes active even when TTS init is slow.
- No second/male audio stream.
- No infinite restart loop in console.
