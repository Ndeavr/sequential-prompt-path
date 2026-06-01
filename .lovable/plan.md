## Problem
On mobile (384px) the homepage top bar shows 4 pills (FR ▾, Bell, QR, Profile P) crammed against the right edge — they overflow past the viewport and the hamburger is hidden behind `hidden md:flex`. So on mobile there's no menu at all, and the visible icons are non-functional / clipped.

## Fix (UI only — single file, `src/pages/PageHomeUnicorn.tsx`, `HeaderFloatingGlass`)

1. **Show hamburger on mobile**: change the `SheetTrigger` button class from `hidden md:flex` → `flex` (visible at every breakpoint).
2. **Declutter mobile top bar**: wrap the FR pill, Bell, QR, and Profile-P buttons in a `hidden md:flex` group so on mobile only `[UNPRO logo] … [Hamburger]` is shown. Desktop unchanged.
3. **Move the same actions into the Sheet menu** so they remain reachable on mobile: add entries for Langue (FR), Notifications, Mon QR Code (already there), Profil (already there). No new components, just additional `<Link>`/`<button>` rows inside the existing `<nav>`.
4. Keep all existing colors, glass tokens, radii, gradients, animations untouched. No design system changes.

## Out of scope
No changes to routes, bottom nav, orb, hero, or any other page. No business logic. Purely presentation in one component.