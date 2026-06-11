
## Fix flickering of `IntelligenceBackground` on `/index` (mobile + desktop)

Keep the premium look. Remove the patterns that force full-viewport repaints on Android Chrome / iOS Safari and that re-render whenever Alex's voice/chat state changes.

### Root causes (confirmed by reading the code)

1. **Animated huge blurred blobs.** `LayerFloatingDataOrbs` renders 4 divs sized 440–620 px with `filter: blur(110px)` (85 px on mobile) and animates `transform` + `scale` via `ub-orb-drift-*`. Moving a blurred surface that is larger than the mobile viewport forces a full-screen repaint every frame → visible flicker.
2. **Opacity animations on full-page overlays.** `ub-blueprint-drift`, `ub-archive-drift`, `ub-breath`, `ub-neural-glow` all animate `opacity` (not just transform) on absolutely-positioned full-size layers.
3. **`PassportArchiveDrift`** blurs cards with `filter: blur(40px)` and animates both transform *and* opacity → second source of moving-blur flicker behind the PIM band.
4. **High-frequency SVG opacity / dashoffset animations.** `HousingKnowledgeGraph`, `NeuralHomeIntelligenceField`, `FooterConstellation` apply per-element `ub-twinkle` (opacity) and `ub-draw` (stroke-dashoffset) on dozens of nodes/links → continuous compositor invalidation.
5. **`BlueprintOverlay`** in `CinematicArchScenes` runs `uc-blueprint-drift 24s` that animates both transform *and* opacity.
6. **Re-mount on parent state changes.** `PageHomeUnicorn` mounts `<IntelligenceBackground variant="hero" />` (and 3 other instances) directly in a tree that re-renders whenever Alex voice / chat / orb state updates. The component is not memoized, so every render rebuilds the 6 layer subtrees (and their `useMemo` arrays in `LayerDotIntelligenceField` survive, but the SVG/DOM is re-diffed and `style={{ animation: ... }}` re-applied → restart flashes).
7. **Stacked full-screen `backdrop-filter` panels.** Multiple `.uc-glass*` layers + animated blur orbs compound paint cost on mobile.

### Fix plan — surgical, visual identity preserved

#### A. `src/components/visual/intelligence-bg/LayerFloatingDataOrbs.tsx`
- Keep the orbs (color + position + blur) — they are the premium glow.
- **Desktop (≥ 768 px):** keep the existing `ub-orb-drift-*` transform animation, but slow it (≥ 60 s) and remove the `scale()` component (scale on a blurred layer is the worst case). Translate only, ≤ 4 % range.
- **Mobile (< 768 px):** disable the transform animation entirely (orbs stay static), keep blur + color + opacity. Implemented via a `.ub-orb` `@media (max-width: 767px) { animation: none; }` rule in `intelligence-bg.css`.
- Remove the per-orb inline `animation` string and move it onto class names (`ub-orb-1 … ub-orb-4`) so React never re-applies the inline style on re-render.

#### B. `src/components/visual/intelligence-bg/intelligence-bg.css`
- Rewrite the offending keyframes to be **transform-only** with **stable opacity**:
  - `ub-orb-drift-1..6`: keep `translate3d`, drop `scale`.
  - `ub-breath`: remove `opacity` change, keep a tiny `scale(1 → 1.04)`.
  - `ub-neural-glow`: same — transform only, fixed opacity.
  - `ub-blueprint-drift`: transform only, fixed opacity 0.09.
  - `ub-archive-drift`: transform only, fixed opacity 0.08.
  - `ub-twinkle`: replace with a much slower (12 s) opacity range of 0.45 → 0.55 (barely visible delta) **or** drop entirely on mobile via `@media`.
- Add a global mobile guard: under `@media (max-width: 767px)` disable `ub-mesh-shift`, `ub-blueprint-drift`, `ub-archive-drift`, `ub-orb-drift-*`, keep only `ub-neural-glow` and `ub-twinkle` at reduced amplitude.
- Add `will-change: transform` (already on `.ub-orb`/`.ub-neural-glow`) and `transform: translateZ(0)` on `.ub-blueprint` to promote to its own layer (avoids invalidating siblings).

