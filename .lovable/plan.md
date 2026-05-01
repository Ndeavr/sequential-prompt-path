# UNPRO Motion & Sound Design System — Premium Vault

Goal: a single, performant motion + sound layer that gives every UNPRO action the feel of a smart vault — analyse, vérifie, verrouille, déverrouille, confirme. Extends what already exists (`src/lib/motion.ts`, `src/services/audioEngineUNPRO.ts`, `AlexOrb`, `CardGlass`); does not duplicate.

## What already exists (reused, not rebuilt)

- `src/lib/motion.ts` — has `transitions`, `fadeUp`, `revealCard`, `scaleIn`, `staggerContainer`, `hoverLift`. We extend it with new tokens + presets.
- `src/services/audioEngineUNPRO.ts` + `src/hooks/useAudioEngine.ts` — Web Audio synth singleton with priority, mute, focus mode, mobile unlock. We add new sound names and map them to existing/new oscillator patterns.
- `src/components/alex/AlexOrb.tsx` — already 13-state premium orb with reduced-motion + visibility pause. We add `routing` state + sound hooks, do not rewrite.
- `src/components/unpro/CardGlass.tsx` — existing premium card; we add a `vault` variant.

## 1 — Motion tokens (extend `src/lib/motion.ts`)

Add (no breaking changes):

```text
durations:  instant 120 | fast 180 | normal 320 | reveal 650 | cinematic 1200
easings:
  mechanicalSnap = [0.7, 0, 0.2, 1]      // crisp, like a bolt locking
  softVaultOpen  = [0.16, 1, 0.3, 1]     // already EASE_SPRING — alias it
  alexPulse      = [0.45, 0, 0.55, 1]
  cardReveal     = [0.22, 1, 0.36, 1]    // already EASE_PREMIUM — alias it
intensity:  subtle | standard | cinematic   (multiplier 0.6 / 1 / 1.4)
```

New presets exported from `motion.ts`:
- `vaultLock`, `vaultOpen`, `scanSweep`, `criteriaTick`, `pressMechanical`, `successGlow`, `errorShake`.

## 2 — Sound system (extend `audioEngineUNPRO.ts`)

Add new `SoundEvent` values mapped to the existing oscillator engine — no new files, no MP3 downloads (keeps bundle small):

```text
soft-click       → 1 short sine 660Hz, 40ms
criteria-click   → 2 ticks 880/988Hz, 30ms each
vault-clack      → low square 180Hz 60ms + sine 880Hz 40ms (mechanical)
match-success    → triad C5→E5→G5 (reuse playSuccess pattern, brighter)
scan-start       → rising sweep 400→1200Hz, 220ms
alex-listening   → reuse listening
alex-thinking    → reuse thinking
payment-success  → vault-clack + triad
error-soft       → reuse error
```

New `useUnproSound()` hook (`src/hooks/useUnproSound.ts`) — thin wrapper over `useAudioEngine`:
- Default volume 0.18 (override existing 0.35 default in `audioEngineUNPRO.ts`).
- Honours `prefers-reduced-motion` (also mutes sounds when set, configurable).
- Auto-disables on mobile when `AudioContext.state === 'suspended'` after first attempt fails.
- Exposes typed methods: `softClick()`, `criteriaClick()`, `vaultClack()`, `matchSuccess()`, `scanStart()`, `alexListening()`, `alexThinking()`, `paymentSuccess()`, `errorSoft()`.

Settings UI: extend existing audio prefs panel (currently in `useAudioEngine`) with toggles "Réduire animations" and "Sons interface" — both persisted to `localStorage`.

## 3 — Reusable animated components (new)

All under `src/components/motion/`:

