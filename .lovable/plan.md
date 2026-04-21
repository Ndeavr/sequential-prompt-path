

# Fix Alex Voice Stuck on "Connexion..."

## Problem

Alex connects successfully on first load, but after the session disconnects (after ~5s), subsequent connection attempts hang indefinitely. The ElevenLabs `useConversation` hook calls `startSession()` but `onConnect` never fires, leaving `isConnecting = true` permanently. The orb shows a spinning loader with "Connexion..." forever.

**Root cause**: No connection timeout exists in `useLiveVoice.ts`. When `startSession` silently fails (common after a WebSocket disconnect on mobile), nothing resets the `isConnecting` state.

## Fix

### 1. Add connection timeout to `useLiveVoice.ts`

After calling `conversation.startSession()`, start a 10-second timeout. If `onConnect` hasn't fired by then:
- Set `isConnecting = false`
- Fire `onError` callback with a timeout message
- Log the failure

The timeout is cleared in `onConnect` and `onDisconnect`.

### 2. Add retry-once logic

If the connection times out, allow one automatic retry before giving up. On second failure, show text fallback state instead of spinning forever.

### 3. Add visual timeout feedback in `HeroSection.tsx`

When `isConnecting` has been true for >8s, show a subtle "Réessayer" button below the orb instead of just "Connexion...". Clicking it stops and restarts the voice session.

### 4. Reset hook state on disconnect

In `onDisconnect`, ensure `isConnecting` is also reset (already done, but add a forced cleanup of any pending `startSession` promise via the timeout).

---

## Files Modified

| Action | File |
|---|---|
| Modify | `src/hooks/useLiveVoice.ts` — add 10s connection timeout + retry logic |
| Modify | `src/components/home/HeroSection.tsx` — add retry button after 8s of connecting |

