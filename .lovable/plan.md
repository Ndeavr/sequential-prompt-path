# Fix `/admin/ui-health` not displaying

## Root cause

`/admin/ui-health` is registered correctly (`src/app/router.tsx:1232`) and `src/pages/admin/AdminUIHealthMonitor.tsx` exists. The page does not display because the app is stuck in `AppErrorBoundary` after Vite failed to fetch a previously-deployed lazy chunk:

```
TypeError: Failed to fetch dynamically imported module:
  /assets/PropertyTypeCityPage-HbtaI-da.js
```

This happens when the deployed HTML still points at chunk hashes that no longer exist (post-rebuild). Since `AppErrorBoundary` wraps the entire router, every route — including `/admin/ui-health` — renders the error screen. Clicking *Recharger* calls something that re-mounts React but does not bust the cached HTML, so the broken chunk URL is requested again and the loop continues.

## Changes

### 1. `src/components/errors/AppErrorBoundary.tsx`
Detect chunk-load failures (`Failed to fetch dynamically imported module`, `Importing a module script failed`, `ChunkLoadError`) and auto-recover:

- On first occurrence in a session, set `sessionStorage.unpro_chunk_reload = "1"` and call `window.location.reload()` immediately (forces a fresh HTML document, which references current chunk hashes).
- If the flag is already set when the error fires again, do **not** reload — show the existing error UI so the user is not trapped in an infinite loop.
- Clear the flag on the next successful mount (in `App.tsx` `useEffect` after first render).

### 2. `src/app/App.tsx`
Add a one-shot `useEffect` that removes `sessionStorage.unpro_chunk_reload` after a successful mount, so the recovery is rearmed for the next stale-deploy event.

### 3. (Optional, same change) Global listener in `src/main.tsx`
Add `window.addEventListener("vite:preloadError", (e) => { /* same guarded reload */ })` to catch preload failures that bypass React error boundaries.

## Out of scope

- No changes to `AdminUIHealthMonitor.tsx`, its route, or `ui_accessibility_audit` schema — those are functional.
- No changes to the lazy-import pattern for other pages.

## Validation

1. Hard-reload preview once manually to clear the current stale chunk.
2. Navigate to `/admin/ui-health` → should render the monitor.
3. Simulate stale chunk (rename a built asset / force-quote a missing import in dev) → confirm exactly one auto-reload, then the page works; second consecutive failure shows the boundary (no infinite loop).
