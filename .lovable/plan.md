## Goal
Make the visible "UNPRO" glyphs render at the same height as the blue FR/EN toggle (32px ball), and eliminate the dead space around the wordmark in the header.

## Root cause
The wordmark file `unpro-wordmark-chrome.png` has ~30–35% vertical whitespace baked in. So even when the `<img>` is sized to header height, the visible letters look ~half as tall as the FR/EN ball.

## Fix (single file: `src/components/navigation/SmartHeader.tsx`)

1. **Scale the image larger than the header and let it overflow visually**
   - Change logo classes from `h-7 sm:h-8 lg:h-9` → `h-12 sm:h-14 lg:h-16`
   - Add `-my-2` so the oversized image doesn't push header height
   - Keep header height untouched (`h-10 sm:h-12 lg:h-14`)
   - This makes the visible glyph height ≈ 32px on mobile (matches the FR/EN ball).

2. **Reduce blank space around the logo**
   - Remove the left container padding on mobile: `px-1 sm:px-4 lg:px-6` → `px-2 sm:px-4 lg:px-6` is fine, but tighten the logo `<Link>` with `-ml-1` on mobile so the wordmark sits flush-left under the URL bar (matches the user's red underline).
   - Tighten the right-side cluster gap if needed (no change to FR/EN pill itself).

3. **Keep hover glow, drop-shadow, and `w-auto` aspect ratio** — no other behavior change.

## Out of scope
- No change to the FR/EN toggle, QR pill, avatar, or hamburger.
- No change to header background, blur, or border.
- No image asset regeneration (we compensate in CSS, not by re-cropping the PNG).
- No change to non-home variant logic beyond the size scale.

## Verification
- On 384px viewport (current preview): UNPRO glyphs ≈ FR ball height, logo aligns flush-left, no extra vertical padding.
- Desktop: proportional scaling preserved.
- Header total height unchanged → no layout shift elsewhere.
