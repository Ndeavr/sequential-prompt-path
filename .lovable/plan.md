

# Alex V5 — Critical Boot Recovery

## Problem

Two separate Alex systems run simultaneously on the homepage, both failing:

1. **HeroSection voice orb** (old system) — calls `voice-get-signed-url` edge function, which hangs or times out. User sees "Connexion..." indefinitely.
2. **Alex 100M floating panel** (new system) — renders bottom-right but the old system dominates the UX and creates confusion.

The `voice-get-signed-url` edge function call appears to hang (logs show "Fetching signed URL..." with no response). The 10-second timeout + retry means users wait 20+ seconds before any fallback. Meanwhile the floating Alex 100M panel may render but is overshadowed.

## Root Causes

1. **Edge function `voice-get-signed-url` is not responding** — likely a missing `ELEVENLABS_API_KEY` or `ELEVENLABS_AGENT_ID` secret, or the `voice_configs` table has no active row
2. **No instant text fallback in HeroSection** — when voice fails, the hero just shows "Connexion..." with no greeting text, no input, no quick actions
3. **Two competing Alex UIs** — the floating Alex 100M panel and the hero orb both try to be "Alex"
4. **Autostart fires voice-only path** — `useAlexHomeAutostart` triggers `startVoice()` which requires mic + edge function + WebSocket — all blocking

## Fix Strategy

Make the **HeroSection** (the Alex the user sees) work in text-first mode. Keep voice as enhancement. Remove the conflicting floating Alex 100M panel from the homepage since HeroSection IS the primary Alex surface.

### 1. Remove Alex 100M floating panel from Home page

**File: `src/pages/Home.tsx`**
- Remove `AlexProvider` and `AlexAssistant` imports and wrappers
- The HeroSection orb IS Alex on the homepage — no need for a second floating panel

### 2. Add instant text fallback to HeroSection

**File: `src/components/home/HeroSection.tsx`**
- Show greeting text ("Bonjour. Quel est votre projet?") immediately on mount, before any voice attempt
- Show quick action buttons (Problème, Projet, Avis) that work without voice
- Add a text input sheet trigger that's always visible ("Écrire à Alex")
- If voice fails or hangs >3s, show "Touchez l'orb pour démarrer la voix" instead of "Connexion..."
- Reduce autostart delay from 1500ms to 500ms
- Add a 5s hard timeout on `voice-get-signed-url` call — if it hangs, immediately show text fallback state

### 3. Fix autostart to not block on voice

**File: `src/hooks/useAlexHomeAutostart.ts`**
- Reduce `AUTOSTART_DELAY_MS` from 1500ms to 600ms
- If autostart triggers but voice fails within 5s, show text mode with greeting visible

### 4. Add voice failure resilience to useLiveVoice

**File: `src/hooks/useLiveVoice.ts`**
- Reduce `CONNECTION_TIMEOUT_MS` from 10s to 5s
- On first timeout, don't retry automatically — just call `onError` so HeroSection can show text fallback
- Add an `AbortController` to the `supabase.functions.invoke` call so it can be cancelled

### 5. Verify edge function secrets

- Check if `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` secrets are configured
- If not, this is why voice never connects — must be set for voice to work

## Files Modified

| Action | File |
|---|---|
| Modify | `src/pages/Home.tsx` — remove AlexProvider/AlexAssistant wrapper |
| Modify | `src/components/home/HeroSection.tsx` — add instant greeting text, text input always visible, voice failure fallback |
| Modify | `src/hooks/useAlexHomeAutostart.ts` — reduce delay |
| Modify | `src/hooks/useLiveVoice.ts` — reduce timeout, no auto-retry |
| Verify | Edge function secrets (ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID) |

## Expected Result

On page load within 1 second:
- Greeting text visible: "Bonjour. Quel est votre projet?"
- Intent pills visible (Problème, Projet, Avis)
- "Écrire à Alex" button always visible
- Orb pulsing and tappable
- Voice attempts in background — if it works, Alex speaks; if not, text mode is already live

