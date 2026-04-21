

# Fix Alex Voice Not Starting

## Problem

After an initial session connects and disconnects, Alex cannot restart because multiple guards block it:

1. **`sessionStorage` flag** (`alex_home_autostart_done`) permanently blocks autostart for the tab session
2. **`alexRuntime.autostartTriggered`** flag stays `true` after first autostart, blocking all future attempts
3. **5-second reconnect cooldown** in `useLiveVoice.ts` silently blocks manual taps after disconnect
4. **`alexRuntime` lock state** may not be fully released, causing `acquireLock()` to return false on manual tap

These guards were designed to prevent duplicate sessions but collectively make Alex unreachable after the first session ends.

## Fix

### 1. Fix `useLiveVoice.ts` -- Remove aggressive cooldown for manual starts

The 5-second `RECONNECT_COOLDOWN_MS` blocks legitimate user taps. Change: only apply cooldown for automatic reconnects, not for explicit user-initiated starts. Add a `force` parameter to `start()` that bypasses cooldown and resets retry count.

### 2. Fix `useAlexHomeAutostart.ts` -- Clear stale session flag on disconnect

Remove the `sessionStorage` flag approach entirely. Instead, rely only on `alexRuntime.autostartTriggered` which resets when the page navigates away. Also add a `document.visibilitychange` listener so Alex can re-autostart when the user returns to the tab (if no session ran yet on this page load).

### 3. Fix `HeroSection.tsx` -- Ensure orb tap always works

Update `startVoice()` to call `alexRuntime.hardReset()` before acquiring lock when the runtime is in `ended` state. This clears stale lock/session state. Pass `force: true` to `start()` on manual taps.

### 4. Fix `alexRuntimeSingleton.ts` -- Add `clearForRestart()` method

Add a lightweight method that resets `sessionStatus` to `idle` and clears stale flags without a full hard reset (which dispatches cleanup events). This ensures the lock can be re-acquired cleanly.

---

## Files Modified

| Action | File |
|---|---|
| Modify | `src/hooks/useLiveVoice.ts` -- add `force` param to `start()`, skip cooldown when forced |
| Modify | `src/hooks/useAlexHomeAutostart.ts` -- remove sessionStorage guard, simplify autostart |
| Modify | `src/components/home/HeroSection.tsx` -- reset runtime state before manual start, force start |
| Modify | `src/services/alexRuntimeSingleton.ts` -- add `clearForRestart()` method |