#### C. `src/components/visual/intelligence-bg/IntelligenceBackground.tsx`
- Wrap the component in `React.memo` so parent (Alex state) re-renders do not re-diff the entire background subtree.
- Same for each `Layer*` and overlay component (`React.memo` default export) — they take no props that change.

#### D. `src/components/visual/intelligence-bg/overlays/HousingKnowledgeGraph.tsx`
- Keep the graph visual. Remove the per-line `ub-draw` animation (stroke-dashoffset on 40+ lines is the heaviest cost). Render the lines fully drawn (static).
- Reduce `ub-twinkle` to **5 nodes max**, picked deterministically, with a 10 s cycle. Other nodes stay static at fixed opacity.
- Memoize the component.

#### E. `src/components/visual/intelligence-bg/overlays/NeuralHomeIntelligenceField.tsx` + `FooterConstellation.tsx`
- Drop per-element opacity animation (`ub-twinkle`) on mobile; keep on desktop only via a `.ub-anim-desktop-only` class gated by media query.
- Keep the central halo but with the new transform-only `ub-breath`.

#### F. `src/components/visual/intelligence-bg/overlays/PassportArchiveDrift.tsx`
- Replace `filter: blur(40px)` cards with static SVG-mask soft shapes (no blur filter) or keep blur but set animation to `none` on mobile and to transform-only/stable-opacity on desktop.

#### G. `src/components/home-unicorn/BlueprintOverlay.tsx`
- Change inline `animation: "uc-blueprint-drift 24s …"` to a CSS class (so it isn't re-applied on every React render). Animation itself already becomes transform-only via fix (B).

#### H. `src/pages/PageHomeUnicorn.tsx`
- Extract the four `<IntelligenceBackground variant="…" />` calls into a memoized sibling (e.g. `<HomeIntelligenceBackdrops />` wrapped in `React.memo`) mounted once, so Alex voice/chat state never causes them to re-render.
- No layout/visual change, no removed variants.

#### I. Z-index / layering audit
- Ensure single stacking: `IntelligenceBackground` z=0, `CinematicArchScenes` z=1, content z=10, `BottomDockGlass` z=40, Alex orb z=50. Remove redundant `position: fixed` from any layer that doesn't need it (only `fixed=false` variant is used on home → already absolute, good).
- Do not stack two `backdrop-filter` panels over the orbs simultaneously.

### Out of scope (do not touch)
- Alex orb visuals (`AlexOrbPremium`) — keep its existing animations.
- Floating Alex panel positioning (already fixed in previous turn).
- Any business logic, routing, content, copy, or non-background components.
- Hero, capabilities strip, quick actions, PIM band, contractor split, footer copy.

### Files touched
- `src/components/visual/intelligence-bg/intelligence-bg.css`
- `src/components/visual/intelligence-bg/IntelligenceBackground.tsx`
- `src/components/visual/intelligence-bg/LayerFloatingDataOrbs.tsx`
- `src/components/visual/intelligence-bg/LayerNeuralGlow.tsx`
- `src/components/visual/intelligence-bg/LayerHouseBlueprintGhost.tsx`
- `src/components/visual/intelligence-bg/overlays/HousingKnowledgeGraph.tsx`
- `src/components/visual/intelligence-bg/overlays/NeuralHomeIntelligenceField.tsx`
- `src/components/visual/intelligence-bg/overlays/PassportArchiveDrift.tsx`
- `src/components/visual/intelligence-bg/overlays/FooterConstellation.tsx`
- `src/components/home-unicorn/BlueprintOverlay.tsx`
- `src/pages/PageHomeUnicorn.tsx` (memoized backdrops wrapper only)

### Verification
- Reload `/index` on the current 384 px viewport — confirm background still shows orbs, blueprint ghost, dot field, knowledge graph; no flickering during idle scroll.
- Tap Alex orb → open voice → speak → close. Background must not flash or restart animations.
- Toggle Alex chat fullscreen overlay and back — background remains stable underneath.
- Desktop ≥ 1024 px: confirm orbs still drift subtly (translate only), blueprint still breathes.
- `prefers-reduced-motion`: all animations still stop (existing guard preserved).
