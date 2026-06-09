# Alex Orb V2 — Copilot-style + Floating Glass Panel

Two coordinated changes, scoped to the homepage Alex experience (hero orb + bottom dock orb). The locked voice runtime, recovery engine, session machine and ElevenLabs pipeline stay untouched — only the **visual orb** and the **overlay shell** change.

---

## Part 1 — Living Orb (Copilot-grade)

**File:** `src/components/home-unicorn/AlexOrbPremium.tsx` (extend, do not replace)

Add state-driven CSS-only animations on top of the existing 5 visual states (`idle | listening | thinking | speaking | processing`), plus an `error` mapping.

| State | Behavior |
|---|---|
| Idle | Vertical float 6px (`uc-orb-float` 5.5s ease-in-out), breathing scale 0.98↔1.04 (already), inner glow pulse |
| Hover/focus | Scale 1.08, halo opacity +0.15, glass tooltip "Parler à Alex" fades in (desktop hover, mobile after 1.5s idle on first visit) |
| Listening | Existing pulse rings kept; intensity raised; hue shift to cyan `#22D3EE` |
| Speaking | Add ring waveform (6 bars in a circle, `uc-orb-wave` 0.9s) |
| Thinking | Slow rotation 12s + particle shimmer boost + caption "Alex réfléchit…" under orb |
| Error | Reduce glow to 30%, stop rings, caption "Alex est temporairement indisponible." (no infinite pulse) |

**New keyframes** in `src/styles/unicorn-theme.css`:
- `uc-orb-float` (translateY 0 ↔ -6px, 5.5s)
- `uc-orb-wave` (scaleY bars)
- `uc-orb-shimmer` (particle opacity)
- Wrap all new animations in `@media (prefers-reduced-motion: reduce) { * { animation: none !important } }` scoped to `[data-orb-state]`.

**New props** on `AlexOrbPremium`:
- `showLabel?: boolean` (renders glass "Parler à Alex" pill below orb)
- `showCaption?: boolean` (renders state caption: thinking/error)
- `interactive?: boolean` (enables float + hover scale)

**Hero usage** (`src/pages/PageHomeUnicorn.tsx` `HeroAlexOrb`): pass `interactive showLabel showCaption`.
**Dock usage** (`BottomDockGlass.tsx`): keep small 44px orb but adopt the same float+breathe and a tiny glow pulse synced with the same `machineState` — so the dock orb visibly mirrors the hero orb. No label on dock.

---

## Part 2 — Floating Glass Conversation Panel (replaces full-screen takeover for homepage entries)

Goal: when user taps the orb, the page stays visible; a compact glass panel appears anchored near the orb and streams Alex/user messages live.

**New file:** `src/components/voice/OverlayAlexFloatingPanel.tsx`

Reuses the **same** `useAlexVoiceLockedStore`, `useLiveVoice`, recovery and session machinery as `OverlayAlexVoiceFullScreen` — extracted into a small shared hook `useAlexVoiceSession()` (split from the existing overlay's body) so we don't fork the voice runtime.

**Visual:**
- Fixed position. Desktop: `bottom-24 right-6`, max-width 420px. Mobile: `bottom-[88px] left-4 right-4` (above the dock, never covers it).
- Glass: `rgba(10,18,40,0.55)` + `backdrop-blur(22px) saturate(160%)`, border `rgba(255,255,255,0.14)`, radius 24px, soft cyan glow shadow.
- Header row: tiny orb mirror (32px `AlexOrbPremium reactive`), state label ("Je vous écoute…" / "Alex réfléchit…" / "Alex parle…"), expand icon, close (×) icon.
- Body: last 4 messages, alex left / user right, small premium bubbles, auto-scroll, max-height ~240px.
- Footer: typed input fallback (always available); mic indicator (live partial transcript shown inline above input while user speaks).

**Behavior:**
- Click outside → collapse panel (does NOT end voice session); orb keeps pulsing if still listening.
- × button → collapse only.
- "Voir conversation" link or expand icon → opens existing `OverlayAlexVoiceFullScreen` (kept for power use, accessibility, contractor/condo flows that already depend on it).
- After Alex's final answer + 1 follow-up with no user input → auto-collapse (per existing reengagement control memory: 3 attempts max already enforced; we cap to 1 here for the floating panel).

**Routing the two overlays:**
`AlexVoiceContext.openAlex(feature, hint)` learns a new `mode: "floating" | "fullscreen"` (default `floating` for `home_*` features, `fullscreen` for contractor/condo onboarding, signature, recruitment).
- Render `<OverlayAlexFloatingPanel />` when `mode === "floating"`.
- Render existing `<OverlayAlexVoiceFullScreen />` when `mode === "fullscreen"` or when user taps Expand.

---

## Out of scope (explicitly)
- No changes to ElevenLabs config, voice IDs, prompt, session state machine, recovery engine, or `useLiveVoice`.
- No changes to backend, edge functions, DB, or system prompt.
- Full-screen overlay file is **kept as-is** (still used by contractor/condo/signature flows and as the Expand target).

## Technical details
- Shared session hook: move the side-effect bodies (heartbeat, stabilization timer, first-audio timer, slow-token timer, lockRuntime/unlockRuntime, greeting trigger, transcript bridging) from `OverlayAlexVoiceFullScreen` into `src/hooks/useAlexVoiceSession.ts`. The fullscreen overlay re-renders identically by consuming the hook. The floating panel consumes the same hook → guaranteed parity, zero runtime fork.
- `data-orb-state` already present on the orb root; CSS hooks attach via `[data-orb-state="thinking"] .uc-orb-caption::before { content: "Alex réfléchit…" }` etc.
- All new animations: GPU-friendly (transform/opacity only), `will-change: transform`, total cost < 1% CPU on mid-range mobile.
- Respect `prefers-reduced-motion: reduce` — orb stays static at idle preset; panel uses instant fade.

## Files touched
- Edit: `src/components/home-unicorn/AlexOrbPremium.tsx`
- Edit: `src/styles/unicorn-theme.css`
- Edit: `src/pages/PageHomeUnicorn.tsx` (pass new props)
- Edit: `src/components/home-unicorn/BottomDockGlass.tsx` (sync small orb to machineState)
- Edit: `src/contexts/AlexVoiceContext.tsx` (add `mode`)
- Edit: `src/components/voice/OverlayAlexVoiceFullScreen.tsx` (consume shared hook)
- New: `src/hooks/useAlexVoiceSession.ts`
- New: `src/components/voice/OverlayAlexFloatingPanel.tsx`
- Edit: `src/app/providers.tsx` (mount the floating panel alongside the fullscreen one)
