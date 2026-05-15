## AlexMorphingOrb v2 — Living AI Presence

Upgrade the existing `AlexMorphingOrb` so it reads as a translucent, breathing intelligence — not a button, bubble, icon, or gradient dot.

### Diagnosis of current orb
- Hard outer ring + sphere look = reads as "button"
- Single rotating rim = mechanical
- Two plasma blobs only = limited motion vocabulary
- No depth parallax, no chromatic aberration, no nebula
- High opacity = looks solid, not translucent

### Visual upgrade — layered presence (still no canvas/WebGL)

```text
button (no border, no bg, no focus ring chrome)
├─ atmosphere    SVG turbulence + feGaussianBlur, 30% larger than orb
├─ nebula        radial cloud (cyan/violet) drifting + counter-rotating
├─ aura halo     soft radial bloom, breathing
├─ caustics ring conic-gradient shimmer, very low opacity, slow drift
├─ core sphere   translucent (75% alpha) radial — deep blue interior
├─ plasma A      morphing blob, blur 14px, mix-blend-screen
├─ plasma B      counter-morph, hue-shifted violet
├─ plasma C      small darting blob (adds life), random offset
├─ chromatic     thin red/cyan offset rings (mix-blend-screen) for AI feel
├─ specular      soft top-left highlight, drifts slightly with breath
├─ inner stars   3-4 tiny white dots flickering (translucent depth)
└─ ripple        on tap only
```

### Key changes from v1
1. **Remove button chrome** — strip rounded button background; the orb IS the surface. Keep accessible `<button>` but no visible borders/rings/focus chrome (use ring on focus-visible only, offset far out).
2. **Lower opacity everywhere** — sphere alpha 0.7, plasma 0.55, no hard inset shadow ring → feels translucent, not glossy plastic.
3. **SVG turbulence atmosphere** — small inline SVG `<filter feTurbulence baseFrequency="0.012" + feDisplacementMap>` applied to the nebula layer for organic, never-repeating distortion. Cheap on mobile (one filter, animated `seed`).
4. **3 plasma blobs + drift** — independent timings (7s / 9s / 5s), independent translate paths so silhouette never settles.
5. **Chromatic aberration** — two thin offset rings at +1px / -1px in red and cyan, 8% opacity, mix-blend-screen → subtle "AI hologram" feel.
6. **Inner stars / particles** — 3 absolutely-positioned 2px dots with staggered opacity keyframes, gives sense of depth inside the sphere.
7. **Breath-coupled scale on multiple layers** — halo, sphere, and specular breathe at slightly different phases for parallax.
8. **State-driven SVG turbulence frequency** — listening = higher frequency (more agitated), thinking = slower drift, speaking = vertical pulse on plasma A only.
9. **No outer hard rim** — replace conic ring with a *masked caustics shimmer* (very low alpha) so the silhouette feels gaseous, not bordered.
10. **Idle micro-drift** — whole orb translates ±2px on a 9s loop so it never feels pinned.

### State map (refined)
| State | Atmosphere | Plasma | Halo | Extras |
|---|---|---|---|---|
| idle | slow drift, freq 0.010 | gentle morph 7s | breath 4.5s | stars flicker 6s |
| listening | freq 0.020, agitated | morph 3s, +6% scale | brighter, breath 1.6s | chromatic +50% |
| thinking | freq 0.008, slow swirl | rotate slowly | violet hue shift | extra inner shimmer ring |
| speaking | freq 0.014 | vertical pulse 0.6s on A | breath 0.7s | mouth-shaped bottom blob deformation |
| error | freq 0.005, desaturated | frozen | dim, no breath | grayscale 60% |

### Reusable component
- File: `src/components/alex/AlexMorphingOrb.tsx` (replace v1, same exports — `AlexOrbStateV2`, `AlexOrbSize`, default export)
- No prop API change → all 3 callsites (HeroOrbMockup, AlexCompanionOrb, features/alex/AlexOrb) keep working
- Inline `<style>` block + inline `<svg>` filter — zero new files, zero new deps
- `prefers-reduced-motion`: kill SVG animation + plasma morph; keep static gradient + soft halo
- `will-change: transform, opacity` only on animated layers (mobile perf)
- Pointer-events: only on the button itself; all visual layers `pointer-events-none`

### Out of scope
- Voice pipeline, transcript, store wiring (already correct)
- Companion orb position, hero layout
- Sound effects (forbidden by Sonic Identity memory)

### Tasks
1. Rewrite `AlexMorphingOrb.tsx` with layered structure above + inline SVG turbulence filter
2. Strip all button-like chrome (background, border, ring) from the root
3. Add 3rd plasma blob, chromatic offset rings, inner stars, idle micro-drift
4. State-conditional turbulence baseFrequency + plasma timings
5. Verify on 384px mobile preview — orb reads as living presence at sm/md/lg
