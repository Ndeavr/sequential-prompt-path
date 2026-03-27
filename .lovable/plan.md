

## Problem

Two separate voice/audio sources play simultaneously when "Parler à Alex" is activated, producing different text at the same time. The root cause: **`GlobalAlexOverlay` (renders `AlexVoiceMode`)** and **`AlexConcierge` (floating orb/chat)** are both mounted and active on every page. When `openAlex()` is called, `AlexVoiceMode` auto-creates a session and plays greeting TTS, but nothing stops other components from also producing audio.

## Plan

### 1. Extend `AlexVoiceContext` with a mutex lock

Add a `voiceActive` flag to the context so any component can check if a voice session is already running. When `GlobalAlexOverlay` opens, set `voiceActive = true`. All other voice-capable components check this flag and refuse to start/play audio.

### 2. Suppress `AlexConcierge` when voice overlay is open

In `AlexConcierge.tsx`, read `isOpen` from `useAlexVoice()`. When the global overlay is open:
- Hide the floating orb entirely
- If the chat panel is open, close it
- Do NOT trigger any audio or auto-greetings

### 3. Guard `AlexVoiceMode` against double-mount

Add a `useRef` guard in `AlexVoiceMode` to ensure only one session is created per mount cycle. Also cancel any running audio in the cleanup function (`useEffect` return) to prevent orphaned audio playback.

### 4. Cancel all audio on `closeAlex()`

In `AlexVoiceContext.closeAlex()`, dispatch a custom event (`alex-voice-cleanup`) that all voice components listen for to immediately stop any playing audio (`audio.pause()`, `recognition.stop()`).

### 5. Single entry point enforcement

Ensure the bottom nav "Parler à Alex" button, the `AlexConcierge` orb full-screen button, and all other triggers go through the same `openAlex()` path, which first cleans up any existing audio before starting.

### Files to modify
- `src/contexts/AlexVoiceContext.tsx` — add cleanup event dispatch
- `src/components/alex/AlexConcierge.tsx` — suppress when overlay is open
- `src/components/alex/AlexVoiceMode.tsx` — add mount guard + cleanup on unmount
- `src/components/alex/GlobalAlexOverlay.tsx` — ensure proper cleanup on close

