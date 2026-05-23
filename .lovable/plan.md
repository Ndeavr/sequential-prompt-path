# Alex Voice — Rebuild as Single ChatGPT-Style Controller

Replace the current fragmented voice stack (recovery hook, overlay boot logic, abstraction service, multiple useEffects, global locks) with **one** singleton controller that owns the entire pipeline. Female ElevenLabs voice only. Behaves like ChatGPT Voice / Copilot — media audio, interruptible, never call/SCO.

---

## 1. New singleton: `AlexVoiceController`

File: `src/services/alexVoiceController.ts`

Owns the whole turn cycle. No React hook initializes audio anymore.

Public API:
- `open({ firstName?, mode? })` → idempotent session start
- `close()` → full teardown
- `interrupt()` → barge-in
- `mute(bool)`, `restart()`, `switchToChat()`
- `subscribe(listener)` → reactive state for UI

Internal state machine (strict):
```
idle → requesting_mic → listening → thinking → speaking
                            ↑          ↓
                            └── interrupted
error | closed (terminal until open())
```

Each session has a `sessionId` (uuid). Every async callback (TTS chunk, STT result, WS event) checks `event.sessionId === this.sessionId` and is dropped otherwise. Replaces the global `__UNPRO_ALEX_VOICE_RUNTIME__` lock pattern with per-session ownership.

Pipeline owned by the controller:
- mic stream (single `getUserMedia` call, released on close)
- VAD (existing client VAD module reused)
- STT (ElevenLabs realtime scribe via existing service)
- LLM brain call (reused)
- TTS stream (ElevenLabs, **Sophia `YxrwjAKoUKULGd0g8K9Y` only**, female-lock from `alexVoiceConfig.ts`)
- playback via single `HTMLAudioElement` (see §3)

## 2. Session start sequence (`open()`)

Exact order, each step ≤ its own timeout, total fail-safe at 3000 ms:

1. `killPreviousSession()` — abort any in-flight fetches, close audio, null refs
2. `stopAllAudio()` — pause + reset playback element, revoke object URLs
3. `cancelAllTTS()` — abort TTS fetch controllers
4. `clearAllLocks()` — reset internal flags (no more global window keys)
5. `requestMicrophone()` — via existing `permissionManager`
6. `startListening()` — VAD + STT start, state → `listening`
7. `speakGreetingOnce()` — fire-and-forget; mic stays open
8. State remains `listening` even if greeting TTS is still loading

Greeting text:
- logged in → `Bonjour ${firstName}. Je vous écoute.`
- guest → `Bonjour. Je vous écoute.`

**Failsafe**: a 3000 ms timer from `open()`. If state is still `requesting_mic` or no audio path is ready, force `listening`, mic on, drop TTS attempt, surface a tiny inline `error` chip but never block UI. Remove the `"Alex redémarre…"` label entirely (rename to `"Connexion…"` shown ≤ 2 s, then auto-clear).

## 3. Audio routing — media, never call/SCO

To make Bluetooth/Spotify behave like ChatGPT Voice:

- Use a plain `new Audio()` element with `preload="auto"` for TTS playback (not Web Audio `AudioContext` for output) — browsers route `HTMLAudioElement` as **media**, not communication.
- For mic capture: `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })` **without** any `latencyHint: 'interactive'` AudioContext for output, and **no** `{ audio: { channelCount, sampleRate } }` overrides that some browsers map to voice mode.
- Do **not** call `AudioContext` with `latencyHint: 'interactive'` or `'playback'` on the output path. If a context is needed only for VAD analysis on the **input**, create it once at `latencyHint: 'balanced'` and never connect it to `destination`.
- `navigator.mediaSession.metadata = { title: 'Alex' }` and `playbackState = 'playing'` only. Do **not** set `setActionHandler` for `play/pause/seek*/previoustrack/nexttrack` — leaves Bluetooth transport untouched.
- Never call any `startBluetoothSco` / communication-mode APIs (none should exist in the codebase; audit and remove if found).
- Drop any code that forces speakerphone / device routing.

This isolates Alex from Android's call audio stack so Spotify keeps playing at normal volume.

## 4. Interruption (barge-in)