| Component | Built on | States |
|---|---|---|
| `MotionButton` | `<button>` + framer | idle / pressing / loading / success / error |
| `VaultButton` | `MotionButton` | idle → scanning → locked → opening → success (+ sound) |
| `MatchButton` | `MotionButton` | idle → matching → matched (double clack) |
| `AnimatedProCard` | `CardGlass` | idle → scan border → verified-lock → score reveal |
| `AnimatedPassportCard` | `CardGlass` | locked → scan → unlock |
| `AIPPScoreDial` | SVG arc + framer | scan → reveal digits |
| `VerifiedBadgeLock` | SVG | locked → unlocking → verified |
| `AlexOrbMotion` | wraps existing `AlexOrb` | adds sound hooks + `routing` state |
| `CriteriaWheel` | SVG ticks | adjusting → snap → match |
| `VaultReveal` | clip-path | closed → opening → open (used for result reveals) |
| `PageTransitionVault` | wraps Outlet | uses existing `PremiumReveal` + scan line |
| `MatchSuccessOverlay` | full-screen lite | double-wheel converging → match card |
| `SecureCheckoutMotion` | wraps Stripe block | scan → processing → vault open → activated |

All components:
- Accept `intensity` prop (subtle/standard/cinematic).
- Auto-skip animation when `useReducedMotion()` true.
- Lazy-load heavy variants (`MatchSuccessOverlay`, `VaultReveal`, `CriteriaWheel`) via `React.lazy`.

## 4 — Universal interaction state machine

Add `src/lib/interactionStates.ts`:

```text
type InteractionState = 'idle'|'scanning'|'adjusting'|'locked'|'opening'|'success'|'error'
useInteractionState() → { state, set, run(asyncFn) }
  run():
    set('scanning') → await fn → set('opening') → set('success') (1.2s) → set('idle')
    catch → set('error') (1.4s) → set('idle')
```

`VaultButton`/`MatchButton`/`SecureCheckoutMotion` consume this hook so the vocabulary is identical everywhere.

## 5 — CTA system upgrade

Single rule applied via `MotionButton`: every primary CTA gets
- 1px glowing border (`box-shadow: 0 0 0 1px hsl(var(--primary)/0.4), 0 0 24px -4px hsl(var(--primary)/0.4)`)
- mechanical press (`scale 0.97`, `mechanicalSnap`)
- mini scan bar during loading
- `softClick()` on press, `vaultClack()` on confirmed action, `matchSuccess()` on success state
- unlock micro-animation (key icon morphs to check)

We migrate ONLY the most-touched CTAs (audit pass): Hero CTAs on `/`, `/plomb-eau`, `/prix`, `/verification`, `/dashboard`, checkout submit, booking confirm. Other buttons keep existing styles (no big-bang refactor).

## 6 — AlexOrb upgrade (no rewrite)

`src/components/alex/AlexOrb.tsx`:
- Add `routing` state to `PALETTE` + a horizontal scan-line overlay (single `motion.div` translateX).
- Sounds wired in `AlexOrbMotion` wrapper (not in core orb): `idle→listening` plays `alex-listening`, `→thinking` plays `alex-thinking`, `→success` plays `match-success`, `→error` plays `error-soft`.

## 7 — Matching animation

New `src/components/motion/MatchingDoubleWheel.tsx`:
- Two `CriteriaWheel` SVGs (left = homeowner, right = contractor).
- Criteria items tick in (`criteria-click`) at 180ms intervals.
- On compatibility: both wheels snap into alignment → `vault-clack` × 2 → `VaultReveal` opens to show recommended pro card or booking confirmation.
- Used on: matching results page, contractor recommendation reveal, post-Alex handoff screen.

## 8 — Page integration map

Apply only at meaningful moments (no app-wide noise):

| Page | Treatment |
|---|---|
| `/` (PageHomeSimple) | Hero CTA → `VaultButton`; `AlexOrb` already premium |
| Onboarding propriétaire / entrepreneur | Step transitions via `PageTransitionVault`; "Continuer" = `VaultButton` |
| Alex chat | `AlexOrbMotion` wrapper; sounds on state changes |
| Passeport Maison | `AnimatedPassportCard`; unlock animation when score loads |
| Analyse de soumission | `SecureCheckoutMotion` pattern for upload→analyse→reveal |
| Vérifier un entrepreneur | `VerifiedBadgeLock` reveal |
| Résultats matching | `MatchingDoubleWheel` + `MatchSuccessOverlay` |
| `/prix` | `VaultButton` on plan select |
| Checkout Stripe | `SecureCheckoutMotion` wrap |
| Dashboard admin | `PageTransitionVault` only — no sounds (focus mode auto-on for `/admin/*`) |
| Agent control tower | scan animations on rule execution rows |

