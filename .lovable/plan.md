

# Replace UNPRO Logo

## What
Replace the current logo asset with the new uploaded logo (blue house icon with "UNPRO" text on white/transparent background).

## Steps

1. **Copy the new logo** from `user-uploads://LOGO-large-white1.png` to `src/assets/unpro-logo.png`, overwriting the existing file.

2. **Verify the header component** (`src/components/navigation/SmartHeader.tsx`) — it already imports from `@/assets/unpro-logo.png`, so no code changes should be needed. The existing 48px height constraint in CSS will apply automatically.

3. **Also update the public favicon/OG logo** at `public/unpro-logo.png` if it exists, so the favicon and meta tags stay consistent.

## Technical Notes
- Single asset swap, no component changes expected
- The dark theme means white text in the logo will be visible; the blue icon will render well on dark backgrounds

