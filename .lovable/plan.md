## Scope

Two small visual fixes on the homepage (`PageHomeUnicorn`, mounted at `/` and `/index`) and the shared mobile dock (`BottomDockGlass`). No business logic changes.

## 1. Missing top header on scroll

**Symptom:** Screenshot 1 shows the contractor section of the home with no UNPRO header visible. Screenshot 2 (top of page) shows the header. Root cause: `HeaderFloatingGlass` in `src/pages/PageHomeUnicorn.tsx` is rendered as a non-sticky `<header>` and scrolls out of view.

**Fix:** Make the header sticky at the top of the viewport so the brand mark + nav controls stay visible while scrolling.

- In `src/pages/PageHomeUnicorn.tsx` → `HeaderFloatingGlass`:
  - Wrap/replace the outer `<header>` with `sticky top-0 z-30` and preserve the glass background (the floating pill chips stay visually identical).
  - Keep `pt-4 pb-2` so the floating pill keeps its breathing room, and ensure the sticky element has a transparent backdrop (the page already has the ambient blue gradient behind).
  - Verify no parent in `PageHomeUnicorn` sets `overflow-hidden` on the scroll container that would defeat sticky. If it does, move sticky to the topmost scrolling wrapper instead.

## 2. Alex orb not centered in bottom dock

**Symptom:** In screenshot 1 the floating Alex orb sits visually left of the "Alex" label, not over it.

**Root cause:** In `src/components/home-unicorn/BottomDockGlass.tsx` the dock uses `grid grid-cols-5` and the center cell positions the orb with `absolute left-1/2 -translate-x-1/2 -top-7`. The `relative` center cell is correct, but the surrounding `Tab` components apply `flex-1` (a flex hint that grid ignores) and the cell renders `pt-2 pb-1` which shifts its inline content baseline — combined with browser rounding on a 384px viewport this can offset the orb optically by a few pixels and, in some renders, by half a cell.

**Fix:** Anchor the orb to the dock container (not the cell) and force exact horizontal centering relative to the dock itself, independent of grid cell rounding.

- In `BottomDockGlass.tsx`:
  - Remove `absolute left-1/2 -translate-x-1/2 -top-7` from the orb button.
  - Move the orb button OUT of the center grid cell and render it as a sibling positioned against the dock wrapper: `absolute left-1/2 -translate-x-1/2 -top-7` on a wrapper that is a direct child of the `relative` `grid` container (the grid already wraps in a `relative` div).
  - Keep the center cell as a label-only slot containing only the placeholder spacer and the "Alex" text, so the label stays under the orb but doesn't influence orb X position.
  - Result: the orb is anchored to the dock's exact horizontal midpoint regardless of how the 5 grid cells round.

## Out of scope

- No changes to navigation config, routes, role detection, or `MobileBottomNav` (the other dock variant).
- No copy or color changes; pure layout fixes.

## Success criteria

- Scrolling the home page keeps the UNPRO header pill visible at the top.
- The Alex orb sits exactly above the "Alex" label and exactly centered between the two left and two right tabs at 360px, 384px, 414px viewport widths.
- No regression on desktop (dock is `lg:hidden`, header pill already responsive).
