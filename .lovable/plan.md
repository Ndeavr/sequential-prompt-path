## AlexMorphingOrb — Premium Living AI Orb

Replace the current flat/static Alex orb with a reusable, state-aware morphing orb that feels alive (Copilot-energy, original to UNPRO).

### 1. New component
`src/components/alex/AlexMorphingOrb.tsx`

Props:
```ts
type Props = {
  state?: "idle" | "listening" | "thinking" | "speaking" | "error";
  size?: "sm" | "md" | "lg";  // 48 / 96 / 160 px
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}
```

Layered structure (no canvas, mobile-perf safe):
```text
<button>
  ├─ aura halo        (radial-gradient + blur, breathes)
  ├─ outer rim        (conic-gradient rotating slowly)
  ├─ glass sphere     (radial-gradient blue→cyan→violet, inset highlight)
  ├─ plasma blob A    (mix-blend-screen, morphs border-radius)
  ├─ plasma blob B    (mix-blend-screen, counter-rotates)
  ├─ inner light      (top-left specular highlight)
  └─ ripple layer     (on click → animate scale+fade)
</button>
```

Tech:
- Tailwind + Framer Motion
- CSS variables driven by `state`: `--orb-glow`, `--orb-speed`, `--orb-scale`, `--orb-hue-shift`
- Morphing via animated `border-radius` (e.g. `60% 40% 55% 45% / 50% 60% 40% 50%`) on plasma blobs
- Keyframes in `src/styles/alex-orb.css` (breath, swirl, rim-rotate, ripple)
- `prefers-reduced-motion`: disable morph + rim rotation, keep static gradient + soft glow

### 2. State visuals
| State | Behavior |
|---|---|
| idle | Slow breath (4s), soft halo, gentle morph |
| listening | +8% scale, brighter rim, faster rotating gradient (2s), cyan boost |
| thinking | Inner swirl shimmer, slower breath (5s), violet shift |
| speaking | Rhythmic morph 0.6s loop, mouth-like vertical pulse on inner blob |
| error | Desaturated blue/gray, halo dimmed, no rotation |

### 3. Replace current usages
Swap the flat orb in:
- `src/components/home-orb/HeroOrbMockup.tsx` → use `size="lg"` centered
- `src/components/alex/AlexCompanionOrb.tsx` → use `size="sm"` floating bottom-right (keep `bottom-20` on mobile so it sits above MobileBottomNav)
- `src/features/alex/AlexOrb.tsx` → re-export wrapper mapping `useAlexStore.mode` → orb `state` (booting/connecting → idle, speaking → speaking, listening → listening, thinking/waiting → thinking, error → error)

Tap behavior unchanged: starts Alex on the same page (no route change). Live transcript already handled by `AlexInlineTranscript` — no change here.

### 4. Mobile placement
- Companion orb: `fixed bottom-24 right-4` (clears `MobileBottomNav` ~80px) on `<md`, `bottom-5 right-5` on `≥md`
- Hero orb: centered, size `lg` (160px) with extended halo (240px)

### 5. Constraints
- No canvas / WebGL
- Only HSL semantic tokens (`--primary`, `--accent`) + a few orb-specific vars in `index.css`
- No new deps (framer-motion already in project)
- Keep `AlexCompanionOrb` lazy-loaded path intact

### 6. Tasks
1. Add orb keyframes + CSS vars to `src/styles/alex-orb.css` (imported from `index.css`)
2. Build `AlexMorphingOrb.tsx` with layered divs + Framer Motion ripple
3. Refactor `AlexOrb.tsx` to render `AlexMorphingOrb` mapped from store mode
4. Update `AlexCompanionOrb.tsx` to use new orb (sm) + mobile-safe positioning
5. Update `HeroOrbMockup.tsx` to use new orb (lg)
6. Add reduced-motion fallback
7. Verify on 384px viewport (current preview) — orb visible above bottom nav, no layout shift

### Out of scope
- Voice pipeline, transcript logic, Alex brain, routing — untouched.
