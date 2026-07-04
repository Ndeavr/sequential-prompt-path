# UNPRO — Page Layout Standard

Read before creating or modifying any page.

## The three rules

1. **Every page renders inside `<PageShell>`.**
   Either directly (immersive pages) or via a layout (`MainLayout`,
   `DashboardLayout`, `ContractorLayout`, `AdminLayout`, `CondoLayout`).
   The shell owns the mobile dock-safe padding, `isolate`, and
   `overflow-x-clip`. Never duplicate these on the page.

2. **Only `MainLayout` mounts the bottom dock.**
   Do not import `BottomDockGlass` or `MobileBottomNav` inside `src/pages/**`.
   Both components are singletons — the second instance unmounts itself and
   logs a red error to `visualStabilityLogger`, visible in
   `/admin/site-health`.

3. **Section spacing is bounded.**
   Use `<SectionBlock gap="none|sm|md|lg">` (max 32 px). To exceed the cap
   provide `namedGap="reason:96"` — grep-able so reviews can catch abuse.
   Global rule: **no unexplained gap above 48 px on mobile.**

## Tokens

- `--bottom-dock-height: 88px`
- `--dock-safe-pb: calc(var(--bottom-dock-height) + env(safe-area-inset-bottom) + 24px)`

## Decorative layers

Absolute glows, orbs, and backdrops MUST:
- carry `pointer-events-none`
- live inside a `relative overflow-hidden` (or `overflow-x-clip`) parent
- use `inset: 0` (never negative offsets that escape the clip)
- sit at `z-index: 0` or below content, never above

## Route hygiene

- `src/config/routeRegistry.ts` holds `LEGACY_REDIRECTS`. Add new
  redirects there — the router iterates the map.
- Nav components must not link to unshipped slugs. The catch-all fallback
  is reserved for SEO/marketing landing content, never nav items.

## QA

- **Dev / staging (`?qa=1`)**: `<MobileQAOverlay>` floats a badge that
  shows viewport, duplicate docks, horizontal overflow, section gap
  outliers, and content-behind-dock detection.
- **Production**: same signals are captured silently into
  `visualStabilityLogger` and surfaced at `/admin/site-health`.

## Verification checklist before merging a new page

- [ ] Uses `<PageShell>` (or a layout that does).
- [ ] No import of `BottomDockGlass` / `MobileBottomNav`.
- [ ] Spacing between top-level sections uses `<SectionBlock>`.
- [ ] Playwright screenshot at 360 / 390 / 430 px shows no cut cards,
      no blank band > 48 px, no horizontal scroll.
- [ ] `MobileQAOverlay` badge is green on the page.
