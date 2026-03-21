

# Fix: Alex Voice STT Restart Loop

## Root Cause

The STT restart loop has three interacting bugs in `useAlexVoiceSession.ts`:

1. **No running guard on STT**: `startSTT()` calls `recognition.start()` without checking if it's already running. The browser throws silently or fires duplicate `onend` events.

2. **`onend` fires too eagerly**: With `continuous: true`, Chrome fires `onend` after ~5-10s of silence, then the 300ms restart timer fires, creating a visible flicker. The `startSTT()` call from `playNext` completion AND the `onend` handler compete, causing double-start attempts.

3. **STT not properly stopped during thinking/speaking**: When `sendUserMessage` calls `r.stop()`, the `onend` handler fires 300ms later and tries to restart STT even though state is now "thinking". The guard `stateRef.current === "listening"` catches most cases but race conditions exist.

## Fix (single file: `src/hooks/useAlexVoiceSession.ts`)

### Change 1: Add `sttRunningRef` guard
- Track whether STT engine is actively running
- `startSTT()`: return early if already running, set flag to true
- `onstart`: set flag to true  
- `onend`: set flag to false
- `onerror`: set flag to false

### Change 2: Debounce STT restart in `onend`
- Increase restart delay from 300ms to 600ms
- Add full guard: check `sttRunningRef` is false, `sessionRef` is true, state is "listening", not playing

### Change 3: Remove duplicate `startSTT()` call from `playNext`
- `playNext` completion sets state to "listening" but does NOT call `startSTT()` directly
- Instead, the `onend` handler or a dedicated `prepareNextListenCycle()` handles restart
- Add `prepareNextListenCycle()` that clears transcript buffer, waits 300ms, then starts STT only if conditions met

### Change 4: Expand state type
- Add `"relistening"` state for the transition between speaking→listening
- `prepareNextListenCycle` sets "relistening" briefly, then "listening" + STT start

### Change 5: Stop STT during audio playback
- In `enqueueAudio` / when first audio chunk starts playing, explicitly stop STT
- Prevents echo/self-hearing

### Change 6: Clean transcript buffer between turns
- `finalTranscriptRef.current = ""` in `prepareNextListenCycle()`
- Clear silence timer

## Technical Implementation

```text
State flow per turn:
  idle → thinking (create-session)
    → speaking (greeting audio)
    → relistening (queue empty, 300ms buffer)
    → listening (STT started)
    → thinking (user speech finalized, sendUserMessage)
    → speaking (audio chunks enqueued)
    → relistening → listening → ... (loop)
```

Key guard logic in `startSTT()`:
```typescript
if (sttRunningRef.current) return;
if (!sessionRef.current) return;
if (isPlayingRef.current) return;
sttRunningRef.current = true;
```

`prepareNextListenCycle()` called from `playNext` when queue is empty:
```typescript
function prepareNextListenCycle() {
  finalTranscriptRef.current = "";
  clearSilenceTimer();
  safeSetState("relistening");
  setTimeout(() => {
    if (sessionRef.current && !isPlayingRef.current) {
      safeSetState("listening");
      startSTT();
    }
  }, 300);
}
```

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useAlexVoiceSession.ts` | Add sttRunningRef, prepareNextListenCycle, expand states, fix guards |

