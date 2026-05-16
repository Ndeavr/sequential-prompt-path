# Alex UX & Permission System Refactor

## 1. Kill internal wording in greeting

**File:** `src/components/voice/OverlayAlexVoiceFullScreen.tsx` (line ~104)

Current greeting builder injects the route label (`"Accueil UNPRO"`, `"Entrepreneur UNPRO"`) as `${hint}`. Result spoken to users: *"Bonsoir Yanick. Parfait, on regarde votre demande — Accueil UNPRO. Dites-m'en un peu plus."*

**Fix:** Remove the `hint` segment entirely from the greeting builder. New template:
- First visit (with name): `"Bonsoir ${name}. Je vous écoute."`
- First visit (no name): `"Bonsoir. Décrivez-moi votre besoin en quelques mots."`
- Returning: `"Rebonjour ${name}. On continue ?"`

Also stop passing `"Accueil UNPRO"` / `"Entrepreneur UNPRO"` as a user-facing source in `src/components/home-orb/HeroOrbMockup.tsx` (line 51) — keep it only as an internal analytics tag, never spoken.

Audit any other location that interpolates route labels into Alex speech (sweep `openAlex(...)` callsites in 15+ pages — pass `undefined` or an internal-only key).

## 2. Humanize the voice-unavailable fallback

Replace the cold copy across:
- `src/utils/friendlyErrors.ts`
- `src/components/voice/AlexChatFallbackPanel.tsx`
- `src/components/voice/VoiceReliabilityUI.tsx`
- `src/features/alex/state/alexStore.ts`
- `src/features/alex/hooks/useAlexVoice.ts` (handleTTSFailure message)
- `src/features/alex/hooks/useAlexRecoveryWatchdog.ts`
- `src/features/alex/hooks/useAlexBootstrap.ts`

**New copy:** `"Je continue ici avec vous."` (single short line, no "temporairement indisponible").

## 3. Build the Permission Manager

**New file:** `src/lib/permissionManager.ts`

```text
type PermissionKind = "mic" | "camera" | "location" | "notifications"

API:
- getStatus(kind)                  → "granted" | "denied" | "prompt" | "cooldown"
- request(kind, reason)            → Promise<status> with contextual UI copy
- isInCooldown(kind)               → bool
- recordDeny(kind)                 → starts cooldown timer
- onChange(kind, listener)         → reactive subscriptions
```

Cooldowns (persisted in localStorage `unpro.perm.{kind}.deniedAt`):
- mic: 24h
- camera: 7d
- notifications: 14d
- location: session only (sessionStorage)

Persistence layer: localStorage today; later sync to `user_sessions.permissions` jsonb when authed (no migration required for v1 — flag a TODO).

## 4. Make permission requests contextual (remove eager triggers)

### Mic
- Audit `useLiveVoice.ts`, `useAlexAudioCapture.ts`, `OverlayAlexVoiceFullScreen` → confirm `getUserMedia` only runs after explicit orb tap / "Activer la voix". No autostart on mount.
- On denied: immediately switch to text fallback with `"Je continue ici avec vous."` — no retry loop, no popup. Respect 24h cooldown before the orb re-prompts.

### Camera & Image library
- New component `AlexCameraInvitePill` rendered inline in chat ONLY when Alex detects keywords: `moisi|fissure|toit|isolation|dégât d'eau|soumission|facture|inspiration`. Wording: `"Vous pouvez prendre une photo si vous voulez que je regarde."`
- Existing upload buttons keep their current explicit request flow (already contextual).

### Location
- New `requestLocationContextually(reason)` helper. Gated to fire only after `intent_primary` is detected AND user enters matching / estimate phase.
- Prompt: `"Pour trouver les bons professionnels près de chez vous, puis-je utiliser votre position ?"`
- Fallback chain: geolocation → postal code input → city input. Never block the flow.

### Notifications
- Never requested on homepage. Add `requestNotificationsAfterBooking()` gated by post-booking confirmation events. Wording: `"Voulez-vous recevoir les mises à jour de votre demande ?"`

Search & sweep: `navigator.mediaDevices.getUserMedia`, `navigator.geolocation`, `Notification.requestPermission`. Every callsite must route through `permissionManager` and verify the entry condition is user-initiated + contextual.

## 5. Remove repetitive prompts

In `useAlexReEngagement.ts` / `alexReEngagementEngine.ts` (already memorized as 3-attempt cap):
- Hard-limit `"Êtes-vous toujours là?"`-style prompts to **0** automatic occurrences. Switch to silent passive state after first silence window. User can simply tap the orb to resume.
- Verify no permission UI re-renders prompt after cooldown is active.

## 6. Voice pacing & UNPRO pronunciation

- Pacing: confirm `eleven_multilingual_v2` settings stay at the current locked tuning (stability 0.52 etc.) — no slowdown mid-utterance. Remove any `speed` ramp in greeting builders if present.
- UNPRO pronunciation: already handled by `src/lib/prepareAlexSpeechText.ts` (FR → "Un Pro", EN → "Hun Pro"). Sweep all TTS callsites to confirm every `speak(text)` runs through `prepareAlexSpeechText` first. Add the wrapper inside `elevenlabsService.speak()` so it's globally enforced and impossible to bypass.

## 7. Mobile UX

- Orb stays central, chat expands inline. Verify `OverlayAlexVoiceFullScreen` and `AlexHomepageConversation` never `navigate()` to a separate chat route on mobile when the user starts speaking — keep the in-place expansion already wired.

## Technical summary

| Area | Files |
|------|-------|
| Greeting copy | `OverlayAlexVoiceFullScreen.tsx`, `HeroOrbMockup.tsx`, `alexCopy.ts` |
| Fallback copy | `friendlyErrors.ts`, `AlexChatFallbackPanel.tsx`, `VoiceReliabilityUI.tsx`, `alexStore.ts`, `useAlexVoice.ts`, `useAlexRecoveryWatchdog.ts`, `useAlexBootstrap.ts` |
| Permission manager | NEW `src/lib/permissionManager.ts` + unit test |
| Mic gating | `useLiveVoice.ts`, `useAlexAudioCapture.ts` |
| Camera invite | NEW `AlexCameraInvitePill.tsx`, wired in chat renderer |
| Location helper | NEW `src/lib/requestLocationContextually.ts` + callsite refactor |
| Notifications | NEW `src/lib/requestNotificationsAfterBooking.ts` |
| Pronunciation enforcement | `src/services/elevenlabsService.ts` (wrap speak) |
| Re-engagement | `useAlexReEngagement.ts` |

No DB migration in v1 (localStorage only for permission state). Memory file `mem://features/permission-system` will be added to document the cooldown contract.

## Success criteria

- No user ever hears "Accueil UNPRO" or any internal label.
- No permission requested on homepage load. Mic only on orb tap. Camera/location/notifications only after contextual intent.
- Denied permissions never re-prompt during cooldown.
- Voice-unavailable fallback says "Je continue ici avec vous." — nothing else.
- UNPRO always pronounced "un pro" / "hun pro" — enforced at the TTS service layer.
- Alex never repeats "Êtes-vous toujours là ?".
