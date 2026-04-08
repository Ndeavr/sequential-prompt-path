

## Plan: Add Subtle Dark Leather Texture to Background

### What
Add a CSS-based dark leather texture overlay to the existing cinematic background in `MainLayout.tsx`. The texture will be purely CSS (no external images), using layered SVG noise filters tuned to simulate fine-grain leather — subtle, elegant, and consistent with the premium dark aesthetic.

### How

**File: `src/index.css`** — Add a new `.leather-texture` utility class using a `::before` pseudo-element with a custom SVG filter that simulates leather grain:
- Use `feTurbulence` with low `baseFrequency` (~0.65) and high `numOctaves` (5) for a fine, organic grain
- Layer with a second turbulence at different frequency for the characteristic leather "pore" pattern
- Very low opacity (~0.03–0.04) to keep it subtle
- `mix-blend-mode: soft-light` for natural blending with the dark base
- Add a subtle dark vignette gradient overlay to enhance depth

**File: `src/layouts/MainLayout.tsx`** — Add the `leather-texture` class to the existing background `div` (the one with `noise-overlay`), so both the grain noise and leather texture coexist as layered effects.

### Visual Result
- The background retains its dark cinematic base (#060B14) with colored aura gradients
- A very subtle leather-like grain adds tactile depth
- The existing noise overlay remains on top for luxury grain
- No external assets needed — pure CSS/SVG

### Files Changed
1. `src/index.css` — Add `.leather-texture` class (~20 lines)
2. `src/layouts/MainLayout.tsx` — Add class to background div (1 line change)

