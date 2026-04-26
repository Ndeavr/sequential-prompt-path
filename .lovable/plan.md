# URGENT FIX — Restore Mobile Header on Home

## Root cause

The new `PageHomeCopilot` (mounted at `/` and `/index` via `HomeWithFeatureFlag`) renders **without `MainLayout`**. Every other page in the app opts into `MainLayout`, which is what mounts:

- `SmartHeader` (logo + FR/EN + QR + hamburger + back button)
- `DrawerNavigationMobileIntent` (the full mobile drawer)
- `MobileBottomNav` (with centered Alex orb)
- `AlexConcierge`, `CommandPalette`, footers, SEO injector

That's why the entire mobile top header disappeared on `unpro.ca`.

The `SmartHeader` and `DrawerNavigationMobileIntent` components are **already correct** — they already render exactly what the spec requires:
- Hamburger toggles to X when drawer is open (`SmartHeader.tsx` line 237)
- FR/EN pill always visible on mobile (line 178)
- QR icon always visible (line 186-194)
- Drawer includes search bar, role card, role switcher, dashboard button, navigation, actions, tools, "Parler à Alex" CTA, settings — all wired through `getDrawerSections` + `MegaMenuMobileSection` + `MenuRoleSwitcherUniversal` + `HeaderSearch` + `SmartCTA`

So this is a regression caused by the home page bypassing the layout — **not** a regression in the header itself. No redesign, no menu item removal: just put the home back inside the layout.

## Fix (single file)

Wrap `PageHomeCopilot`'s root JSX in `<MainLayout>` so the layout's header, drawer, bottom nav, and Alex concierge all return on `/` and `/index`.

### `src/pages/PageHomeCopilot.tsx`

- Import `MainLayout from "@/layouts/MainLayout"`.
- Wrap the existing return with `<MainLayout>...</MainLayout>`.
- Keep `HeroCopilotMobile`, `SectionsBelowFold`, `StickyBottomAlexCTA`, `AlexCopilotConversation`, and the `<Helmet>` block exactly as they are.
- The layout already adds `pb-20 lg:pb-0` for the bottom nav, so the sticky CTA + bottom nav coexist correctly.
- `MainLayout` hides `AlexConcierge` only on `/alex` — on `/` it will be visible alongside `AlexCopilotConversation`. To avoid two Alex surfaces stacking on home, gate `AlexConcierge` so it also hides on `/` and `/index` (one-line tweak in `MainLayout.tsx`):
  - Change `const showAlex = pathname !== "/alex";` to `const showAlex = !["/alex", "/", "/index"].includes(pathname);`
  - This keeps the page's own conversation surface as the single Alex entry point on home, while the bottom nav's Alex orb stays as the global trigger.

## Verification (manual mobile test)

1. Open `unpro.ca` on a 384×709 viewport.
2. Top right shows: FR/EN pill + QR icon + hamburger.
3. Tap hamburger → drawer slides in from right with: search bar, role card, "Changer de rôle", dashboard button, Accueil/Propriétaires/Entrepreneurs/Copros/Comment ça marche/Tarifs, "Trouver le bon pro", "Comparer soumissions", "Vérifier un entrepreneur", "Support Alex", "Parler à Alex" CTA, settings.
4. Hamburger icon becomes X while drawer is open.
5. Drawer scrolls independently; bottom nav stays visible with centered Alex orb.
6. Tap X → drawer closes, hamburger returns.

## Out of scope

- No header redesign.
- No menu item removal or simplification.
- No changes to `SmartHeader`, `DrawerNavigationMobileIntent`, `MobileBottomNav`, or `MobileMenu` — those already match the spec.
- No changes to `/alex` route behavior.

## Files changed

1. `src/pages/PageHomeCopilot.tsx` — wrap return in `<MainLayout>`.
2. `src/layouts/MainLayout.tsx` — extend `showAlex` exclusion to `/` and `/index` (one line).

## Success criteria

- Mobile header (logo + FR/EN + QR + hamburger) visible on first paint of `/` and `/index`.
- Drawer opens with all sections listed in the spec.
- Hamburger ⇄ X toggling works.
- Bottom nav with centered Alex orb stays visible.
- No duplicate Alex floating concierge on home.
