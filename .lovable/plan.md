

# Fix Alex Voice — Diagnosis and Repair Plan

## What's Wrong

There are **two disconnected voice systems** that create confusion and bugs:

1. **AlexAssistantSheet** (the bottom sheet on homepage) — uses `useAlexVoiceSession` which chains `useAlex` (→ `alex-chat`) + `useAlexVoice` (→ `elevenlabs-tts` separately). This is what you're currently using based on console logs.

2. **AlexVoicePage** (`/alex/voice`) — uses `useAlexVoiceFull` (→ `alex-voice` unified function). This is the production-ready path but isn't the default entry point.

### Specific Issues Found

1. **The `useAlexVoiceSession` state machine is fragile**: STT uses `continuous: false` + `interimResults: false`, which means each utterance requires a full restart cycle. The anti-loop guard can freeze the session if state changes happen too fast.

2. **TTS is sequential and slow**: The legacy `useAlexVoice` hook calls `elevenlabs-tts` edge function per sentence chunk via separate HTTP requests (not streaming). Each chunk waits for the previous to finish before even starting the next TTS request.

3. **Session dies quickly**: The session opened at 3:27:00 and closed at 3:27:21 (21 seconds). The STT `onend` → restart loop can fail silently, leaving the session in limbo.

4. **No unified pipeline**: The sheet voice mode doesn't use the `alex-voice` edge function which handles AI + TTS in one call and returns pre-generated audio chunks. Instead it makes 2+ separate round trips (AI streaming via `alex-chat`, then TTS per sentence via `elevenlabs-tts`).

5. **Echo protection is timing-based** (350ms delay) rather than proper audio-based, which can cause Alex to hear herself or miss user input.

## Plan

### Step 1: Unify voice session onto the production `alex-voice` pipeline

Rewrite `useAlexVoiceSession` to use the `alex-voice` edge function directly (like `useAlexVoiceFull` does) instead of chaining `useAlex` + `useAlexVoice` separately. This gives:
- Single request for AI + TTS (faster)
- Pre-chunked base64 audio ready for immediate playback
- Consistent behavior between sheet and full-page voice

### Step 2: Fix STT reliability

- Switch to `continuous: true` with `interimResults: true` for smoother recognition
- Add proper silence detection timeout (auto-send after 2s of silence)
- Remove anti-loop guard (it masks the real bug — the state oscillation won't happen with a proper pipeline)

### Step 3: Fix playback queue

- Use the interrupt-safe `playbackToken` pattern from `useAlexVoiceFull` in the sheet voice mode
- Pre-enqueue all audio chunks returned by `alex-voice` instead of fetching TTS per sentence

### Step 4: Improve echo protection

- Disable STT microphone during playback (not just a timer delay)
- Re-enable STT only after last audio chunk finishes playing + 200ms buffer

### Step 5: Connect the sheet voice mode to the same session/context

- Pass `currentPage`, `activeProperty`, authentication context to `alex-voice`
- Store conversation history for continuity

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAlexVoiceSession.ts` | Rewrite to use `alex-voice` edge function directly, fix STT, fix playback |
| `src/components/alex/AlexAssistantSheet.tsx` | Minor updates for new hook API |
| `src/components/home/HeroSection.tsx` | Ensure voice mode uses updated session |

### Technical Details

The new `useAlexVoiceSession` will:
- Call `alex-voice` with `action: "create-session"` on open (gets greeting + audio)
- Call `alex-voice` with `action: "respond-stream"` on user speech (gets text + audio chunks)
- Use `playbackToken` for interrupt safety
- Use `continuous: true` STT with proper barge-in detection
- Remove dependency on `useAlex` and `useAlexVoice` legacy hooks

