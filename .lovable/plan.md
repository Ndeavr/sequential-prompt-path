
# Alex Voice Overlay — Stability & Premium Polish

Scope is strictly UI/UX + a small voice-session lock. No changes to ElevenLabs config, prompts, or backend.

## 1. Kill duplicate status text

**`src/components/voice/OverlayAlexVoiceFullScreen.tsx` (floating panel branch, ~lines 722-805)**
- Replace the header subtitle, which today shows `statusText` and can echo the same line as the error banner, with a single subtle state caption derived from machine state only:
  - `listening` / `awaiting_user` / `session_ready` → `Alex écoute…`
  - `processing_stt` / `processing_response` → `Alex réfléchit…`
  - `speaking` → `Alex répond…`
  - `stabilizing` / `opening_session` / `requesting_permission` → `Alex démarre…`
  - any error → suppressed (see §2)
- Remove the inline error banner (`isError && store.errorMessage` block, ~lines 777-782) from the floating variant. The banner that currently renders "Je continue ici avec vous." underneath the greeting bubble is the duplicate the user circled.
- Stop seeding `recoveryNotice` / `errorMessage` with the literal "Je continue ici avec vous." in the two `onDisconnect` / `onError` branches (~lines 308, 348-353). For mid-conversation `error_recoverable` while the overlay is open, call `s.setError(code, null, true)` (or pass an empty string) so no user-visible message is ever rendered while the panel is alive.
- Update `useAlexVoiceLockedStore.setError` (or the overlay's read site) so the floating panel never reads `errorMessage` while the panel is open — fallback is silent, the user only sees the state caption.

**`src/styles/unicorn-theme.css` (~lines 179-189)**
- Remove the `[data-orb-state="error"] .uc-orb-caption::before { content: "Alex est temporairement indisponible." }` rule so the homepage orb can never overlay that amber line while a chat session is active.
- Keep the `thinking` caption rule. Add a guarded variant: when `body[data-alex-overlay-open="true"]`, force `.uc-orb-caption { opacity: 0 !important; }` so no orb caption shows while the overlay is up.

**`src/components/home-unicorn/AlexOrbPremium.tsx`**
- No structural change; the caption rule change in CSS handles it. Drop the misleading JSDoc reference to the unavailable string on `showCaption`.

## 2. Silent voice→text fallback

**`src/components/voice/OverlayAlexVoiceFullScreen.tsx`**
- `onDisconnect` (~line 290) and `onError` (~line 316): keep the TTS-fallback path, but never set a recoverable error with user-visible copy while `store.isOverlayOpen`. If the live socket dies after first audio, silently transition to `awaiting_user` → `listening` instead of `error_recoverable`. Only call `s.setError(...)` (with a non-empty message) when the overlay is being torn down or when both voice and TTS fallback fail.
- `markVoiceUnavailable` in `useAlexVoice.ts` already feeds a notice — gate that store update behind `!useAlexVoiceLockedStore.getState().isOverlayOpen` so the floating panel can't inherit it.

**`src/features/alex/state/alexStore.ts`**
- `markVoiceUnavailable`: stop defaulting `recoveryNotice` to "Je continue ici avec vous." Set it to `null` when no explicit message is passed. Components that read `recoveryNotice` (homepage hero, etc.) will simply not render the banner.

## 3. Session-locked FR voice

**`src/config/alexVoiceConfig.ts` + `src/features/alex/services/elevenlabsService.ts`**
- On first use per tab, resolve the active FR voice ID once and persist it under `sessionStorage["alex_voice_locked_id"]`.
- `elevenlabsService.speak()` reads the locked ID for every TTS call so the fallback greeting and any later TTS use the same voice as the live agent.
- `useLiveVoice` start path: pass the same locked voice ID as an override to the realtime session (only if the live path supports per-session voice; otherwise do nothing — the existing single-voice config already covers it). Add a defensive log when a voice mismatch would have occurred.
- No new env vars, no DB changes.

## 4. Background blur while overlay active

**`src/stores/alexVoiceLockedStore.ts`**
- In `openVoiceSession` / `closeVoiceSession` (and the matching effects in `OverlayAlexVoiceFullScreen.tsx`), toggle `document.body.dataset.alexOverlayOpen = "true" | ""` and a class `alex-overlay-active` on `<html>`.

**`src/styles/unicorn-theme.css`**
- Add a new rule:
  ```css
  html.alex-overlay-active body > #root > * { 
    filter: blur(6px) saturate(0.95);
    transition: filter 280ms cubic-bezier(.22,1,.36,1);
  }
  html.alex-overlay-active .uc-alex-floating-panel,
  html.alex-overlay-active .uc-alex-overlay-backdrop { filter: none; }
  ```
  plus a dim layer `.uc-alex-overlay-backdrop` (`fixed inset-0 z-[9998] bg-slate-950/15 backdrop-blur-md pointer-events-none`).
- Render `.uc-alex-overlay-backdrop` from the floating branch of `OverlayAlexVoiceFullScreen.tsx` as a sibling under `<AnimatePresence>` so it fades in/out with the panel and is gone the instant the overlay closes.

## 5. Floating panel polish

**`src/styles/unicorn-theme.css` (`.uc-alex-floating-panel`, ~lines 191-215)**
- Reduce background opacity from `rgba(10,18,40,0.62)` to `rgba(10,18,40,0.48)` and bump `backdrop-filter` blur to `blur(28px) saturate(170%)`.
- Raise text tokens: change body text color from `#E6EEFF` to `#F2F6FF`; subtitle `.text-white/65` stays but ensure contrast on the lighter background via a darker inner shadow.
- Mobile sizing: `max-width: min(92vw, 480px); left: 50%; transform: translateX(-50%);` and `bottom: calc(96px + env(safe-area-inset-bottom));` (already present — keep) so the panel respects iOS safe area.

**`OverlayAlexVoiceFullScreen.tsx`**
- `handleClose` / `Raccrocher` already calls `stop()` + `closeVoiceSession`. Add a single cleanup batch: clear `heartbeatRef`, `stabilizationTimerRef`, `firstAudioTimerRef`, `nudgeTimerRef`, `slowTokenTimerRef`, and call `elevenlabsService.stop()` so no timers/listeners survive the close.
- Make `X` (close) call the same `handleClose` (it does — verify and keep).

## 6. Orb behavior (Copilot-style)

**`src/components/alex/AlexMorphingOrb.tsx` (+ existing CSS in `unicorn-theme.css`)**
- Confirm 4 visual states map cleanly to `idle | listening | thinking | speaking | error`. Tighten animations:
  - `idle`: slow `uc-breathe` 4.2s — already present, keep.
  - `listening`: pulse rings + 2px vertical translate `uc-orb-listen-bob` 2.4s.
  - `thinking`: conic-gradient ring spin at 5s + subtle hue rotate.
  - `speaking`: scale 1.0→1.04 pulses keyed off `useLiveVoice` `audioLevel` if exposed; otherwise a 0.42s waveform-style breath.
  - `error`: desaturated, very slow breath, no aggressive red — already configured, keep.
- No new dependencies; CSS-only.

## 7. Conversation rules

**`src/services/alexOpeningTemplates.ts`**
- Confirm the homeowner opening matches verbatim: `Bonjour. Je vais vous aider à comprendre votre situation et à trouver le bon professionnel si nécessaire. Que se passe-t-il ?` Update if drift exists.
- Contractor branch (feature includes `contractor` / `pro_` / `entrepreneur`): `Bonjour. Je peux vous aider à activer votre profil UNPRO et à recevoir de meilleurs rendez-vous. Où voulez-vous commencer ?`

**`src/hooks/useAlexSilenceControl.ts` (or current single-prompt manager)**
- Max 2 silence checks per cycle, then full stop — verify against memory `Alex Silence Pause Resume` (already 1 prompt + 1 final). No "êtes-vous toujours là ?" after a final/closing assistant message: gate the silence engine off when the last assistant turn is flagged as terminal (intent in `alexTerminalIntents.ts`).

## Files touched

- `src/styles/unicorn-theme.css`
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx`
- `src/stores/alexVoiceLockedStore.ts`
- `src/features/alex/state/alexStore.ts`
- `src/features/alex/hooks/useAlexVoice.ts`
- `src/features/alex/services/elevenlabsService.ts`
- `src/config/alexVoiceConfig.ts`
- `src/components/home-unicorn/AlexOrbPremium.tsx`
- `src/components/alex/AlexMorphingOrb.tsx`
- `src/services/alexOpeningTemplates.ts`
- `src/hooks/useAlexSilenceControl.ts` (verify only, edit if drift)

## Acceptance

- The amber "Alex est temporairement indisponible." text no longer appears anywhere while the floating panel is open.
- The duplicate "Je continue ici avec vous." banner under the greeting bubble is gone; only the subtle state caption (`Alex écoute…` / `Alex réfléchit…` / `Alex répond…`) shows in the header.
- Voice ID is identical between live session and TTS fallback within the same tab.
- Background behind the floating panel is blurred + dimmed; blur clears immediately on close.
- `Raccrocher` and `X` both end the session, kill all timers, and remove the backdrop in one frame.
- Orb visibly reacts to listening / thinking / speaking; error state is calm, not aggressive.
