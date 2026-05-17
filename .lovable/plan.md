# Plan — Restore Alex Voice-First Without Auto-Restart

## Diagnosis
- The browser grants microphone access.
- The backend successfully returns valid ElevenLabs credentials in under 2 seconds.
- The live session then times out at `conversation.startSession({ signedUrl, connectionType: "websocket" })` before first audio.
- Because no first audio arrives, the overlay immediately closes voice and switches to chat fallback.
- Result: the message bubble appears, but Alex does not speak or listen.

## Objective
Make the orb tap produce real audible Alex voice every time possible, while preserving the hard production rule:
- No auto-start on render.
- No silent auto-restart.
- No repeated greeting loop.
- Only user action starts or retries voice.

## Implement

### 1. Add a voice-first TTS fallback for live connection timeout
Update `OverlayAlexVoiceFullScreen.tsx` so that when the live ElevenLabs conversation fails before first audio with `Connection timeout — voice unavailable`, Alex does not immediately close into chat.

Instead:
- Keep the overlay open.
- Speak the current greeting through the existing `elevenlabsService.speak()` TTS fallback.
- Transition the UI into a voice-present state (`speaking` then `awaiting_user`).
- Keep chat fallback available as a button, but do not make it the first response.

This makes Alex actually talk even when the live Conversational AI socket is unavailable.

### 2. Add a user-initiated listening retry after TTS fallback
After TTS fallback finishes:
- Show the existing retry/reset control as the user action to reconnect live listening.
- Do not auto-retry in the background.
- Preserve `MAX_AUTO_RETRIES = 0` and `MAX_TOKEN_RETRIES = 0`.

This keeps the system event-driven and avoids the infinite reconnect feeling.

### 3. Prefer WebRTC token on mobile when available, with WebSocket fallback only if user retries
Update `useLiveVoice.ts` startup selection safely:
- If `conversationToken` exists, use `connectionType: "webrtc"` for mobile/modern browsers.
- Keep signed URL WebSocket path as fallback for retry/manual recovery.
- Do not change voice IDs, model, mic permission flow, VAD settings, or Alex state-machine semantics.

The current backend already returns both `conversationToken` and `signedUrl`, so this is a frontend connection strategy fix, not a backend secret/config change.

### 4. Fix first-audio detection so “listening but silent” cannot pass
Keep first-audio validation strict:
- `onConnect` alone is not success.
- Success requires `isSpeaking`, `agent_response`, or audio event.
- If no first audio arrives, run the TTS fallback before chat fallback.

### 5. Strengthen voice health checks
Update `voice_smoke_test()` to include:
- credential fetch from `voice-get-signed-url`, checking both `conversationToken` and `signedUrl` exist.
- live connection attempt health marker if possible.
- TTS fallback playback check remains mandatory.

This prevents deploys from passing when only the text bubble works.

## Protected files touched
Only voice-specific files will be touched because this task is explicitly about Alex voice:
- `src/hooks/useLiveVoice.ts`
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx`
- `src/lib/voiceSmokeTest.ts`

## Not touched
- No voice ID changes.
- No ElevenLabs key changes.
- No autostart restoration.
- No route mount changes.
- No unrelated UI refactor.
- No database migration.

## Validation
After implementation:
- Run focused voice guard checks.
- Verify console no longer shows immediate `fallback chat (voice_error_pre_audio)` as the first outcome.
- Verify token fetch succeeds.
- Verify TTS fallback speaks when live connection times out.
- Verify retry remains user-initiated only.