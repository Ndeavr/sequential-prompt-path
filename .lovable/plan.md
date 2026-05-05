## Problem
After tightening the mask + adding a 55% top dark gradient, the trade images are barely visible (only a thin band at the bottom shows). The CTA pill also got partially covered by the bottom nav.

## Fix — `src/components/home-simple/AlexTradesAura.tsx`

**1. Relax the mask** so the image fills the orb area, not just a sliver:
- From: `radial-gradient(ellipse 70% 55% at 50% 75%, black 50%, transparent 88%)`
- To: `radial-gradient(ellipse 95% 80% at 50% 60%, black 65%, transparent 100%)`

**2. Soften the top gradient** so the title stays readable but the image is visible behind the orb:
- Reduce height from `55%` to `35%`
- Use `from-background/95 via-background/50 to-transparent` (lighter mid-stop)

**3. Restore opacity** to `0.72` (between original 0.78 and current 0.65) — readable images, no competition with orb glow.

**4. Lighten edge vignette** so corners don't crush the visible action zone:
- From: `transparent 50%, hsl(var(--background)/0.7) 92%`
- To: `transparent 65%, hsl(var(--background)/0.55) 100%`

## Out of scope
No changes to images, orb, layout, title, or rotation logic.
