
# UNPRO — Cinematic Design System Unification

Goal: collapse UNPRO's mixed visual styles into ONE disciplined language inspired by Searchable. No new features, no business logic. Pure design-system layer so every page inherits the same rhythm automatically.

## 1. Scope

Touch only foundation files — every page picks up the upgrade for free:
- `src/index.css` (tokens, background stack, glass, motion vars, type scale)
- `tailwind.config.ts` (radii, font, easing, shadows)
- `src/lib/motion.ts` (timing curves, stagger, hover lift)
- `src/layouts/MainLayout.tsx` (background stack layers)
- `src/components/unpro/CardGlass.tsx` (new glass recipe)
- `src/components/ui/button.tsx` (primary CTA variant)
- `src/components/alex/AlexCompanionOrb.tsx` + `OrbAlexPrimaryEntry.tsx` (breathing orb refinement)

No new pages, no new routes, no DB, no edge functions.

## 2. Design tokens (the contract)

### Typography
- Single family: **Inter** (variable). Drop secondary display fonts.
- Hero: `clamp(52px, 8vw, 108px)`, weight 600, tracking `-0.04em`, line-height `0.95`
- H1/H2 inherit same tracking scale (`-0.03em` / `-0.02em`)
- Body: 16–18px, weight 400, tracking `-0.01em`, line-height 1.55
- Subtitle: 18–22px, weight 400, muted foreground

### Color / surfaces
- Base: `#050816` (replaces current `#060B14`)
- Glass surface: `rgba(255,255,255,0.04)` + `1px solid rgba(255,255,255,0.06)`
- Inset highlight: `inset 0 1px 0 rgba(255,255,255,0.05)`
- Elevated shadow: `0 4px 30px rgba(0,0,0,0.35)`

### Radii (strict)
- Cards: 28px (`--radius-card`)
- Buttons: 18px (`--radius-button`)
- Pills/chips: 999px (`--radius-pill`)
- Inputs: 14px

### Motion
- Master easing: `cubic-bezier(.22,1,.36,1)`
- Master duration: 420ms
- Page enter: opacity 0 + translateY(12px) → 0, 600ms, 80ms stagger
- Hover: `translateY(-2px)` only (kill `scale-105` patterns)

## 3. Background stack (global)

Replace the single radial gradient in `MainLayout` with a 4-layer stack:
1. Base `#050816`
2. Radial glow top-left: `rgba(0,132,255,.22) → transparent 40%`
3. Radial glow bottom-right: `rgba(0,255,255,.10) → transparent 45%`
4. Noise overlay (existing `noise-overlay` class) at opacity 0.02, `mix-blend-overlay`

All four become CSS variables so dark public pages and the warm landing theme stay isolated (per Core memory: `landing-warm` not affected).

## 4. Glass card recipe

`CardGlass` becomes the single source. Update its base classes to the new recipe (bg/border/shadow above). All other ad-hoc glass styling across the app already routes through this component or the `.glass-card` utility in `index.css`, so updating both propagates everywhere.

## 5. Button system

Add a `premium` variant (and make it the default for primary CTAs):
- `linear-gradient(180deg, #0A84FF, #0066FF)`
- `box-shadow: 0 10px 40px rgba(0,132,255,0.25)`
- Weight 600, radius 18px
- Hover: `translateY(-1px) + brightness(1.05)`
- Active: `translateY(0)`

No change to `variant` API — additive only.

## 6. Alex orb refinement

Tighten existing orb components to the cinematic spec:
- Idle breathing: `scale 1 → 1.03`, 4s ease-in-out (slower than current 2s)
- Halo: keep conic spin but slow to 18s
- Replace `whileHover scale 1.1` with `scale 1.04`
- Listening/Speaking states stay event-driven (per memory: no auto-start changes)

## 7. Motion library

In `src/lib/motion.ts`:
- Replace current `EASE_PREMIUM` with exact `[0.22, 1, 0.36, 1]` (already matches — verify)
- Set `transitions.default` to 420ms
- Add `staggerChildren: 0.08` as default for `staggerContainer`
- Replace `hoverLift` to use `translateY(-2px)` only (no scale)

## 8. What's NOT in scope

- No content/copy changes
- No layout restructure of any page
- No changes to Alex behavior, voice, sessions
- No public/warm landing theme changes (`.landing-warm` preserved)
- No changes to logo, header height, or recently-tuned chrome
- No new dependencies

## 9. Verification

After implementation:
- Visual check on `/` (home), `/alex`, a contractor profile, a dashboard page
- Confirm no regressions in `landing-warm` public pages
- Confirm header logo + language bubble alignment unchanged
- Confirm orb still tap-to-start (no autostart regression)

## Technical notes

- All colors in `index.css` stay HSL per design rules; the hex values above are converted at write time.
- Tokens go through Tailwind config so components keep using semantic classes (`bg-card`, `text-foreground`, `rounded-card`, etc.) — no per-component color edits.
- The 4-layer background is implemented as fixed pseudo-elements on `body` (or kept in `MainLayout` as today) so it doesn't repaint on route change → enables the cinematic "single continuous surface" feel.

```text
┌─────────────────────────────────────┐
│ Layer 4: noise (0.02, overlay)      │
│ Layer 3: cyan glow bottom-right     │
│ Layer 2: blue glow top-left         │
│ Layer 1: #050816 base               │
└─────────────────────────────────────┘
        ↑ fixed, behind all routes
```

Ready to implement on approval.
