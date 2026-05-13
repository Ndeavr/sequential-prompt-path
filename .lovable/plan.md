## Diagnosis

Voice opens, fails to deliver first audio in 6.5s, then bails to chat fallback. From inspection:

- `voice-get-signed-url` returns a WSS signed URL successfully (verified live), but `voiceId` comes back `null` and `fallbackUsed: true` — the DB row exists but is being read as null in the hot path, and the env `ELEVENLABS_AGENT_ID` doesn't match the active agent.
- `useLiveVoice.start()` calls `conversation.startSession({ signedUrl, connectionType: "websocket" })` and never sends any greeting override. If the ElevenLabs agent has no configured first message, the WS connects but never produces audio → 6.5s timer expires → fallback chat opens with the "Activer la voix" prompt.
- Tapping "Activer la voix" reopens the overlay, repeats the same path, and falls back again — so it looks like nothing happens.

Mobile latency + WebSocket connection type also makes the cold start fragile compared to WebRTC, which is the ElevenLabs-recommended path.

## Goal

Voice starts on first try, on mobile, every time, when the user taps a pill or "Activer la voix". No more silent fallback.

## Plan

### 1. Edge function: serve a WebRTC conversation token (preferred) + keep signed URL as fallback

Update `supabase/functions/voice-get-signed-url/index.ts`:

- Add a parallel call to ElevenLabs `/v1/convai/conversation/token?agent_id=...` and return both `conversationToken` and `signedUrl`.
- Always read voice_configs reliably:
  - Drop the in-process cache when it returns no `voice_id` (current bug — null cached forever).
  - Fall back to env only when DB explicitly returns no row.
- Return `{ conversationToken, signedUrl, agentId, voiceId, … }`. Keep `fallback: "chat"` only when API key missing.

### 2. `useLiveVoice.ts`: prefer WebRTC, fallback to WebSocket, no client overrides

- If `data.conversationToken` is present, call:
  ```ts
  await conversation.startSession({
    conversationToken: data.conversationToken,
    connectionType: "webrtc",
  });
  ```
- Else fall back to `{ signedUrl, connectionType: "websocket" }`.
- Keep zero client-side overrides (per `voice-connection-stability` memory).
- Reset `lastDisconnectAtRef` when the user explicitly retries (so "Activer la voix" is never blocked by cooldown).

### 3. ElevenLabs agent: guarantee a first message

Voice never speaks if the agent has no first message AND no override is sent. Two fixes, in order of safety:

- Add a server-side first message in the ElevenLabs agent dashboard for `agent_5901kmg4ra2eee5bbp9r7ew5jcs7` (manual one-time step — instructions surfaced to the user).
- As a runtime safety net, after `conversation.startSession` succeeds and once `onConnect` fires, if no audio arrives in 2.5s, send `conversation.sendUserMessage` with the contextHint or a neutral nudge so the agent is forced to respond. This guarantees first audio even if the agent's first message field is empty.

### 4. Overlay: tighten the retry path

`OverlayAlexVoiceFullScreen.tsx`:

- When the boot effect runs because of `openVoiceSession("fallback_retry_voice", ...)`, force `connectionType: "webrtc"` on the first attempt and skip the cooldown guard.
- Bump `FIRST_AUDIO_TIMEOUT_MS` to 9000ms only on WebSocket fallback (WebRTC stays at 6500ms).
- Keep enthusiasm-boosted greeting from previous step.

### 5. Verification

- Curl `voice-get-signed-url` and confirm both `conversationToken` and `signedUrl` are returned with a non-null `voiceId`.
- Open `/index` on the mobile preview, tap the pill "J'ai un problème urgent à la maison" → overlay should connect and Alex should greet within ~2s.
- Tap "Activer la voix" from the fallback panel → voice overlay reopens and starts cleanly.

## Out of scope

- No UI redesign of the fallback panel.
- No changes to authentication, RLS, or other modules.
- No changes to `src/integrations/supabase/{client,types}.ts`.
