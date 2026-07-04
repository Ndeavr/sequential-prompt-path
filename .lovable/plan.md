## Root cause

1. **`/home` and `/matches` render the "Coming soon" fallback.** Neither path is registered in `src/app/router.tsx`. The catch-all `<Route path="*" element={<FallbackRoutePage />} />` sends them to `FallbackLandingTemplateUNPRO`, which shows the "Cette fonctionnalité arrive bientôt" copy pulled from `navigation_fallback_pages`.
2. **Bottom nav is rendered twice on `/`.** `MainLayout` lazy-mounts `BottomDockGlass` as `MobileBottomNav`, and `PageHomeUnicorn` also mounts `<BottomDockGlass />` at the end of the tree. Two stacked fixed docks cause the visible "cut" over the Espace entrepreneurs preview card and extra whitespace where a second dock reserves nothing.
3. **Content passes behind the fixed dock on non-Main layouts.** `ContractorLayout`, `DashboardLayout`, `AdminLayout` render `MobileBottomNav` but their `<main>` has no `padding-bottom` reserving the dock height + `env(safe-area-inset-bottom)`, so cards get clipped on mobile.
4. **`ContractorAippSplit` uses a decorative absolute glow that on narrow viewports pushes the card into a taller flow because of `overflow-x-clip` on parent + the outer `<section className="relative">` wrapping only the backdrop + content.** The `IntelligenceBackground` variants (`contractors`, `passport`, `footer`) are `position:absolute inset-0` inside sections that are visually adjacent, producing the large empty band between "Espace entrepreneurs" and "Qu'est-ce que UNPRO ?" seen in the screenshots.
5. **Route directory exposes unfinished slugs.** `SmartHeader`, `MegaMenu`, `SmartFooter`, `BottomDockGlass` and site-map fallbacks reference paths (`/matches`, `/home`, etc.) that hit the fallback template instead of a real page.

## Fixes

### 1. Router redirects and route hygiene (`src/app/router.tsx`)

- Add near the top of the `<Routes>` block, before the catch-all:
  ```tsx
  <Route path="/home" element={<Navigate to="/" replace />} />
  <Route path="/matches" element={<Navigate to="/" replace />} />
  ```
  (`Navigate` imported from `react-router-dom`.)
- Audit all `<Route>` entries that render `FallbackRoutePage`/`FallbackLandingTemplateUNPRO` directly. If any legacy paths exist besides the catch-all, redirect them to `/` too.
- Keep `<Route path="*" element={<FallbackRoutePage />} />` last so genuinely unknown URLs still land on the branded fallback (not the ones we own).

### 2. Hide unfinished links from navigation

- In `src/components/navigation/SmartHeader.tsx`, `src/components/navigation/SmartFooter.tsx`, `src/components/navigation/MegaMenu.tsx`, `src/components/home-unicorn/BottomDockGlass.tsx`, and `src/components/layout/SiteFooterIntelligence.tsx`, remove or `hidden`-guard link items whose `to` matches: `/home`, `/matches`, and any other href that resolves to `FallbackRoutePage` (grep for links with no matching `<Route path=...>` in the router).
- Add a small allow-list constant `SHIPPED_ROUTES` in `src/config/routeRegistry.ts` and a `isShipped(path)` helper. Use it in the nav components to filter items instead of hard-deleting, so we can re-enable safely later.

### 3. Kill duplicate bottom dock and reserve bottom padding

- In `src/pages/PageHomeUnicorn.tsx`, delete the inline `<BottomDockGlass />` render (line 767). `MainLayout` already mounts it via `DeferredAfterInteractive`.
- In `src/layouts/MainLayout.tsx`, `<main>` already has `pb-[calc(96px+env(safe-area-inset-bottom))]`. Confirm the value matches the dock's real rendered height (~84 px + safe area). Bump to `pb-[calc(112px+env(safe-area-inset-bottom))]` and expose it as a CSS var `--dock-safe-pb` in `src/index.css` so every layout uses the same token.
- Apply `pb-[var(--dock-safe-pb)] md:pb-0` on `<main>` in `ContractorLayout.tsx`, `DashboardLayout.tsx`, `AdminLayout.tsx`. This stops cards from sliding behind the dock on Android 360–430 px.
- Ensure `BottomDockGlass` wrapper keeps `z-50` and `pointer-events-none` on the outer container while the pill/dock itself is `pointer-events-auto` — already correct in the file. Keep that.

