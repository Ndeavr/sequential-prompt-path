## Two small UI fixes

### 1. Alex orb — perfect centering in the bottom dock
File: `src/components/home-unicorn/BottomDockGlass.tsx`

The orb uses `absolute left-1/2 -translate-x-1/2` on the `mx-3` wrapper, but the inner grid has `px-2` padding which can shift the visual center of the middle cell slightly. Also the "Alex" label below sits in its own grid cell which is independently centered.

Fix:
- Anchor the orb to the actual middle grid cell (column 3) using a relative wrapper around that cell instead of absolute-positioning on the outer container, OR remove the `px-2` from the grid so the inner geometry matches `left-1/2` exactly.
- Ensure the "Alex" label is centered directly under the orb (same x-axis).

Result: orb perfectly vertically aligned over the "Alex" label and horizontally centered on screen.

### 2. Card — show whole content (no clipping)
File: `src/components/home-unicorn/NearbyContractorsCarousel.tsx`

Current issues visible in the screenshot:
- The `AIPP · Près de vous` badge is positioned `-top-2` but the wrapper has `overflow-hidden` → badge is partially clipped at the top.
- The avatar overlaps the badge area because there's no top padding reserved for the badge.
- Card sits very close to the buttons above with no breathing room.

Fix:
- Remove `overflow-hidden` from the card wrapper (no inner element bleeds; safe to remove).
- Move the AIPP badge to sit cleanly above the card edge with `-top-2.5` and add `pt-4` to the card so the avatar/name never collide with the badge.
- Add `mt-5` (instead of `mt-4`) on the carousel wrapper to give the badge room from the CTAs above.
- Keep the dots + footer caption visible (no change).

Result: badge fully visible, avatar/name/stats not clipped, card breathes properly between the CTA row and the bottom dock.

### Out of scope
No logic, data, role-menu, or routing changes. Pure visual/layout fixes in the two files above.
