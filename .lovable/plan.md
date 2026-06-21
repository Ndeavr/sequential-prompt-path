## EMERGENCY — Restore Sitewide Scroll

### Root cause hypotheses (confirmed by grep)
1. `body { overscroll-behavior-y: none }` in `src/index.css` (line 257) — does not block scroll itself, but combined with iOS quirks + the global fixed background can defeat momentum scrolling.
2. No explicit `overflow-y: auto` / `touch-action: pan-y` on `html, body, #root` — only `overflow-x: hidden` is set. Some mobile browsers then inherit `overflow: hidden` from a wrapper.
3. Decorative full-screen layers exist (`StableBackgroundLayer`, `CinematicArchScenes`, `.unicorn-theme::before`) — all already `pointer-events: none`, but we must add a defensive global rule guaranteeing it for `[data-decor]` and `aria-hidden` background siblings so a future regression can't trap touches.
4. `useScrollLock` (auth overlay) writes `body.style.overflow = "hidden"` and restores via a captured `original`. If the overlay unmounts while a second instance is open, `original` ("hidden") is re-applied permanently. Needs to read `original` at lock time and always reset to `""`.
5. Page wrappers using `min-h-screen` + `overflow-x-hidden` are fine, but we'll standardize on `min-h-[100svh]` and forbid `h-screen overflow-hidden` on any page root (audit only — no offender on `/index` today, but `AdminLayout`/`DashboardLayout`/`CondoLayout`/`ContractorLayout` flagged for review).

### Files to change

**1. `src/index.css`** — harden the global scroll contract
- Replace the `html, body` block (lines 245-264) with:
  ```css
  html, body, #root {
    width: 100%;
    min-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
  body {
    @apply text-foreground font-sans antialiased;
    background: var(--gradient-bg);
    background-attachment: scroll;
    min-height: 100svh;
    position: relative;
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  ```
- Remove `overscroll-behavior-y: none`.
- Append a defensive rule near the bottom:
  ```css
  [data-decor], [aria-hidden="true"].decorative-layer, .noise-overlay::after {
    pointer-events: none !important;
  }
  ```

**2. `src/hooks/useScrollLock.ts`** — make unlock idempotent
- On lock: `document.body.style.overflow = "hidden"`.
- On unlock: always set back to `""` (never re-apply captured "hidden"). Also clear `touch-action` if we add it.

**3. `src/layouts/MainLayout.tsx`** — guarantee the page shell never traps scroll
- Replace `min-h-[100svh] flex flex-col relative overflow-x-hidden w-full max-w-full` on the root with `min-h-[100svh] flex flex-col relative w-full overflow-visible` and move `overflow-x-hidden` to the `<main>` only.
- Add `pb-[calc(96px+env(safe-area-inset-bottom))]` on `<main>` so the fixed bottom dock never sits on top of last content.

**4. `src/pages/PageHomeUnicorn.tsx`** (the `/index` page the user reported)
- Change wrapper `min-h-screen ... overflow-x-hidden` → `min-h-[100svh] overflow-visible overflow-x-clip`.
- Keep existing pb for dock.

**5. Audit pass (no logic change, just CSS class swap)**
- `src/layouts/AdminLayout.tsx`, `DashboardLayout.tsx`, `CondoLayout.tsx`, `ContractorLayout.tsx`, `ContractorFunnel/FunnelLayout.tsx`: replace any `h-screen overflow-hidden` on the outermost wrapper with `min-h-[100svh] overflow-visible`. Inner scrollable panes keep their own `overflow-auto`.

**6. `src/components/home-unicorn/BottomDockGlass.tsx`** — already correct (outer `fixed ... pointer-events-none`, inner pill `pointer-events-auto`). No change.

**7. Verify**
- Open `/`, `/index`, `/alex`, `/dashboard` in Playwright at 384×706, scroll-to-bottom, assert `window.scrollY > 0` and that the bottom dock receives clicks while the page still scrolls behind it.
- Tail console for `body.style.overflow` mutations during navigation.

### Out of scope
- No business-logic changes, no router changes, no Alex/voice changes, no auth-overlay behavior changes beyond the idempotent unlock fix.

### Success
- Vertical scroll works on `/`, `/index`, every authenticated layout, on iOS Safari + Android Chrome.
- Bottom dock + Alex orb remain tappable.
- No regression in auth overlay (open locks scroll; close fully restores it, even after rapid open/close).
