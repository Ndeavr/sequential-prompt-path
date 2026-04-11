

# Fix Alex: Remove Popup, Voice-First Launch

## Problems

1. **HelpPopup still active**: `<HelpPopup />` is rendered in `src/app/router.tsx` line 943 — the "Comment on peut vous aider?" popup still appears after 10 seconds.
2. **Alex opens messenger, not voice**: Bottom orb navigates to `/alex` which shows chat/messenger UI. Voice only auto-starts on `/alex/voice` route. User wants voice to start immediately.
3. **Boot checklist visible**: The overlay shows technical boot steps (Ouverture de session, Preparation audio, etc.) — this is debug UI that should be hidden or minimal.

## Plan

### Step 1 — Remove HelpPopup from router

In `src/app/router.tsx`, remove the `<HelpPopup />` component (line 943) and its import (line 3). The file `src/components/shared/HelpPopup.tsx` is kept but no longer rendered.

### Step 2 — Bottom orb navigates to `/alex/voice`

In `src/components/navigation/AlexBottomSheetLauncherUNPRO.tsx`, change `navigate("/alex")` to `navigate("/alex/voice")` so clicking the orb triggers the voice-first experience with auto-start.

### Step 3 — Auto-start voice on `/alex` too

In `src/pages/PageHomeAlexConversationalLite.tsx`, expand the auto-start condition (line 105) from only `/alex/voice` to include `/alex` as well. This way both routes trigger voice automatically.

### Step 4 — Hide boot checklist UI

In `src/components/voice/OverlayAlexVoiceFullScreen.tsx`, replace the verbose boot step checklist (Ouverture de session, Preparation audio, Connexion serveur, etc.) with a simple "Connexion..." label or a minimal loading spinner. No technical steps visible to the user.

### Files Modified

| File | Change |
|------|--------|
| `src/app/router.tsx` | Remove `<HelpPopup />` and import |
| `src/components/navigation/AlexBottomSheetLauncherUNPRO.tsx` | Navigate to `/alex/voice` |
| `src/pages/PageHomeAlexConversationalLite.tsx` | Auto-start voice on `/alex` too |
| `src/components/voice/OverlayAlexVoiceFullScreen.tsx` | Replace boot checklist with minimal loader |

