

## Problem Analysis

Two issues on the Hero page (`/index`):

1. **Alex can't understand voice input** — The mic audio is being sent but Gemini doesn't comprehend it. Root cause: the `ScriptProcessorNode` is deprecated and unreliable on mobile browsers. It may silently produce empty/garbled buffers. Additionally, there's no audio format validation or error logging, so failures are silent.

2. **No auto-greeting on connect** — When the user taps the orb, Alex connects but stays silent, waiting for user input. She should immediately say "Bonjour [FirstName], bienvenue." or "Bonjour, bienvenue."

---

## Plan

### 1. Fix microphone capture — Replace ScriptProcessorNode with AudioWorklet

**File: `src/services/geminiAudioWorklet.ts`** (new)

Create an AudioWorklet processor that reliably captures PCM at 16kHz. AudioWorklet runs on a dedicated thread and doesn't drop frames like ScriptProcessorNode.

```text
Worklet processor: captures Float32 → converts to Int16 PCM → posts via MessagePort
```

**File: `src/hooks/useLiveVoice.ts`**

- Replace `createScriptProcessor` with `AudioWorklet` registration and `AudioWorkletNode`
- Add fallback to ScriptProcessorNode for browsers that don't support AudioWorklet
- Add `console.warn` logging when audio chunks are empty (debugging aid)
- Keep input AudioContext at native sample rate (not forced 16kHz) and resample in the worklet — this fixes the core issue where some mobile browsers ignore the `sampleRate` constructor option

### 2. Auto-greeting on connect — Use `sendClientContent`

**File: `src/hooks/useLiveVoice.ts`**

Add an optional `initialGreeting` parameter. Inside the `onopen` callback, after mic setup, send:

```typescript
session.sendClientContent({
  turns: [{ role: "user", parts: [{ text: initialGreeting }] }],
  turnComplete: true,
});
```

This tells Gemini "the user just said this" and triggers an immediate spoken response.

**File: `src/components/home/HeroSection.tsx`**

- Import `useAuth` to get `user?.user_metadata?.full_name`
- Extract first name
- Pass `initialGreeting` to `useLiveVoice.start()`:
  - Logged in: `"Salue-moi. Mon prénom est [FirstName]."`
  - Anonymous: `"Salue-moi. Je suis un nouveau visiteur."`

This approach lets the model generate the greeting naturally in its own voice (e.g., "Bonjour Marie, bienvenue!") rather than hard-coding TTS text.

### 3. Add audio diagnostics

**File: `src/hooks/useLiveVoice.ts`**

- Log first audio chunk size to verify mic data is flowing
- Log `inputTranscription` events to console so we can verify Gemini is receiving French audio
- Add a 3-second timeout after connect: if no audio chunks sent, warn in console

---

## Files to modify

| File | Action |
|------|--------|
| `src/services/geminiAudioWorklet.ts` | **Create** — AudioWorklet processor for reliable mic capture |
| `src/hooks/useLiveVoice.ts` | **Edit** — Replace ScriptProcessor with AudioWorklet, add `initialGreeting` support, add diagnostics |
| `src/components/home/HeroSection.tsx` | **Edit** — Pass user's first name as initial greeting to `start()` |

