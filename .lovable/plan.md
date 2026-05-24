## Root cause

Logs prove the failure path:

1. WebRTC startSession with `conversationToken` → LiveKit returns `v1 RTC path not found`. The SDK swallows it and retries internally — our `try/catch` never gets a throw, so the WebSocket fallback in `useLiveVoice` never runs.
2. The 1200 ms "warmup" speaks the greeting via HTMLAudio. The single user-gesture audio unlock is consumed there, so when WebRTC finally reaches a room, browser blocks playback with `NotAllowedError`.
3. The 6 s `CONNECTION_TIMEOUT_MS` fires because `onConnect` never arrives, calls `conversation.endSession()`, raises "Connection timeout — voice unavailable", and the overlay shows "Je continue ici avec vous." → mic is killed.

Net effect: intro plays → session is force-killed → user is stranded.

## Fix (surgical, voice-only)

### 1. `src/hooks/useLiveVoice.ts` — make WebSocket the primary transport

- Use `signedUrl` + `connectionType: "websocket"` as the **first** attempt. WebSocket is the only path that the current edge token + agent reliably support; logs show WebRTC `v1 RTC path not found` consistently.
- Keep `conversationToken` + `connectionType: "webrtc"` as a **second** attempt only if the WebSocket attempt synchronously throws.
- Raise `CONNECTION_TIMEOUT_MS` from `6_000` to `12_000` to absorb mobile/3G handshakes without false aborts.
- In the connection-timeout handler, if `conversation.status === "connected"` at firing time, do NOT call `endSession()` — just clear the timer. Prevents killing a session that connected late.

### 2. `src/components/voice/OverlayAlexVoiceFullScreen.tsx` — stop racing the real session

- **Remove the 1200 ms `ttsWarmupTimerRef` preemptive `playTtsFallbackGreeting("live_slow_warmup")`.** This is what consumes the audio gesture and creates the dead-end after the intro.
- Replace it with a single fallback that fires **only after** `CONNECTION_TIMEOUT_MS` (12 s) AND no real audio has been received — i.e. only on a true failure path, not while a real session is still negotiating.
- Keep the "Connexion d'Alex…" label after 2 s (purely visual, no audio side-effect).
- When `playTtsFallbackGreeting` completes, after the greeting finishes, transition straight to `listening` and keep the mic alive (already partially done — verify no `endSession()` is called in that branch).

### 3. Defensive: `onError` from `useConversation`

- If the SDK emits an error containing `"v1 RTC path not found"` or `"WebSocket"` and we haven't yet fired the second attempt, automatically restart the session with the alternate transport instead of bubbling the error to the overlay.

## Files to edit

```text
src/hooks/useLiveVoice.ts
src/components/voice/OverlayAlexVoiceFullScreen.tsx
```

No changes to: edge functions, voice ID, prompts, agent overrides, Supabase, types, client.

## Success criteria

- Tap orb → mic granted → token OK → **WebSocket** session connects within ~2-3 s → Alex says "Bonjour Yanick. Je vous écoute." (real session, not HTMLAudio fallback) → overlay shows "Alex écoute…" and stays in `listening` waiting for the user.
- No `Connection timeout — voice unavailable` error on normal boot.
- No red "Je continue ici avec vous." banner on normal boot.
- No `NotAllowedError: play() can only be initiated by a user gesture` in console.
- If both transports actually fail, the TTS fallback greets once and the mic remains armed for chat fallback.

## Tasks

1. Reorder transports in `useLiveVoice.ts` (WebSocket primary, WebRTC secondary) and raise connection timeout to 12 s.
2. Make the connection timeout non-destructive when SDK is already `connected`.
3. Delete the 1200 ms preemptive TTS warmup in `OverlayAlexVoiceFullScreen.tsx`; keep the post-timeout fallback only.
4. In `useLiveVoice` `onError`, auto-retry with the alternate transport once on `v1 RTC path not found` / WebSocket close 1006.
5. Verify with console logs: `VOICE_TOKEN_OK` → `Session started` → `Connected to agent` → `first_audio` → `listening`.
