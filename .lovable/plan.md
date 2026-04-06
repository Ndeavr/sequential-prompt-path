

# Logo Enhancement: Metallic Grey with Inset Reflection & Drop Shadow

## What
Reduce the logo 10% more (43px → 39px), and apply a CSS filter + styling to make the white parts appear as shiny metallic grey — with an inset light reflection and drop shadow, matching the premium "liquid metal" aesthetic of the Connexion button.

## Steps

1. **Reduce logo size** in `SmartHeader.tsx` — change height from `43` to `39`.

2. **Add CSS class `.logo-metal`** in `src/index.css` with:
   - `filter: brightness(0.72) contrast(1.1)` — turns white into metallic grey
   - `drop-shadow(0 4px 12px hsl(222 90% 55% / 0.3))` — ombre portée (blue-tinted)
   - A `::after` pseudo-element for the inset light sweep reflection (same animation as `btn-liquid-metal::before`)
   - Transparent background preserved (no bg added)

3. **Apply the class** to the `<img>` tag in `SmartHeader.tsx`.

## Technical Details

- The CSS filter approach preserves transparency while shifting white → metallic grey
- The inset reflet uses the same `light-sweep-cta` keyframe animation already defined
- Drop shadow uses `filter: drop-shadow()` which respects PNG alpha, unlike `box-shadow`
- The logo wrapper gets `position: relative; overflow: hidden` for the pseudo-element sweep

