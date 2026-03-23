

## Plan: Show FR/EN + Theme Toggles on Mobile Header

**Problem**: The language and theme toggles are wrapped in `hidden sm:flex`, hiding them on screens below 640px. On mobile (384px), they only appear inside the burger menu overlay — not directly visible in the header.

**Solution**: Move the toggles out of the `hidden sm:flex` wrapper so they're always visible in the header bar, even on mobile.

### Changes

**File: `src/components/navigation/SmartHeader.tsx`**

1. Remove the `hidden sm:flex` wrapper around `LanguageToggle` and `ThemeToggle` (lines 158-161)
2. Place them directly in the right actions `div` (line 153) so they're always visible
3. Keep them compact — they already fit (72px + 32px = ~104px total)
4. Optionally hide the QR share button on mobile to free space, or keep layout tight

This ensures the toggles are visible at all times without opening the menu.

