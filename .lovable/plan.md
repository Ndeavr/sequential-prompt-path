

# Fix: Two Voices Overlapping on Home Page

## Problem Identified

There are **two separate Gemini Live WebSocket sessions** opening simultaneously on the home page:

1. **HeroSection** (the orb) — auto-starts via `useAlexHomeAutostart`, calls `useLiveVoice().start()`
2. **GlobalAlexOverlay** — always mounted in `providers.tsx`, renders `AlexVoiceMode` which also calls `useLiveVoice().start()` when opened

Each `useLiveVoice()` hook instance creates its **own WebSocket connection** to Gemini, its **own microphone stream**, and its **own audio output context**. Result: two AI voices speaking simultaneously with potentially different audio characteristics.

Additionally, inside `useLiveVoice.ts` line 248-264, the `onTranscript` callback fires **twice per message** — once for `outputTranscription.text` and once for `modelTurn.parts[].text` — causing duplicate text in the UI.

## Plan

### Step 1: Fix duplicate transcript in useLiveVoice.ts
- In the `onmessage` handler, prioritize `outputTranscription.text` (the actual spoken words) and **skip** `modelTurn.parts[].text` when audio modality is active. The text parts are the internal text representation — not what's spoken — and should not trigger `onTranscript`.

### Step 2: Enforce single Gemini session via GlobalAlexOverlay guard
- In `GlobalAlexOverlay.tsx`, when `isOpen` becomes true while `HeroSection` already holds the runtime lock, **stop the Hero session first** before starting the overlay session (or block the overlay entirely).
- In `HeroSection.tsx`, when `GlobalAlexOverlay` acquires the lock, ensure the hero's `useLiveVoice` session is stopped.

### Step 3: Make useLiveVoice singleton-aware
- Before opening a new WebSocket in `start()`, dispatch `alex-voice-cleanup` event AND stop any existing session from the same hook instance.
- Listen for `alex-voice-cleanup` in the hook itself — when received, auto-stop the current session. This ensures only ONE Gemini session is ever active app-wide.

### Step 4: Verify voice consistency
- Ensure both HeroSection and AlexVoiceMode use the same `voiceName` from the edge function (`Aoede`). Currently they do, but the duplicate session creates interference that sounds like a different voice.

## Files to Modify
- `src/hooks/useLiveVoice.ts` — Remove duplicate onTranscript, add cleanup listener
- `src/components/alex/GlobalAlexOverlay.tsx` — Stop hero session before starting overlay
- `src/components/home/HeroSection.tsx` — Listen for cleanup and auto-stop

## Note on "Playing Samples"
I cannot play audio in this environment. The two voices you hear are both Gemini's Aoede voice, but from **two simultaneous WebSocket sessions** with slight timing differences, creating the overlapping effect. Fixing the duplicate session will eliminate the problem entirely — you'll hear one clean voice.

