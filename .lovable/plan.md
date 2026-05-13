
# Mission

Lighthouse times out on `unpro.ca`. Before any score optimization, the homepage must render reliably on mobile 4G with low CPU. This plan **stabilizes rendering** by stripping non-essential work from the critical path and isolating it behind interaction/idle gates.

No new features. No design rewrite. Surgical removals + dynamic imports.

---

## Root causes identified (homepage cold load)

```text
1. Provider stack mounts 4 voice/chat overlays after `DeferredAfterInteractive`
   → BUT they all preload via Suspense as soon as user touches/scrolls,
     blocking INP on mobile.
   Files: src/app/providers.tsx (4 lazy() at top — all bundled in one chunk on first idle)

2. MainLayout always mounts: SmartHeader (heavy), SmartFooter, MobileBottomNav,
   AlexCompanionOrb (lazy but eagerly suspense-loaded), CommandPalette,
   SeoStructuredDataInjector, BannerResumeJourney, useJourneyTracker.
   → useJourneyTracker runs on EVERY route on EVERY render.
   File: src/layouts/MainLayout.tsx

3. SmartHeader imports 3 PNG logos eagerly (wordmark+icon+house),
   framer-motion AnimatePresence at top, MegaMenuPanel, DrawerNavigationMobileIntent,
   QRShareSheet, HeaderSearch — ALL bundled in main entry chunk.
   File: src/components/navigation/SmartHeader.tsx (lines 1-27)

4. AlexVoiceContext ALWAYS imports `alexAudioChannel` + `audioEngineUNPRO`
   at module top → audio engine code in main bundle.
   File: src/contexts/AlexVoiceContext.tsx (lines 11-13)

5. Hero animations:
   - `animate-pulse` on 640×460 radial-gradient orb aura (continuous GPU paint)
   - `animate-pulse` on inner orb aura (second layer)
   - `animate-ping` on status dot
   → 3 simultaneous compositor animations behind a backdrop-blur header.
   File: src/components/home/HeroSectionAlexFirst.tsx (lines 145-152, 195-201, 238-241)

6. SmartHeader sticky bar uses `backdrop-filter: blur(20px) saturate(1.6)` +
   bottom-fade gradient. Combined with the hero's full-screen blur layers,
   mobile GPU thrashes during scroll.

7. index.html ships zero preloads for the LCP poster image
   (/images/hero-bg.webp). Browser has to wait for HeroSection chunk
   to download before discovering it.

8. Two unused logo PNGs are downloaded sitewide:
   - unpro-logo-master.png (344 KB)
   - unpro-logo-master-transparent.png (661 KB)
   Used only in og:image meta. Not blocking, but flagged.

9. Duplicate React-key warnings in SmartHeader + SmartFooter (console)
   → indicates list rendering issue causing extra reconciliation work.

10. Home.tsx feature-flag wrapper (HomeWithFeatureFlag) — verify it isn't
    triggering an extra render cycle / Suspense boundary on first paint.
```

---

## Plan (5 surgical patches)

### Patch 1 — Strip MainLayout to a static shell

`src/layouts/MainLayout.tsx`

- Lazy-load `AlexCompanionOrb` (already lazy) **and** `CommandPalette`,
  `MobileBottomNav`, `SeoStructuredDataInjector` behind
  `DeferredAfterInteractive`.
- Move `useJourneyTracker()` call inside a `DeferredAfterInteractive`
  child component so it doesn't fire on first paint.
- Keep `SmartHeader` + `SmartFooter` synchronous (above-the-fold/SEO).

### Patch 2 — Defer voice/chat overlays harder

`src/app/providers.tsx`

- Wrap each lazy overlay in its **own** `DeferredAfterInteractive` so
  they don't all hit the network at once on first idle.
- Bump `DeferredAfterInteractive` `timeoutMs` from 2500 → 6000 ms for
  debug-only panels (`AlexVoiceDebugPanel`, `AlexVoiceDiagnosticsPanel`)
  and gate them on `import.meta.env.DEV`.

### Patch 3 — Remove eager audio modules from main bundle

`src/contexts/AlexVoiceContext.tsx`

- Replace top-level `import { alexAudioChannel } …` and
  `import { audioEngine } …` with **dynamic** imports inside `openAlex`/`closeAlex`.
- `useAlexVoiceLockedStore` stays (Zustand, tiny).
- Net effect: audio engine + single-audio-channel code split out of the entry chunk.

### Patch 4 — Cool down hero animations on mobile

`src/components/home/HeroSectionAlexFirst.tsx`

- Remove the outer `animate-pulse` 640×460 aura layer (lines 145-152) — keep
  static gradient. Saves ~30% mobile GPU on home idle.
- Replace `animate-pulse` on the inner orb aura with a single CSS
  transform animation gated by `@media (prefers-reduced-motion: no-preference) and (min-width: 640px)`.
- Keep `animate-ping` on the 2px status dot (negligible cost).
- Add `loading="eager"` + `fetchpriority="high"` on the poster image (already present — verified).

### Patch 5 — Preload LCP + fix head

`index.html`

- Add `<link rel="preload" as="image" href="/images/hero-bg.webp" fetchpriority="high">`
  in `<head>`.
- Add `<meta name="robots" content="index,follow">` (currently missing).
- Add `<meta name="theme-color" content="#060B14">`.
- Keep existing canonical / og tags.

`src/components/navigation/SmartHeader.tsx` + `SmartFooter.tsx`

- Fix the duplicate-key React warnings (use stable composite keys in the
  affected `.map`s — found at lines flagged in console).

---

## Out of scope (defer to next pass)

- Replacing PNGs with WebP / regenerating logos
- Sentry / observability rewrites
- Refactor of useJourneyTracker
- Rewriting Header/Footer
- Bundle-analyzer-driven chunk surgery beyond what Patch 3 already gives

---

## Acceptance

- `curl -A "Mozilla/5.0 (Linux; Android …)" https://unpro.ca` returns full HTML with the H1 in source.
- Lighthouse mobile run on `unpro.ca` completes (no `ERR_TIMED_OUT`).
- TBT on Moto-G class device < 600 ms (was effectively infinite — timeout).
- Home page interactive in < 4 s on simulated 4G (target — not guaranteed; blocker is just "no timeout").
- No new TypeScript or runtime errors. No visual regression on the hero.

---

## Files to be edited

```text
index.html
src/app/providers.tsx
src/contexts/AlexVoiceContext.tsx
src/layouts/MainLayout.tsx
src/components/home/HeroSectionAlexFirst.tsx
src/components/navigation/SmartHeader.tsx     (key fix only)
src/components/navigation/SmartFooter.tsx     (key fix only)
```

No new files. No DB changes. No edge function changes.
