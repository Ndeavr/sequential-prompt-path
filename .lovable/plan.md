

# Fix: Alex Doesn't Speak First + Chat Keyboard Visibility

## Problem 1 — Alex connects but waits for user to speak

**Root cause**: The greeting is embedded in `systemInstruction` text with "Commence IMMÉDIATEMENT la conversation en disant: [greeting]". But Gemini Live does NOT proactively speak from system instructions alone — it waits for user audio input before generating a response.

The previous code used `sendClientContent` to trigger the greeting but it was removed because it caused WebSocket 1007 close. That was likely a timing issue (sent before the connection stabilized). Now we have a 1200ms post-connect grace period — sending it after stabilization should work.

**Fix**: In `useLiveVoice.ts`, after the connection is stable and mic is set up, send a `sendClientContent` with the greeting text as a user turn + `turnComplete: true` to trigger the model to respond with its greeting audio. This replaces the "just put it in systemInstruction" approach.

### Changes in `src/hooks/useLiveVoice.ts`:

1. After mic pipeline setup (line ~381), add:
```typescript
// Trigger model to speak the greeting proactively
if (sessionRef.current && options?.initialGreeting) {
  try {
    sessionRef.current.sendClientContent({
      turns: [{ role: "user", parts: [{ text: `[Instructions: Dis maintenant ta salutation d'accueil. Voici le contexte: ${options.initialGreeting}]` }] }],
      turnComplete: true,
    });
    console.log("[GeminiLive] ✅ Greeting trigger sent");
  } catch (e) {
    console.warn("[GeminiLive] Failed to send greeting trigger:", e);
  }
}
```

2. Keep the greeting in `systemInstruction` as personality/context, but the `sendClientContent` is what actually triggers the model to speak.

3. Store `options` in a local variable so it's accessible after the async mic setup.

---

## Problem 2 — Chat: last Alex message hidden when keyboard opens

**Root cause**: In `PageHomeAlexConversationalLite.tsx`, the conversation area auto-scrolls on new messages, but NOT when the keyboard opens (input focus). On mobile, keyboard shrinks the viewport via `100dvh`, pushing the last message out of view.

**Fix**: In `InputAlexDockExpanded.tsx`, when the input is focused, dispatch an event or call a scroll callback. In `PageHomeAlexConversationalLite.tsx`, add a `visualViewport` resize listener that scrolls the conversation to bottom when the viewport shrinks (keyboard opening).

### Changes:

**`src/pages/PageHomeAlexConversationalLite.tsx`** — Add `visualViewport` resize listener:
```typescript
useEffect(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  const onResize = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };
  vv.addEventListener("resize", onResize);
  return () => vv.removeEventListener("resize", onResize);
}, []);
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useLiveVoice.ts` | Add `sendClientContent` greeting trigger after stable connection + mic setup |
| `src/pages/PageHomeAlexConversationalLite.tsx` | Add `visualViewport` resize listener for keyboard scroll |

