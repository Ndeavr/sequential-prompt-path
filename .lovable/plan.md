## Goal

Polish the full-screen Alex Voice overlay (`OverlayAlexVoiceFullScreen.tsx`) so it matches the homepage hero, shows live transcripts only, and feels instant.

## Changes

### 1. Use the same orb as the homepage
- Replace the bespoke `LockedVoiceOrb` (small circles + `UnproIcon`) with `AlexMorphingOrb` (`@/components/alex/AlexMorphingOrb`) — the exact component used by `HeroOrbMockup`.
- Map the overlay's machine state → `AlexOrbStateV2` (`speaking | listening | thinking | error | idle`).
  - `speaking` → `isSpeaking || state==="speaking"`
  - `thinking` → `processing_stt | processing_response | stabilizing | opening_session`
  - `error` → `error_recoverable | error_fatal`
  - `listening` → `listening | awaiting_user | capturing_voice | session_ready`
  - else → `idle`
- Size `lg`, click does nothing (already in session).

### 2. Remove the "Accueil UNPRO" context pill
- Drop the seeded user transcript built from `contextHint` (the lines 320-326 block that pushes the pill text into the transcript list).
- Keep `contextHint` only for greeting context server-side; no UI bubble.

### 3. Clean status / remove duplicate "Connexion d'Alex…"
- Remove the standalone boot/recovery loader row (lines 660-671) — the orb state itself communicates connecting via `thinking`.
- Keep only the small subtitle under "Alex Voice" in the header (`statusText`). That single line shows "Alex démarre…" / "Alex écoute…" / "Vous parlez…" / "Alex parle…".
- Boot label strings already say "Alex démarre…" — leave as-is.

### 4. Live transcripts (Alex + user)
- The hook already wires `onTranscript` (Alex) and `onUserTranscript` (user) into `setTranscripts`. Keep that.
- Render the transcript list above the orb (already does). Confirm:
  - User bubbles right-aligned, primary tint.
  - Alex bubbles left-aligned with the "Alex" label.
  - Auto-scroll on update (already present).
- Show a subtle "·" typing indicator on the latest Alex bubble while `isSpeaking` and the bubble is still streaming (small CSS-only dot).

### 5. Sub-2s perceived start
Two levers — perception + real latency:

**Perception (immediate)**
- As soon as boot starts, push a single Alex bubble with the greeting text (the same string returned by `buildGreeting()`), flagged as "preview" until first audio frame arrives. This makes the conversation visible within ~100ms even while ElevenLabs is still handshaking.
- Switch orb to `thinking` immediately on open (already does via `stabilizing` mapping).

**Real latency**
- Lower `TOKEN_SLOW_THRESHOLD_MS` from 2000 → 1500 (cosmetic only, since the label row is removed).
- Lower the safety nudge in `onConnect` from 2500 ms → 1200 ms so if the agent has no first message configured, we force a greeting much sooner.
- Pre-warm the ElevenLabs token request: kick off the `getElevenLabsConversationToken` fetch in parallel with `getUserMedia` mic permission inside `useLiveVoice.start()` (instead of sequentially). If `useLiveVoice` already awaits mic first, hoist the token fetch to run concurrently via `Promise.all`.
- Verify `useLiveVoice` does not call `setVolume` or other overrides before `startSession` (per memory `voice-connection-stability`); no client-side overrides.

### 6. Files touched
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx` — orb swap, remove seed pill + loader row, add greeting preview bubble, nudge timing.
- `src/hooks/useLiveVoice.ts` — parallelize token fetch + mic permission (read first to confirm structure).
- No DB/schema changes. No edge function changes.

### Out of scope
- Voice ID / agent selection (unchanged, Sophia is already active in `voice_configs`).
- Recovery, hard-reset, chat fallback flows (unchanged).
- Homepage orb itself (unchanged).

## Success criteria
- Orb in voice overlay is visually identical to the homepage hero orb.
- No "Accueil UNPRO" pill, no duplicate "Connexion d'Alex…" line — only the small status under the header.
- Both Alex and user lines stream into the transcript area live.
- First Alex bubble visible ≤ 500 ms after opening; first audio typically ≤ 2 s on warm cache.
