# UNPRO — Mobile Performance Optimization Plan

Goal: LCP < 2.5s, FCP < 2s, PageSpeed Mobile 90+ on `/` without touching the premium look (Alex orb, gradients, glassmorphism, animations).

Scope: frontend + asset pipeline + cache headers only. No business logic, no Alex behavior changes, no Supabase changes.

## Audit findings (current state)

LCP candidates and weight on the home route:
- `src/assets/unpro-logo-master-transparent.png` → **661 KB PNG** shipped to mobile.
- `src/assets/unpro-logo-master.png` → **344 KB PNG** (also in `/public`, served twice).
- `src/assets/rep-demo-aipp.png` → **1.6 MB**.
- `src/assets/design-after-{1,2,3}.jpg` → **3 × ~1.4 MB**.
- Hero background already wired to `/images/hero-bg.webp` + idle-mounted MP4/WebM (good).
- Carousel imports 5 JPGs eagerly via `import` (bundled at hero load).
- `index.html` preloads no fonts / no LCP image, declares no `preconnect` to Google Fonts even though it `preconnect`s — but no actual `<link rel="stylesheet">` for fonts is in HTML (likely injected via CSS).
- `MainLayout` mounts `leather-texture` + multi-stop radial gradients full-viewport (paint cost on mobile).
- `framer-motion` is in main vendor chunk; multiple infinite `animate` loops on home (Orb + glow + halo + shine = 4 concurrent rAF loops per orb instance, two orbs in DOM on `/`).
- `recharts`, `leaflet`, `react-leaflet`, `embla`, `qrcode`, `@google/genai` are in deps — verify they're not pulled into the home chunk.
- `public/_headers` already sets immutable cache for `/assets/*` (Vite hashed) — good. Missing rule for `/images/*.webp`/`.mp4`/`.webm` is currently 30d (acceptable).

## Phase 1 — Critical render path

1. `index.html`
   - Add `<link rel="preload" as="image" href="/images/hero-bg.webp" fetchpriority="high" media="(max-width: 768px)">` (or use a smaller mobile poster — see Phase 2).
   - Add `<link rel="preload" as="image" href="/unpro-logo-wordmark.webp">` for the header LCP element.
   - Add `<meta name="theme-color" content="#060B14">` (avoid flash).
   - Drop the unused 64px favicon variant; keep svg + 32 + 192/512 apple.
2. Remove the `AuthDebugHud` and `BootDebugButton` from production bundle (`import.meta.env.DEV` guard) — they currently render on `/`.
3. `MainLayout`: gate `AlexCompanionOrb` behind `DeferredAfterInteractive` (idle + first interaction) so the second orb on `/` doesn't compete with the hero orb for paint.
4. `SeoStructuredDataInjector` and `CommandPalette` → wrap in `DeferredAfterInteractive` (already used pattern).

## Phase 2 — Images

1. Generate WebP/AVIF variants at build time using a small Node script under `scripts/optimize-images.mjs` (sharp). Output to `public/images/optimized/{name}-{w}.{webp,avif}` with widths `[480, 768, 1280, 1920]`.
2. Replace LCP-relevant raster imports with a tiny `<Picture>` component (`src/components/ui/Picture.tsx`) that emits `<picture>` with `source type="image/avif"` + `image/webp` + `<img>` fallback, **mandatory** `width`/`height`, `loading` (eager only for LCP, `lazy` otherwise), `decoding="async"`, `fetchpriority` for LCP only.
3. Convert the heavy assets (`rep-demo-aipp.png`, `design-after-*.jpg`, `unpro-logo-master*.png`) to WebP and re-export. Remove duplicate PNGs from `/public` once the React tree references the optimized versions.
4. Carousel (`FeaturedCarousel`): switch the 5 imports to lazy `<Picture>` references with `loading="lazy"` + intersection observer; defer Embla mount until in-view.
5. Add explicit `width`/`height` to every `<img>` on the home tree (eslint rule enabled via `eslint-plugin-jsx-a11y/alt-text` already present — extend with a project rule reminder in code comments).

## Phase 3 — JavaScript

1. Update `vite.config.ts` `manualChunks`:
   - Split `framer-motion` already done — also split `recharts`, `leaflet`+`react-leaflet`, `embla-carousel-react`, `@google/genai`, `qrcode`, `lucide-react`, `cmdk`, `vaul`.
   - Confirm none of those land in the home initial chunk (run `vite build --mode production` and inspect `dist/assets/*.js` sizes).
2. Route-split: convert remaining eager pages in `src/app/router.tsx` (`Home` stays eager, others stay lazy — already correct). Add `prefetch` hints (`<link rel="prefetch">`) only after first interaction.
3. Replace bare `lucide-react` barrel imports with per-icon imports (`import Mic from "lucide-react/dist/esm/icons/mic"`) on the hero. This typically saves 30-80 KB gz on first load.
4. `framer-motion`: on the home hero, swap the 3-4 infinite `animate` props on `OrbAlexPrimaryEntry`/`AlexCompanionOrb` for a single CSS `@keyframes` animation (still GPU-friendly transform/opacity). Keep Framer for interactive (hover/tap) gestures only. This removes 3 rAF loops per orb.
5. Memoize `HeroSectionAlexFirst` chip list (`useMemo`) and the CTA handlers (`useCallback` already used).
6. Wrap `AppErrorBoundary`-internal observability `initObservability()` call in `requestIdleCallback` (it currently runs at module init in `main.tsx`).

