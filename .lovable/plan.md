# Site Stability & Anti-Flicker Sprint

Focused production stability pass. **No redesign, no schema changes.** Only defensive infrastructure that removes flicker, stabilizes image loading, and adds an admin diagnostic surface.

## Root Causes (from initial scan)

1. **Auth/profile fetch triggers re-renders on entire app shell** — `PROFILE_FETCH_TIMEOUT` after 2.5s (visible in console) causes many guarded pages to blank/re-render. `AuthGuard`/`UniversalRouteGuard` render fallback trees while `isLoading` toggles.
2. **Framer-motion `initial="hidden"` on `SectionContainer` and `CardGlass`** — every section starts at `opacity:0` and depends on viewport intersection to reveal. On slow devices or short viewports this reads as flicker/blank cards.
3. **No unified image component** — 855 files use raw `<img>`. Many use unnormalized Supabase paths or undefined `src`, producing broken icons and layout jump (no width/height/aspect-ratio).
4. **Deferred overlays via `DeferredAfterInteractive`** — mount after first interaction but some pages depend on them for content, producing perceived "half-loaded" cards.
5. **StableBackgroundLayer OK** (already single-mount) — not the culprit; keep it.

## Deliverables

### 1. `SafeImage` component (`src/components/media/SafeImage.tsx`)
- Props: `src`, `alt`, `width`, `height` OR `aspectRatio`, `priority` (eager vs lazy), `fallback`, `className`.
- URL normalizer (`src/lib/normalizeImageUrl.ts`): trim, reject empty/`null`/`undefined`, allow `https://`, `/` public, `data:`, and Supabase storage. Never retry more than once on `onError`; swap to fallback placeholder and log once via `visualStabilityLogger`.
- Always renders a fixed-dimension wrapper (`aspect-ratio` or explicit w/h) to reserve space — no layout shift.
- `loading="eager"` + `fetchpriority="high"` when `priority`; else `loading="lazy"` + `decoding="async"`.

### 2. Motion stability
- Add `src/lib/motion.ts` guardrails: `revealCard` and `fadeUp` variants change `initial` opacity from `0` → `1` when `prefers-reduced-motion` OR when `import.meta.env.VITE_DISABLE_REVEAL === "1"`. Keep transforms subtle. Critical content never depends on JS to become visible.
- `SectionContainer` / `CardGlass`: switch `whileInView` to `animate` with `once: true` and a **safety timeout** — content becomes visible after 400ms even if IntersectionObserver never fires (fixes short-viewport blank sections on mobile).
- Remove `transition-all` from any page-level wrapper found (audit `src/layouts/*`, `src/app/*`).

### 3. Auth-shell stability
- `AuthGuard` and `UniversalRouteGuard`: render a **skeleton that matches the protected page shell** instead of a centered "Chargement…" that replaces the whole tree. Keep header/footer mounted at all times (already true in `MainLayout` — verify no guard wraps `MainLayout`).
- Add `useStableAuth()` selector that only re-renders when `isAuthenticated` **transitions**, not on every profile timeout tick. Prevents cascade re-renders during the 2.5s profile timeout.
- Do not gate `MainLayout` children on auth loading.

### 4. Hydration safety
- Add `src/hooks/useIsMounted.ts` (returns bool after first commit). Any read of `window`/`localStorage`/`document` in render paths must be wrapped. Sweep top offenders: `LanguageToggle`, `ThemeProvider` default, `AlexVoiceContext`, `authSessionStore`.
- Wrap `ThemeProvider` with `suppressHydrationWarning` on `<html>` (via index.html) — already default in next-themes but confirm.

### 5. Visual Stability Logger (`src/lib/visualStabilityLogger.ts`)
Client-side ring buffer (last 200) capturing:
- `image_load_failed { src }`
- `empty_image_src { component }`
- `component_data_timeout { component, ms }`
- `repeated_mount_detected { component, count }` (via a `useMountCounter` hook opt-in on suspect components)
- `section_rendered_empty { section }`
- Last 25 `console.error` intercepted via a passive wrapper.
Persisted to `sessionStorage` only. Not exposed to public users.

### 6. `/admin/site-health` diagnostic page
`src/pages/admin/PageAdminSiteHealth.tsx` (admin-only via existing guard). Sections:
- **Image health**: run through registered image URLs found in current session buffer; show broken count, empty-src count, sample list.
- **Render events**: dump ring buffer (mount counts, timeouts, empty sections).
- **Console errors**: last 25 captured.
- **Connectivity probes**: Supabase `select 1`, public asset HEAD (`/placeholder.svg`), Supabase storage HEAD (test bucket object).
- **Route health**: quick links to test pages listed below; each opens in a new tab.
Registered in `src/app/router.tsx` and added to `adminToolsRegistry.ts` under `category: "diagnostics"`.

### 7. Sweep of high-traffic pages
Manual audit + targeted fixes on: `/`, `/home`, `/contractors`, `/project/new`, `/waiting`, `/matches`, `/onboarding`, `/contractor/onboarding`, `/admin`, `/admin/acquisition-funnel`, `/admin/normalization`. For each: replace raw `<img>` in hero/card with `SafeImage`, remove `initial opacity-0` on above-the-fold content, add min-height to card grids.

## Out of Scope
- No visual redesign, no token changes, no restructure of routes.
- No DB migrations (logger is client-side only).
- Not touching `StableBackgroundLayer` (already correct).
- Not rewriting Alex voice/overlays.

## Files

**New**
- `src/components/media/SafeImage.tsx`
- `src/lib/normalizeImageUrl.ts`
- `src/lib/visualStabilityLogger.ts`
- `src/hooks/useIsMounted.ts`
- `src/hooks/useMountCounter.ts`
- `src/pages/admin/PageAdminSiteHealth.tsx`

**Edited**
- `src/lib/motion.ts` (reduced-motion + safe defaults)
- `src/components/unpro/SectionContainer.tsx`, `CardGlass.tsx` (safety timeout, no opacity-0 default)
- `src/guards/AuthGuard.tsx`, `src/guards/UniversalRouteGuard.tsx` (shell skeleton, no full-tree replacement)
- `src/hooks/useAuth.ts` (stable selector; debounce timeout-driven re-renders)
- `src/app/router.tsx` (register `/admin/site-health`)
- `src/admin/adminToolsRegistry.ts` (add entry)
- Targeted image replacements on the pages listed in §7 (only image swaps + min-height, no layout changes)

## Success Criteria
- Hard refresh: no full-page flash, header/footer never remount.
- Cards on `/`, `/matches`, `/contractors` render with reserved space; images fall back gracefully.
- `AuthGuard` never blanks the shell during 2.5s profile timeout.
- `/admin/site-health` shows live counts and connectivity probes.
- `prefers-reduced-motion` fully disables reveal animations.
