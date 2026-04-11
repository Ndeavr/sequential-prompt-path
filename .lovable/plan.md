

# Fix: Alex Voice "Connexion" Never Completes

## Root Cause

The boot sequence `useEffect` (line 286) has **`store.machineState`** and **`start`** in its dependency array:

```
[store.isOverlayOpen, store.machineState, buildGreeting, start]
```

During boot, the code transitions the machine state multiple times:
1. `requesting_permission` → `opening_session` → `stabilizing`

Each transition triggers a React re-render. Because `store.machineState` is a dependency, the effect **cleanup runs** — setting `cancelled = true` — and the effect re-evaluates. Since the guard checks `machineState !== "requesting_permission"`, the new run returns early. But the running `boot()` function now has `cancelled = true`.

The `await start()` call (line 242) yields to React's render cycle. When it resumes, `if (cancelled) return;` (line 244) aborts the boot. The critical first-audio timeout and boot timeout timers are **never set**, so:

- If Gemini doesn't immediately speak, there's no timeout to detect it
- The UI stays stuck on "Connexion…" forever
- The boot timeout was also cleared by the cleanup

Additionally, `start` from `useLiveVoice` is recreated every render (depends on `isActive`, `isConnecting`), further destabilizing the effect.

## Fix

### Step 1 — Decouple boot effect from machineState

Use a **ref** to track whether boot has been initiated for the current session. The effect should only depend on `store.isOverlayOpen`. Check `machineState === "requesting_permission"` via `getStore()` inside the function body, not as a reactive dependency.

Remove `store.machineState`, `start`, and `buildGreeting` from the dependency array. Use refs for `start` and `buildGreeting` instead.

### Step 2 — Use refs for start and buildGreeting

Store `start` and `buildGreeting` in refs so the boot effect doesn't re-trigger when these functions are recreated on re-render.

### Step 3 — Keep boot timeout alive

Since the cleanup no longer runs on every machineState change, the boot timeout and first-audio timeout will survive the full boot sequence.

### Files Modified

| File | Change |
|------|--------|
| `src/components/voice/OverlayAlexVoiceFullScreen.tsx` | Fix boot effect dependencies, use refs for `start`/`buildGreeting` |

