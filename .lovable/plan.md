

## Problem

Two issues confirmed from logs:

1. **Instant disconnect (44ms/97ms)**: The `overrides: { agent: { language: "fr" } }` in `startSession()` causes ElevenLabs to reject the session immediately. This override is NOT enabled on the agent dashboard.

2. **Chime overlap**: `audioEngine.play("intro")` fires before connecting, then `audioEngine.play("success")` fires in `onConnect` — both try to play within ~1 second. On disconnect, `audioEngine.play("outro")` fires too. Multiple chimes stack up and create audio noise.

## Solution

### 1. Remove ALL overrides from startSession (fixes disconnect)

In `src/hooks/useLiveVoice.ts`, change `startSession` to use only the signed URL with zero overrides:

```typescript
await conversation.startSession({
  signedUrl: data.signed_url,
});
```

French language must be configured directly on the ElevenLabs agent dashboard — not via client overrides.

### 2. Remove chime overlap (keep only one sound)

- **Remove** the `await audioEngine.play("intro")` call before connecting
- **Keep** the `audioEngine.play("success")` on connect as the single connection confirmation sound
- **Remove** the `audioEngine.play("outro")` on disconnect (it fires even on instant disconnects, creating noise)

This means: one single chime on successful connection, nothing else.

### 3. Redeploy edge function

Redeploy `elevenlabs-conversation-token` for consistency.

### Files modified
- `src/hooks/useLiveVoice.ts` — remove overrides, remove intro/outro chimes, keep only success chime on connect

