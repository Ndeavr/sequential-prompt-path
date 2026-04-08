

## Plan: Footer Text, Remove Duplicate Alex Orb, Fix Tooltip Overlay

### 3 Issues from Screenshots

1. **Footer**: Change "Fabriqué au Québec 🍁" to "Made in Québec ⚜️ with ❤️" (blue fleur-de-lys symbol for Québec, red heart)
2. **Duplicate Alex orb on mobile**: The `AlexConcierge` floating orb (bottom-right) overlaps with the Alex center tab in `MobileBottomNav`. Hide the concierge orb on mobile viewports (`lg:hidden` → only show on desktop).
3. **"Besoin d'aide" tooltip**: The permanent tooltip covers content underneath. Make it auto-dismiss after ~5 seconds instead of staying forever.

### Changes

**1. `src/components/navigation/SmartFooter.tsx`** (~line 77-79)
- Replace `"Fabriqué au Québec 🍁"` with `"Made in Québec ⚜️ with ❤️"`
- EN version: `"Made in Québec ⚜️ with ❤️"`
- Show on all screens (remove `hidden sm:inline` restriction)

**2. `src/components/alex/AlexConcierge.tsx`** (~line 227-266)
- Add `hidden lg:block` to the floating orb button so it only appears on desktop (mobile already has Alex in bottom nav)
- Make the "Besoin d'aide" tooltip auto-hide after 5 seconds using an `AnimatePresence` exit triggered by a timeout state

### Files Changed
1. `src/components/navigation/SmartFooter.tsx` — Update footer text (1 line)
2. `src/components/alex/AlexConcierge.tsx` — Hide orb on mobile, auto-dismiss tooltip (small changes in orb section)

