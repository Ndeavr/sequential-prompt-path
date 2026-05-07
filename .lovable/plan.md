## Hotfix — App unclickable on `/index`

### Root cause (most likely)

The screenshot shows the **onboarding role-selection screen** with a cream voice action bar pinned at the bottom — but the active route is `/index`, which is supposed to render `PageHomeSimple` (cinematic dark hero with Alex orb), not `OnboardingPageUnpro`. Two issues stack:

1. **Stuck voice/chat overlay**: `OverlayAlexVoiceFullScreen` and `AlexChatFallbackPanel` are mounted at app root in `src/app/providers.tsx` at `z-[9999]` and `z-[10000]`. Their internal stores (`alexVoiceLockedStore`, `alexChatFallbackStore`) persist in memory; if a previous session left `isOverlayOpen=true` or `isOpen=true`, every tap on the page below is intercepted by the overlay's invisible/translucent layers.
2. **No emergency exit**: There is no way to clear stuck UI state without rebuilding the bundle.

The role-selection panel itself (`FormRoleSelection`) has no overlay or `pointer-events` traps — buttons are plain `<motion.button>`. So the freeze is caused by something rendered **above** it.

### Fix plan

#### 1. Add safety reset on every page load
In `src/app/providers.tsx` (or a new `src/components/system/EmergencyOverlayReset.tsx` mounted in providers), add a `useEffect` that runs once on mount:
- If `URL` contains `?reset=1` or path is `/emergency-reset`, force-close `useAlexVoiceLockedStore` and `useAlexChatFallbackStore`.
- Add a 2-second hydration watchdog: if the document has not received a `pointerdown` event AND a top-level overlay is open without an active voice session, close it.

#### 2. Hidden `/emergency-reset` route
Add a new route in `src/app/router.tsx` → `PageEmergencyReset.tsx` that:
- Calls `useAlexVoiceLockedStore.getState().closeVoiceSession("emergency_reset")`.
- Calls `useAlexChatFallbackStore.getState().close()`.
- Clears `localStorage` keys matching `^unpro_onboarding_|^alex_|^copilot_`.
- Calls `forceClearAuthSession()` is **not** done (preserves login).
- Redirects to `/` after 300ms with a "Réinitialisation…" message.

#### 3. Defensive guards on overlay mounts
In both `OverlayAlexVoiceFullScreen.tsx` and `AlexChatFallbackPanel.tsx`:
- When the outer `motion.div` (`fixed inset-0`) renders but no real session is active (`machineState === "idle"` and no `sessionIdRef.current`), set `pointer-events-none` on the backdrop so taps fall through to the page below.
- Already handled by early `if (!store.isOverlayOpen) return null;` — but verify both stores reset properly across HMR / rollback by clearing their state on `window` `pageshow` (bfcache).

#### 4. Onboarding loop failsafe
In `OnboardingPageUnpro.tsx`:
- The `useEffect` that resumes step has no fallback for the case `existingRole == null && profile == null` after auth load → user lands on step 0 with no way out. Add a "Retour à l'accueil" link in the role page header so users are never trapped.

#### 5. Clarify why `/index` shows onboarding
Verify whether some recent `UniversalRouteGuard` or session restore is redirecting `/` → `/onboarding`. If so, ensure `/` always reaches `PageHomeSimple` regardless of onboarding state (homepage is public).

### Files to change

- **New**: `src/pages/PageEmergencyReset.tsx`
- **New**: `src/components/system/OverlayHydrationGuard.tsx` (mounts in providers, runs the watchdog)
- **Edit**: `src/app/providers.tsx` (mount `OverlayHydrationGuard`)
- **Edit**: `src/app/router.tsx` (register `/emergency-reset`)
- **Edit**: `src/components/voice/OverlayAlexVoiceFullScreen.tsx` (bfcache reset)
- **Edit**: `src/components/voice/AlexChatFallbackPanel.tsx` (bfcache reset + null-guard already present)
- **Edit**: `src/components/onboarding/FormRoleSelection.tsx` (add "← Retour à l'accueil" link)
- **Edit**: `src/guards/UniversalRouteGuard.tsx` (verify `/` is never redirected to `/onboarding`)

### Success criteria

- Visiting `/index` always renders the homepage (Alex orb + chat), never the onboarding role screen.
- Visiting `/emergency-reset` clears all overlay state and returns to `/`.
- Stuck voice/chat overlays from a previous session are auto-cleared after 2s if no session is active.
- Role-selection page always shows a "Retour à l'accueil" escape link.
- Mobile taps work everywhere.

### Notes

This is a non-destructive hotfix: no existing business logic, auth, Supabase migrations, or styling are touched. Pure overlay-state hygiene + escape hatches.