# Performance Hotfix — Homepage (Preserve Visuals & Orb)

Checkpoint: `pre-performance-hotfix-homepage-preserve-orb`

## Root Causes Identified

1. **`/images/hero-bg.gif` weighs 6.7 MB** — single biggest blocker. Loaded eagerly as `<img>` background of hero. Likely the cause of NO_LCP (browser can't pick a stable LCP candidate while a 6.7MB GIF is still decoding) and Speed Index 5.6s.
2. **Hero h1 is hidden during `arrival`/`dissolve`/`presence` choreography** (framer-motion AnimatePresence with opacity 0). No early LCP candidate.
3. **Voice/Alex stack initializes on first paint**: `AlexVoiceProvider`, `OverlayAlexVoiceFullScreen`, `AlexChatFallbackPanel`, `AlexVoiceDebugPanel`, `useLiveVoice`, `alexRuntimeSingleton`, `alexAudioChannel`, ElevenLabs SDK — all eagerly imported in `providers.tsx` and `HeroSection.tsx`.
4. **Below-the-fold sections eagerly imported** in `Home.tsx` (8 sections + counter bar) — bloats homepage bundle.
5. **No `font-display`, no preload of LCP image, no width/height on critical images.**
6. **No cache headers / hashed asset strategy beyond Vite defaults** (Vite already hashes; main gap is the static `/images/hero-bg.gif` and other `public/` assets).

## Plan (Performance Only — Zero Visual Change)

### 1. Hero GIF — kill the 6.7 MB blocker
- Convert `public/images/hero-bg.gif` to:
  - `hero-bg.webp` (static poster, ~80–150 KB)
  - `hero-bg.mp4` + `hero-bg.webm` (looping silent video, ~200–400 KB) for the animated effect
- In `HeroSection.tsx` line 309, replace the `<img>` with a `<picture>` + `<video autoplay muted loop playsinline poster="hero-bg.webp">` fallback chain. Keep the same absolute-inset positioning, `object-cover`, `width={1920} height={1080}`, `aria-hidden`. Visually identical.
- Add `<link rel="preload" as="image" href="/images/hero-bg.webp" fetchpriority="high">` in `index.html` (only the poster, not the video).

### 2. Force a stable LCP candidate on first paint
- In `HeroSection.tsx`, render the semantic `<h1>` immediately (no `opacity:0`, no AnimatePresence wrapper hiding it during `arrival`). Keep visual choreography for sub-elements (orb glow, intent chips), but the `<h1>` text must paint frame 1.
- Add `fetchpriority="high"` on the hero poster image.
- Add `loading="eager" decoding="async"` to hero image; `loading="lazy" decoding="async"` everywhere else.

### 3. Defer Alex voice/audio until interaction
- Move `OverlayAlexVoiceFullScreen`, `AlexChatFallbackPanel`, `AlexVoiceDebugPanel` to `React.lazy()` inside `providers.tsx`, wrapped in a `<DeferredAfterInteractive>` gate (mounts after `requestIdleCallback` or first user input, whichever comes first).
- In `HeroSection.tsx`: keep orb visual (CSS only — no JS audio), but lazy-import `useLiveVoice`, `alexRuntimeSingleton`, `alexAudioChannel`, `AlexAssistantSheet`, `UploadPhotoModal` via dynamic `import()` triggered only on first orb tap / first scroll / `requestIdleCallback`. The orb stays visible from frame 1.
- Outcome: zero ElevenLabs JS, zero microphone code on initial bundle.

### 4. Code-split below-the-fold home sections
- Convert these imports in `src/pages/Home.tsx` to `React.lazy()` + `<Suspense fallback={null}>`:
  - `SectionNoMoreQuotes`, `SectionAlexConversationAd`, `SectionPasseportCards`, `SectionHowItWorks`, `SectionEntrepreneurCTA`, `SectionTrustProof`, `SectionManifestoCTA`, `SectionHomeCounterImpactIA`, `BarStickyCounterRealtime`.
- Keep `HeroSection` eager (it owns the LCP).

### 5. Vite build optimizations
- In `vite.config.ts`, add `build.rollupOptions.output.manualChunks` to split: `react-vendor` (react, react-dom, react-router), `framer` (framer-motion), `supabase`, `tanstack` (react-query), `radix` (@radix-ui/*), `recharts`. Keeps homepage bundle small and improves long-term cache hits.
- Enable `build.cssCodeSplit: true` (Vite default, confirm) and `build.target: 'es2020'`.

### 6. index.html critical hints
- Add `<link rel="preload" as="image" href="/images/hero-bg.webp" fetchpriority="high">`.
- Add `<link rel="preconnect" href="https://clmaqdnphbndvmmqvpff.supabase.co" crossorigin>`.
- Inline a tiny critical CSS snippet for body bg + h1 (~1KB) to remove FOUC.
- Move `<script type="module" src="/src/main.tsx">` to remain at end of `<body>` (already correct).

### 7. Fonts
- Audit `index.css` / Tailwind for `@import` of Google Fonts. Add `font-display: swap` via `&display=swap` query param. Preload only the primary weight used in hero h1.

### 8. Forced reflow / main-thread audit
- In `HeroSection.tsx`, replace any `window.innerWidth` reads in render/effects with a single `ResizeObserver` on the hero container.
- Mark global `scroll`/`touchstart`/`wheel` listeners as `{ passive: true }`. Search: `addEventListener('scroll'` and `addEventListener('touch'`.
- Wrap orb breathing/pulse animation in pure CSS (`@keyframes`) instead of framer-motion `animate` loop where possible.

### 9. Cache headers
- Lovable preview/published serves static `public/` with default headers. Add a `public/_headers` (Netlify-style — Lovable hosting honors it) with:
  - `/assets/* → Cache-Control: public, max-age=31536000, immutable`
  - `/images/* → Cache-Control: public, max-age=2592000`
  - `/*.woff2 → Cache-Control: public, max-age=31536000, immutable`

### 10. Validation
- Visual diff: hero, orb, intent chips, CTAs, all home sections — must be pixel-identical.
- Smoke: tap orb → Alex voice still starts, AlexAssistantSheet still opens, photo modal opens, `/emergency-reset` still works, onboarding/role flow unchanged.
- Run Lighthouse mobile in preview after changes.

## Targets
- FCP < 1.8s · LCP < 2.5s · SI < 3.5s · TBT < 200ms · CLS ≈ 0 · Homepage initial JS < 200 KB gzipped.

## Files Touched
- `index.html` (preload, preconnect, critical CSS)
- `vite.config.ts` (manualChunks)
- `public/_headers` (new)
- `public/images/hero-bg.webp`, `hero-bg.mp4`, `hero-bg.webm` (new, generated from existing GIF via ffmpeg)
- `src/pages/Home.tsx` (lazy sections)
- `src/app/providers.tsx` (defer voice overlays)
- `src/components/home/HeroSection.tsx` (h1 eager, picture/video, lazy voice imports, no opacity:0 on LCP)
- `src/components/system/DeferredAfterInteractive.tsx` (new helper)
- `src/index.css` (font-display swap, drop unused weights)

## Non-Goals (Hard Constraints)
- No homepage redesign · No orb redesign or removal · No copy change · No nav change · No conversion-flow change · No new sections.
