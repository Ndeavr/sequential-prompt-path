

## Problem

1. **Click sound**: `audioEngine.unlock()` creates an AudioContext on connection, producing an audible click artifact on some devices.
2. **Not French**: `sendUserMessage` sends a visible user message that the agent processes as conversation — unreliable for language forcing.

## Solution

### 1. Remove audioEngine.unlock() from useLiveVoice
No chimes are played anymore, so AudioContext creation is unnecessary. Removes the click artifact.

### 2. Use sendContextualUpdate for French injection
`sendContextualUpdate` injects context without triggering a user-visible message or response. Falls back to `sendUserMessage` if unavailable.

### 3. Remove audioEngine.unlock() from OverlayAlexVoiceFullScreen
Same reason — no chimes needed.

### Files modified
- `src/hooks/useLiveVoice.ts` — removed audioEngine import/unlock, switched to sendContextualUpdate
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx` — removed audioEngine.unlock()
