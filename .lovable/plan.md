

## Problem

Alex connects to ElevenLabs then **immediately disconnects** (within ~50ms). This happens repeatedly in a loop. Two root causes:

1. **Overrides rejection**: The `startSession` call passes `overrides` (prompt, firstMessage, language) but these must be **explicitly enabled in the ElevenLabs agent dashboard**. If not enabled, ElevenLabs silently rejects the session → instant disconnect.

2. **Reconnect loop**: After disconnect, `releaseLock()` is called → the autostart's `sessionStorage` guard should prevent re-fire, but the component may be re-mounting or the lock state change triggers a cascade → new connection attempt → same instant disconnect → loop.

## Solution

### 1. Remove overrides from startSession (primary fix)

In `src/hooks/useLiveVoice.ts`, remove the `overrides` block from `conversation.startSession()`. The French prompt must be configured directly on the ElevenLabs agent (agent ID `agent_5901kmg4ra2eee5bbp9r7ew5jcs7`) via their dashboard — not passed as client-side overrides.

```typescript
// BEFORE (broken)
await conversation.startSession({
  signedUrl: data.signed_url,
  overrides: {
    agent: {
      prompt: { prompt: ALEX_FRENCH_SYSTEM_PROMPT },
      firstMessage: "Bonjour...",
      language: "fr",
    },
  },
});

// AFTER (working)
await conversation.startSession({
  signedUrl: data.signed_url,
});
```

### 2. Add reconnect guard to prevent loop

In `useLiveVoice.ts`, add a cooldown ref that blocks reconnection within 5 seconds of a disconnect, preventing the rapid connect/disconnect loop.

### 3. Add error containment on disconnect

Wrap `onDisconnect` to detect instant disconnects (connected < 2 seconds) and flag them as a connection error instead of silently retrying.

### 4. Redeploy edge function

Redeploy `elevenlabs-conversation-token` to ensure consistency.

### Files modified
- `src/hooks/useLiveVoice.ts` — remove overrides, add cooldown guard
- `src/hooks/useAlexHomeAutostart.ts` — no changes needed (guards are correct)

