## Goal
Turn the one-off fix into permanent, self-enforcing layout guardrails: a single reusable `<PageShell>`, tokens + lint rules that prevent duplicate docks, safe bottom padding on every mobile page, and a runtime QA overlay that flags regressions.

## New files

### 1. `src/layouts/PageShell.tsx`
Canonical page wrapper. Every page must use it (directly or via a layout).

Props:
- `as` (default `main`)
- `variant`: `"marketing" | "app" | "admin"` — controls max-width, background scope
- `padded` (default `true`) — applies horizontal + top padding
- `dockSafe` (default `true`) — applies `pb-[var(--dock-safe-pb)]`
- `isolate` (default `true`) — adds `isolate overflow-x-clip`
- `noGap` — flag for landing pages that manage their own vertical rhythm
- `data-page-shell` marker used by the QA scanner
- Dev-only assertion: if a descendant renders `<BottomDockGlass />` or `<MobileBottomNav />`, log a red console error via `visualStabilityLogger` and mark `data-nav-clipped`.

### 2. `src/components/layout/SectionBlock.tsx`
Wrapper enforcing max 48 px inter-section gap:
- `gap`: `"none" | "sm" | "md" | "lg"` mapped to `mt-0 | mt-4 | mt-6 | mt-8` (max 32 px).
- `namedGap` prop bypasses the cap with a comment reason.
- Adds `relative isolate` and enforces `overflow-x-clip` when children contain absolute layers.

### 3. `src/lib/layoutGuards.ts`
Pure helpers:
- `assertSingleDock()` — counts `[data-bottom-dock]` in DOM.
- `scanLayout()` — returns `{ duplicateDocks, horizontalOverflow, largeGaps, contentBehindDock }`.
- Uses `IntersectionObserver` + `getBoundingClientRect` on all `[data-page-shell] > *` to compute gaps.

### 4. `src/components/dev/MobileQAOverlay.tsx`
Dev + admin-only floating badge (bottom-left, `z-[9999]`) rendered inside `MainLayout` when `import.meta.env.DEV` OR `?qa=1` OR user has admin role.
- Runs `scanLayout()` every 1 s.
- Shows PASS / WARN chips per rule; click expands to details.
- Emits events into `visualStabilityLogger` for `/admin/site-health`.

### 5. `src/config/routeRegistry.ts`
`SHIPPED_ROUTES: Set<string>` + `isShipped(path)` + `LEGACY_REDIRECTS: Record<string,string>`. Router iterates `LEGACY_REDIRECTS` to emit `<Navigate>` entries — one source of truth.

### 6. `eslint-rules/no-bottom-dock-in-pages.js` + register in `eslint.config.js`
Custom ESLint rule that errors on any import of `BottomDockGlass` or `MobileBottomNav` outside `src/layouts/**` and `src/components/navigation/**` and `src/components/home-unicorn/BottomDockGlass.tsx` itself. Prevents the class of bug returning.

## Edits

### `src/index.css`
- Confirm `--dock-safe-pb: calc(var(--bottom-dock-height, 88px) + env(safe-area-inset-bottom) + 24px)` (adds the required 24 px breathing room).
- Add `--bottom-dock-height: 88px`.
- Add utility `.page-dock-safe { padding-bottom: var(--dock-safe-pb); }` for legacy pages.

### `src/components/home-unicorn/BottomDockGlass.tsx`
Add `data-bottom-dock="glass"` on the outer fixed wrapper. Guard: if `document.querySelectorAll('[data-bottom-dock]').length > 1` on mount, unmount self and log error. This makes duplication impossible at runtime, not just at lint time.

### `src/components/navigation/MobileBottomNav.tsx`
Same `data-bottom-dock="nav"` attribute and singleton guard.

### `src/layouts/MainLayout.tsx`
- Wrap `<main>` with `<PageShell>`.
- Mount `<MobileQAOverlay />` inside `DeferredAfterInteractive`.

### `src/layouts/DashboardLayout.tsx`, `ContractorLayout.tsx`, `AdminLayout.tsx`, `CondoLayout.tsx`
- Replace inline `<main className="… pb-[var(--dock-safe-pb)] …">` with `<PageShell variant="app">` / `"admin"`.
- Ensure only one `<MobileBottomNav />` per layout. Add runtime assert.

### `src/app/router.tsx`
- Replace inline `<Route path="/home" …>` / `<Route path="/matches" …>` with a loop over `LEGACY_REDIRECTS`.
- Wrap `FallbackRoutePage` to consult `isShipped(pathname)`: if the pathname matches a known nav item slug that isn't shipped, redirect to `/` instead of rendering the "coming soon" template. Marketing-crawlable content-only fallbacks remain, but no nav item can reach a coming-soon screen.