### 4. Fix Espace entrepreneurs cut and section gaps in `src/pages/PageHomeUnicorn.tsx`

- Remove the outer `<section className="relative">…</section>` wrappers around `PassportBackdrop`/`PIMIntroBand` and `ContractorsBackdrop`/`ContractorAippSplit`. Move the backdrops inside the block they decorate (as `position:absolute` layers inside `ContractorAippSplit`'s own root, wrapped in a `relative isolate` container). This eliminates the collapsed-height section that produces the ~400 px blank band.
- Add `isolate` and `overflow-visible` to the root `<div className="unicorn-theme …">` so absolute glow layers cannot bleed into siblings.
- Remove the decorative `absolute -top-16 -right-16 w-64 h-64` glow inside `ContractorAippSplit` (line 583–590) or convert it to `inset: 0; mix-blend-mode: screen; opacity: .35` inside a `relative` inner wrapper. This stops the card from being visually clipped on 360 px viewports.
- Set every inter-section spacer to `mt-6` max and cap standalone spacers to `mb-8` (48 px) — no `mt-12`/`my-16` in the mobile flow.
- Wrap `ContractorAippSplit`'s outer container with `contain: paint; content-visibility: auto; contain-intrinsic-size: 640px` so it renders as one atomic card and never appears half-loaded during scroll.

### 5. Guard absolute-positioned decorations globally

- Grep for `pointer-events-none absolute` / `absolute -top-` / `absolute -right-` in `src/pages/PageHomeUnicorn.tsx` and `src/components/home-unicorn/*`. For each, ensure the parent has `relative overflow-hidden` (or `overflow-x-clip`) AND a non-zero natural height. Where the absolute layer is purely decorative, add `[contain:layout_paint]` on the parent.
- Confirm `IntelligenceBackground` is only used inside a `relative` parent that has real content height. Ban `position:absolute` background when the parent is a bare wrapper with no siblings.

### 6. Admin diagnostics tie-in

- In `src/pages/admin/PageAdminSiteHealth.tsx`, remove `/home` and `/matches` from the "Routes à tester" list and add a "Routes redirigées" row that verifies `/home` and `/matches` reach `/`. Adds a mobile clip probe: `document.querySelectorAll('[data-nav-clipped]')` count so future regressions surface.

## Files changed (expected)

- `src/app/router.tsx` — add redirects, remove stale routes
- `src/config/routeRegistry.ts` — `SHIPPED_ROUTES` + `isShipped()`
- `src/components/navigation/SmartHeader.tsx`
- `src/components/navigation/SmartFooter.tsx`
- `src/components/navigation/MegaMenu.tsx`
- `src/components/home-unicorn/BottomDockGlass.tsx`
- `src/components/layout/SiteFooterIntelligence.tsx`
- `src/layouts/MainLayout.tsx`, `ContractorLayout.tsx`, `DashboardLayout.tsx`, `AdminLayout.tsx`
- `src/pages/PageHomeUnicorn.tsx` (remove duplicate dock, refactor section wrappers, tame absolute glow)
- `src/index.css` — `--dock-safe-pb` token
- `src/pages/admin/PageAdminSiteHealth.tsx`

## Success criteria

- `/home` and `/matches` respond with `<Navigate to="/" replace />`, no more "Cette fonctionnalité arrive bientôt".
- Espace entrepreneurs renders as one continuous card on 360–430 px; no visible cut when scrolling.
- No section on `/` has more than 48 px of empty vertical gap.
- Bottom dock never overlaps content on Home, Contractor dashboard, Admin, or homeowner dashboard.
- Only one `BottomDockGlass` is present in the DOM (verified via Playwright + screenshot).
- No hidden nav item routes to `FallbackRoutePage`.

## Out of scope

No redesign, no new SQL, no dependency changes, no Alex/voice logic changes.

## Verification

Run Playwright headless at 375×812 against `/`, `/home`, `/matches`, `/contractors`, `/admin/ops` and capture screenshots. Compare before/after and paste side-by-side into the reply.
