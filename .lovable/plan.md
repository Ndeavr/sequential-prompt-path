## Goal
Eliminate flicker (background flash, orb blink, glass repaint, route-change re-init) while preserving every existing layer: cinematic background, noise, gradient auras, glass cards, orbs, SVG overlays.

## Root causes identified
1. `MainLayout` declares the 4-layer background inline → it remounts on route changes (layout is rendered per page).
2. Many components stack `backdrop-filter` on top of each other (page bg + section + glass-card + orb halo), which iOS/Safari repaints on every scroll/animation tick.
3. Several animations target `filter`, `box-shadow`, or `backdrop-filter` (heavy repaints).
4. No `contain` / `isolation` boundaries → animated layers invalidate sibling layers.
5. Orbs use `whileHover` boxShadow transitions → triggers compositor reset.
6. Decorative layers don't carry `pointer-events:none` consistently and lack `prefers-reduced-motion` fallback.

## Plan

### 1. Global anti-flicker utilities (`src/index.css`)
Add a new `@layer utilities` block with:
- `.gpu-stable` → `transform: translateZ(0); backface-visibility: hidden; -webkit-backface-visibility: hidden; will-change: transform, opacity;`
- `.no-flicker-layer` → `contain: layout paint style; isolation: isolate; transform: translateZ(0);`
- `.stable-transform` → `will-change: transform; transform: translateZ(0);`
- `.decorative-layer` → `pointer-events: none; user-select: none;` + gpu-stable
- `@media (prefers-reduced-motion: reduce)` → freeze keyframes on decorative layers (animation-play-state: paused, opacity locked), keep layers visible.

### 2. Stable background shell (new files)
Create `src/components/system/background/`:
- `StableBackgroundLayer.tsx` — `React.memo`, fixed inset-0, `-z-50`, hosts the 4 sub-layers, `no-flicker-layer`.
- `NoiseLayer.tsx` — memoized, static SVG noise, no animation.
- `GradientAuraLayer.tsx` — memoized; replace any animated `background-position` with two pseudo-elements animating only `opacity` + `transform: translate3d`. No filter/blur animation.
- `AlexOrbLayer.tsx` — wrapper that mounts the global Alex orb once at root; decorative aura split from interactive button (aura = `pointer-events:none`, button stays clickable).
- `PageShell.tsx` — slot for `<ContentLayer>` only; background mounted above the router so route changes never unmount it.

Mount order in `src/app/App.tsx` (above `<AppRouter />`):
```
<StableBackgroundLayer />   // fixed, decorative, memoized
<AppRouter />               // ContentLayer per route
<AlexOrbLayer />            // fixed, memoized, mounted once
```
Remove the inline background `<div className="fixed inset-0 -z-10 noise-overlay">…</div>` block from `src/layouts/MainLayout.tsx` (and equivalents in `ContractorLayout`, `DashboardLayout`, `home-unicorn/CinematicArchScenes` usage where it duplicates) — they become pass-throughs that only render `<main>`.

### 3. Glass stabilization (`src/index.css`, `src/styles/unicorn-theme.css`)
- Audit `.glass-card`, `.glass-card-elevated`, `.glass-strong`, unicorn `.glass-*` classes.
- Ensure each has an **opaque-ish fallback** `background-color` (e.g. `hsl(var(--card) / 0.85)`) behind the translucent rgba so Safari doesn't flash transparent during repaint.
- Add `transform: translateZ(0); isolation: isolate; contain: paint;` to every backdrop-filter class.
- Hover states: remove `backdrop-filter` changes on `:hover` (keep blur constant, only animate `transform` + `box-shadow` via pre-rendered shadow swap, not transition on `backdrop-filter`).
- Replace any `transition: backdrop-filter` / `transition: filter` / `transition: box-shadow` on large surfaces with `transition: transform, opacity`.

### 4. Orb & floating layers
- `OrbAlexPrimaryEntry.tsx`, `AlexNavOrb.tsx`, `WidgetRevealPulseRing.tsx`, unicorn orbs: keep visuals but
  - drop `whileHover={{ boxShadow: ... }}` → pre-bake the hover shadow as a sibling `::after` whose opacity animates.
  - constrain animations to `transform` + `opacity`.
  - add `gpu-stable` + `decorative-layer` to aura/halo rings (pointer-events none).
  - wrap interactive button in its own stacking context (`isolation: isolate`) so aura animations don't invalidate sibling glass cards.

### 5. Animated background fixes
- Search for `background-position` keyframes / `animate-pulse-soft` on full-screen gradients → convert to dual-pseudo-element opacity crossfade (already the pattern in `CinematicArchScenes`; apply same pattern to `MainLayout` aura and unicorn theme aura).
- Lock all `filter:` values; never animate them. Where `blur()` exists in keyframes, freeze blur and animate `opacity` instead.

### 6. React stability
- `React.memo` every new background subcomponent; `useMemo` for inline style objects that currently allocate per render (the radial-gradient style strings in `MainLayout`, `FlywheelSection`, `OrbAlexPrimaryEntry`).
- Ensure no parent passes a changing `key` to background layers.
- `CinematicArchScenes` interval: keep but guard against double-mount in StrictMode with a ref; ensure component is only mounted from `StableBackgroundLayer`, not per-page.
- Remove any conditional remount of background based on route (current `MainLayout` is rendered per-route — moving to `App.tsx` fixes this).

### 7. Reduced motion
Global rule in `index.css`:
```css
@media (prefers-reduced-motion: reduce) {
  .decorative-layer, .gpu-stable, [data-decor] {
    animation: none !important;
    transition: none !important;
  }
}
```
Layers stay visible; only motion stops.

### 8. Verification
After build, drive Playwright (Chromium, viewport 384×705 to match user) across:
- `/` (home), `/entrepreneur`, `/proprietaire`, `/alex`, `/admin/operations`, a contractor profile.
For each: screenshot at load, scroll halfway, screenshot, trigger route change to another page, screenshot back — confirm no background remount (use a `data-mounted-at` timestamp attribute on `StableBackgroundLayer` and assert it doesn't change between routes).
Also load `?prefers-reduced-motion` emulation and confirm layers still visible.

## Files touched
- `src/index.css` — add utilities, reduced-motion rule, stabilize glass classes.
- `src/styles/unicorn-theme.css` — stabilize glass + orb.
- `src/styles/alex-overlays.css` — same audit.
- `src/app/App.tsx` — mount StableBackgroundLayer + AlexOrbLayer once.
- `src/layouts/MainLayout.tsx`, `ContractorLayout.tsx`, `DashboardLayout.tsx` — remove duplicated background divs.
- New: `src/components/system/background/{StableBackgroundLayer,NoiseLayer,GradientAuraLayer,AlexOrbLayer,PageShell}.tsx`.
- `src/components/intent-pages/OrbAlexPrimaryEntry.tsx`, `src/components/navigation/AlexNavOrb.tsx`, `src/components/score-reveal/WidgetRevealPulseRing.tsx`, `src/components/home-unicorn/CinematicArchScenes.tsx` — animation property cleanup + pointer-events on aura.
- `src/components/flywheel/FlywheelSection.tsx` — memoize gradient style objects.

## Non-goals
- No design simplification, no layer removal, no token/color changes, no business logic.
- Alex behavior, voice config, routing, and data flows untouched.