## 9 — Performance guardrails

- `framer-motion` only inside the `motion/` components; pure CSS keyframes (Tailwind) for every other simple interaction (already configured in tailwind animations).
- Lazy-load: `MatchSuccessOverlay`, `MatchingDoubleWheel`, `VaultReveal`, `CriteriaWheel`, `SecureCheckoutMotion` via `React.lazy` + Suspense.
- Sounds: still synthesised via Web Audio (no preload bytes).
- Add `useDevicePerformanceMode()` (`navigator.connection?.effectiveType ∈ {'2g','3g'} || deviceMemory<4 || hardwareConcurrency<4`) → sets `<html class="low-power">`. CSS class disables blur filters, conic gradients, and ripple loops in `AlexOrb` and orb-like components.
- Pause animations when `document.hidden` (already done in `AlexOrb`; apply same hook everywhere via shared `useVisibilityPause()`).

## 10 — Accessibility

- `useReducedMotion()` honoured in every new component (skip transforms, keep opacity fades).
- Two user toggles (header settings menu): "Réduire animations" + "Sons interface" → persisted in `localStorage` keys `unpro_motion_pref`, `unpro_audio_prefs` (already used).
- All new buttons keep visible `focus-visible:ring-2 ring-primary/60`.
- Every animated state also exposes a textual/ARIA equivalent: `aria-live="polite"` regions announce "Vérifié", "Match trouvé", "Paiement confirmé". Animations and sounds never carry information alone.

## 11 — Files

Created (~14):
- `src/hooks/useUnproSound.ts`
- `src/hooks/useReducedMotionPref.ts`
- `src/hooks/useDevicePerformanceMode.ts`
- `src/hooks/useVisibilityPause.ts`
- `src/hooks/useInteractionState.ts`
- `src/lib/interactionStates.ts`
- `src/components/motion/MotionButton.tsx`
- `src/components/motion/VaultButton.tsx`
- `src/components/motion/MatchButton.tsx`
- `src/components/motion/AnimatedProCard.tsx`
- `src/components/motion/AnimatedPassportCard.tsx`
- `src/components/motion/AIPPScoreDial.tsx`
- `src/components/motion/VerifiedBadgeLock.tsx`
- `src/components/motion/AlexOrbMotion.tsx`
- `src/components/motion/CriteriaWheel.tsx`
- `src/components/motion/VaultReveal.tsx`
- `src/components/motion/PageTransitionVault.tsx`
- `src/components/motion/MatchSuccessOverlay.tsx`
- `src/components/motion/MatchingDoubleWheel.tsx`
- `src/components/motion/SecureCheckoutMotion.tsx`
- `src/components/motion/index.ts`

Edited (~6):
- `src/lib/motion.ts` (new tokens, easings, presets)
- `src/services/audioEngineUNPRO.ts` (new SoundEvents, default volume 0.18)
- `src/components/alex/AlexOrb.tsx` (`routing` state + scan line)
- `src/index.css` or `tailwind.config.ts` (`.low-power` overrides, scan keyframes)
- `src/components/home-simple/HeroAlexCentered.tsx` (use `VaultButton`)
- One settings panel (motion + sound toggles)

Memory file:
- `mem://design/motion-sound-system` — tokens, easings, sound-event names, when to use which component.

## 12 — Out of scope (this pass)
- Replacing every existing button/card across the app (we touch only the highest-value flows; the rest can adopt `MotionButton`/`CardGlass` opportunistically).
- New sound assets (everything stays Web Audio synthesised).
- Backend changes.

## 13 — Success criteria
- Tap any primary CTA → mechanical press + soft-click + (if vault) clack on confirm.
- Match flow renders the double-wheel + clack + vault reveal.
- Checkout success plays vault-clack + triad and shows unlock animation.
- `AlexOrb` gains a `routing` state with horizontal scan.
- `prefers-reduced-motion` and "Sons interface = off" fully disable both layers.
- No measurable regression on First Paint (heavy components are lazy).