### `src/pages/PageHomeUnicorn.tsx`
- Confirm no local `<BottomDockGlass />` import (already removed).
- Replace root `<div className="unicorn-theme …">` with `<PageShell variant="marketing">`; drop manual `pb-[var(--dock-safe-pb)]` and `isolate` — the shell owns them.
- Wrap the "Espace entrepreneurs" and "Comment fonctionne UNPRO" blocks with `<SectionBlock gap="md">`.

### Every current page using `MainLayout`
Sweep `src/pages/**` and replace bespoke `<div className="min-h-screen …">` wrappers with `<PageShell>`. Batched by directory:
- `src/pages/PageHomeCopilot.tsx`
- `src/pages/Home.tsx`
- `src/pages/PageProfile*.tsx` (leads, agenda, profile referenced in the screenshots)
- `src/pages/admin/PageAdminSiteHealth.tsx`
- `src/pages/admin/PageAdminOps.tsx`
- `src/pages/admin/PageAdminNormalization.tsx`

Pages that already opt out of `MainLayout` (Alex, checkout, immersive) keep custom root but must still use `<PageShell dockSafe={false}>` for the QA scanner to pick them up.

### Documentation
`docs/standards/PAGE_LAYOUT.md` — 1-page rule sheet: "Every page uses `<PageShell>`; never mount a dock; use `<SectionBlock>` for spacing; `/admin/site-health` catches regressions."

## Runtime QA rules (`MobileQAOverlay`)
| Rule | Detection | Threshold |
|---|---|---|
| Duplicate dock | `document.querySelectorAll('[data-bottom-dock]').length > 1` | fail if > 1 |
| Body horizontal overflow | `document.documentElement.scrollWidth > window.innerWidth + 1` | fail |
| Large section gap | consecutive `[data-page-shell] > section` vertical gap | warn > 48 px, fail > 80 px |
| Content behind dock | `elementFromPoint(x, innerHeight - dockHeight/2)` returns non-dock content | fail |
| Viewport width | `window.innerWidth` in {360, 390, 430} | info chip |

Runs on mount, on resize, and every 1 s (dev) / 5 s (admin). Persists last 20 findings in `sessionStorage` and forwards them to `visualStabilityLogger` so `/admin/site-health` shows them.

## Prevention proof
1. **ESLint rule** — importing `BottomDockGlass` in `src/pages/**` fails CI (`Failed to lint` in build output).
2. **Runtime singleton guard** — even if lint is bypassed, second dock unmounts itself and logs to `visualStabilityLogger`.
3. **`<PageShell>` mandatory bottom padding** — no page can render without it because layouts wrap `children` in it.
4. **`<SectionBlock>` gap cap** — `gap="xl"` doesn't exist; the only escape hatch is `namedGap="reason"`.
5. **`MobileQAOverlay`** — surfaces regressions live at 360 / 390 / 430 px during development, in staging via `?qa=1`, and inside `/admin/site-health` in production.
6. **Router redirect table** — new legacy paths added by editing one file, not by scattering `<Navigate>` calls.

## Files changed (expected)
Created: `src/layouts/PageShell.tsx`, `src/components/layout/SectionBlock.tsx`, `src/lib/layoutGuards.ts`, `src/components/dev/MobileQAOverlay.tsx`, `src/config/routeRegistry.ts`, `eslint-rules/no-bottom-dock-in-pages.js`, `docs/standards/PAGE_LAYOUT.md`
Edited: `src/index.css`, `src/components/home-unicorn/BottomDockGlass.tsx`, `src/components/navigation/MobileBottomNav.tsx`, `src/layouts/MainLayout.tsx` + Dashboard/Contractor/Admin/Condo layouts, `src/app/router.tsx`, `src/pages/PageHomeUnicorn.tsx`, `src/pages/PageHomeCopilot.tsx`, `src/pages/Home.tsx`, `src/pages/admin/PageAdminSiteHealth.tsx`, `src/pages/admin/PageAdminOps.tsx`, `src/pages/admin/PageAdminNormalization.tsx`, `eslint.config.js`

## Verification
- Playwright at 360 / 390 / 430 px against `/`, `/home`, `/matches`, `/profile`, `/leads`, `/agenda`, `/admin/site-health`. Capture screenshots + `scanLayout()` output.
- Force a violation (temporarily import `<BottomDockGlass />` in a page) to prove ESLint + runtime guard both catch it, then revert.

## Out of scope
No visual redesign, no schema changes, no changes to Alex voice/session code.