## Phase 4 — CSS + DOM

1. Tailwind: enable `content` purge audit (already on by Vite default). Remove unused custom keyframes from `tailwind.config.ts` and `index.css` (audit `noise-overlay`, `leather-texture` if unused on mobile path).
2. `MainLayout` background: keep one radial gradient + the base color; collapse the 3 stacked gradients into a single pre-rendered `bg-cinematic.webp` (~10KB) used as a fixed background on mobile only via media query. Saves continuous repaint cost.
3. Glassmorphism: reduce `backdrop-blur-xl` → `backdrop-blur-md` on mobile via `md:backdrop-blur-xl` for off-screen surfaces.
4. Add `content-visibility: auto; contain-intrinsic-size: 600px;` on below-the-fold sections (`SectionTrustProof`, `FeaturedCarousel`, FAQ blocks).
5. DOM: collapse double wrapper divs in `LayoutAlexCinematicShell` and `MainLayout` where they only set z-index or positioning.

## Phase 5 — Cache + network

1. `public/_headers`:
   - Add `/images/*.webp`, `/images/*.avif` → `Cache-Control: public, max-age=31536000, immutable`.
   - Add `/fonts/*` rule.
   - Brotli is already provided by the Lovable CDN — confirm in deliverable report.
2. `index.html`:
   - Keep `preconnect` to Supabase.
   - Add `dns-prefetch` for `https://api.elevenlabs.io` and `https://api.stripe.com` (used after first interaction, so `dns-prefetch` only — no `preconnect` to avoid TLS cost on LCP).
3. Remove duplicate PNG copies in `/public` after WebP migration.

## Phase 6 — Alex Orb

1. Single source of truth: `OrbAlexPrimaryEntry` and `AlexCompanionOrb` share an `OrbVisuals.tsx` primitive that uses CSS keyframes (`@keyframes orb-breathe`, `@keyframes orb-halo-spin`) instead of 4 Framer infinite loops.
2. Add `IntersectionObserver` hook `useAnimatePauseOffscreen` that toggles `animation-play-state: paused` when the orb leaves the viewport and pauses on `document.visibilityState === "hidden"`.
3. Throttle blur: replace `blur(120px)` aura with a pre-baked radial-gradient `<div>` (no filter), keep `blur(40-60px)` only when orb is in active/listening state.
4. No visual regression: keep gradient stops, halo conic-gradient, internal shine, hover scale, tap scale.

## Verification

1. Run `vite build` and capture `dist/assets/*.{js,css}` sizes; produce `docs/perf/before-after.md`.
2. Run Lighthouse mobile (via `pagespeed.web.dev` link) on the published preview; capture LCP / FCP / SI / TBT / CLS.
3. Manual smoke: `/`, `/alex`, contractor onboarding, Stripe checkout, voice flow start/stop, Alex orb hover/active/pause-when-hidden.
4. Confirm no console errors / no missing `width|height` warnings.

## Out of scope

- Server-side rendering / prerendering (separate effort).
- Backend / Supabase / edge function changes.
- Alex prompt, voice, or business logic.
- Pricing engine, plans, checkout flow.

## Files created

- `scripts/optimize-images.mjs`
- `src/components/ui/Picture.tsx`
- `src/components/ui/OrbVisuals.tsx`
- `src/hooks/useAnimatePauseOffscreen.ts`
- `public/images/optimized/*` (generated)
- `docs/perf/before-after.md`

## Files modified

- `index.html` (preload, preconnect, theme-color)
- `public/_headers` (cache rules)
- `vite.config.ts` (manualChunks)
- `src/main.tsx` (defer observability, drop dev hud in prod)
- `src/app/App.tsx` (gate dev HUDs)
- `src/layouts/MainLayout.tsx` (single bg, defer companion orb)
- `src/components/home/HeroSectionAlexFirst.tsx` (Picture, CSS anims, per-icon imports)
- `src/components/home/FeaturedCarousel.tsx` (lazy in-view, Picture)
- `src/components/intent-pages/OrbAlexPrimaryEntry.tsx` (CSS keyframes via OrbVisuals)
- `src/components/alex/AlexCompanionOrb.tsx` (CSS keyframes, idle-pause)
- `src/index.css` / `tailwind.config.ts` (orb keyframes, purge unused)

## Success criteria

- Mobile LCP < 2.5s, FCP < 2s, PSI mobile ≥ 90.
- Initial JS for `/` ≤ 180 KB gz; initial CSS ≤ 30 KB gz.
- No visual regression in Alex orb, gradients, glass cards, onboarding.
- Animations still smooth at 60fps on a mid-tier Android.