VAD speech-start event while `state === 'speaking'`:
- `playbackElement.pause(); playbackElement.src = ''`
- abort current TTS fetch
- state → `interrupted` → `listening` (single tick)
- STT keeps the new utterance — no lost words

## 5. React surface — thin

Delete duplicated startup logic from:
- `useAlexVoiceRecovery.ts` — replaced (kept as thin wrapper that calls `controller.restart()`)
- `OverlayAlexVoiceFullScreen.tsx` boot effects (`bootInitiatedRef`, TTS warmup timers, first-audio bail, 25 s boot bail) — removed; overlay only calls `controller.open()` on mount and `controller.close()` on unmount
- `useAlexConversationControl.ts` — single calm reminder retained: *"Je reste disponible quand vous êtes prêt."*, no auto-close, no repeated prompts
- `useLiveVoice.ts` overrides — moved into controller; ElevenLabs overrides for `tts.voice_id`, `agent.first_message`, `agent.language` set once per session
- `alexVoiceAbstraction.ts` — all `window.speechSynthesis` paths deleted (no browser TTS, no male fallback)

New hook `useAlexVoiceController()` returns `{ state, isMuted, error, open, close, interrupt, mute, restart, switchToChat }` — pure subscription, no side effects.

## 6. Female-only lock (already in place, reinforced)

- `alexVoiceConfig.ts` stays single source of truth (`ALEX_VOICE_ID = YxrwjAKoUKULGd0g8K9Y`, `ALEX_DISABLE_BROWSER_TTS = true`, `ALEX_DISABLE_MALE_FALLBACK = true`).
- Backup retry uses the same voice ID — never switches voice on failure.
- Pre-deploy guard `scripts/pre-deploy-voice-guard.mjs` extended to fail if any file imports `speechSynthesis`, any other ElevenLabs voice ID, or `startBluetoothSco`.

## 7. UI / Orb

Orb reads `controller.state`:
- `listening` → slow breathing
- `thinking` → subtle pulse
- `speaking` → waveform morph
- `interrupted` → snap back to listening (no flash)
- `error` → small chip, not full overlay

Buttons in overlay: mute, end call, switch to chat, restart.

## 8. Conversation style guardrails

- Reply length cap: ≤ 2 sentences per turn (enforced in sanitize layer).
- One question at a time.
- After one silence prompt, stay silent — no follow-ups, no auto-close.
- Reminder line locked to: *"Je reste disponible quand vous êtes prêt."*

## 9. Files touched

**New**
- `src/services/alexVoiceController.ts` (singleton + state machine)
- `src/hooks/useAlexVoiceController.ts` (subscription hook)

**Rewritten (thin)**
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx`
- `src/hooks/useAlexVoiceRecovery.ts`
- `src/hooks/useAlexConversationControl.ts`
- `src/hooks/useLiveVoice.ts` (folded into controller, kept as shim re-export if other callers depend on it)
- `src/services/alexVoiceAbstraction.ts` (strip speechSynthesis)
- `src/services/voiceRuntimeSingleton.ts` (deprecated; replaced by controller's internal session — keep file with `@deprecated` re-export for one release)

**Reinforced**
- `src/config/alexVoiceConfig.ts` (no change, already locked)
- `scripts/pre-deploy-voice-guard.mjs` (extra checks)

**Memory updates**
- Append to `mem://ai/alex/voice-config-active` and `mem://features/voice-health-contract`: new controller is the single entry point; no other component may call ElevenLabs directly.

## 10. Acceptance test (manual on `/decrire-mo…`)

1. Tap orb → mic prompt (if first time) → female "Bonjour Yanick. Je vous écoute." within 3 s
2. Orb is in `listening` immediately, even if TTS still loading
3. Speak during Alex's greeting → Alex cuts off mid-sentence, STT captures new utterance
4. No `"Alex redémarre…"` ever appears
5. With Spotify playing over car Bluetooth: Spotify keeps playing at normal volume; no SCO switch; no call-mode ducking
6. Close overlay → mic released, no orphan audio, controller back to `closed`

## 11. Out of scope

- No changes to ElevenLabs agent ID or backend edge functions
- No changes to brain prompt content (only length cap is enforced client-side)
- No new UI components beyond what already exists in the overlay
