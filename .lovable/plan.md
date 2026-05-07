# Mobile PageSpeed Fixes for unpro.ca

Focus: make the mobile homepage's LCP detectable by Lighthouse (currently NO_LCP because the React hero mounts after JS), then trim images, render-blocking work, and main-thread time. SEO/A11y/Best Practices markup stays untouched.

## 1. Fix NO_LCP (highest leverage)

Lighthouse loads the raw HTML response, so it only sees `<div id="root"></div>` today. We make the hero `<h1>` exist in `index.html` itself and let React hydrate over it.

**`index.html`** — inject a static LCP block inside `#root` that mirrors the homepage hero copy and gradient. React will replace it on mount; Lighthouse measures it as LCP.

```html
<div id="root">
  <main class="lcp-shell">
    <h1 class="lcp-title">
      Quel est votre projet <span class="lcp-accent">aujourd'hui&nbsp;?</span>
    </h1>
    <p class="lcp-sub">Touchez l'orb d'Alex pour démarrer. Voix, photo, soumission ou texte — vous choisissez.</p>
  </main>
</div>
```

Inline the small CSS for `.lcp-shell/.lcp-title/.lcp-sub` directly in `<head>` (under 1 KB) so the text paints with first HTML byte. No webfont dependency — system stack until React hydrates.

Add preload for the OG / hero asset already used:

```html
<link rel="preload" as="image" href="/unpro-logo-master.png" fetchpriority="high">
```

(There is no real hero `<img>` today — the orb is a CSS/SVG component. We do **not** invent a new hero image; the static `<h1>` becomes the LCP element, which is what Lighthouse needs.)

**`src/components/home-copilot/HeroCopilotMobile.tsx`** — remove the `motion.h1` initial-opacity-0 wrapper on the title. Render the `<h1>` immediately (no `initial={{opacity:0}}`) so when React hydrates, the LCP element stays painted continuously. Keep motion only on secondary elements (orb, CTA, chips).

**`src/main.tsx`** — before `createRoot(...).render(...)`, no-op (the static markup is simply replaced on first render — acceptable since copy matches).

## 2. Image optimization

- Audit `<img>` site-wide via `rg "<img"` and add `width`, `height`, `loading="lazy"` (except the hero/logo above the fold which stays `loading="eager"` + `fetchpriority="high"`).
- Convert the few PNGs in `/public` (`unpro-logo-master.png`, `icon-192.png`, `icon-512.png`, favicons) to WebP siblings; keep PNG fallback via `<picture>` only where used in JSX. Reference WebP by default.

## 3. Render-blocking resources

- `index.html` already preconnects fonts but does not load a stylesheet — good. Remove the unused `preconnect` to `fonts.gstatic.com` if no webfont `<link rel="stylesheet">` is emitted (verify; if Tailwind injects one via JS, leave preconnect).
- Defer the lovable-tagger / dev-only code paths (already dev-only via `mode === "development"`; confirm no prod leakage).
- Move any analytics/tracking init into `requestIdleCallback` (see #6).

## 4. Minify CSS/JS

**`vite.config.ts`** — explicitly set:

```ts
build: {
  minify: 'esbuild',
  cssMinify: true,
  target: 'es2020',
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom', 'react-router-dom'],
        motion: ['framer-motion'],
        supabase: ['@supabase/supabase-js'],
      },
    },
  },
},
```

Splits framer-motion (large) and supabase out of the main entry chunk so the homepage doesn't pay for them upfront.

## 5. Reduce unused CSS/JS

- Confirm `tailwind.config` `content` globs cover `./src/**/*.{ts,tsx}` and `./index.html` (it does — verify).
- `lucide-react` icons: already tree-shakable per-named-import (codebase already uses named imports). No change.
- Audit `framer-motion` usage on the homepage hero: replace the 5 `motion.*` wrappers in `HeroCopilotMobile.tsx` with plain elements + a tiny CSS `@keyframes fade-up` utility. This removes the framer-motion dependency from the critical chunk for `/`.

## 6. Reduce main-thread work

- `src/app/providers.tsx` already lazy-loads Alex panels via `requestIdleCallback`. Extend the same pattern to:
  - `AlexRouterDebugHUD`, `AuthDebugHud`, `BootDebugButton` in `src/app/App.tsx` — wrap in `lazy()` + idle mount, and gate behind `import.meta.env.DEV` only.
  - `useJourneyTracker()` inside `MainLayout` — defer subscription with `requestIdleCallback`.
  - `trackCopilotEvent("homepage_loaded")` in `PageHomeCopilot` — wrap in idle callback.
- `AlexCopilotConversation` in `PageHomeCopilot` — convert to `React.lazy` + `<Suspense fallback={null}>` so it doesn't block first paint.

## 7. Cache lifetimes

Lovable's static hosting handles immutable hashed assets (`/assets/*-[hash].js|css`) with long cache automatically. The 8 KiB finding is for `/favicon-*.png` and `/icon-*.png`. We can't edit hosting headers from the repo, but we can:
- Add `<link rel="preload">` only for assets actually used above the fold (already in #1).
- Document this as a hosting-level note (no code change needed; will be addressed when Lovable serves with default 1-year cache for `/public` assets — which it already does for hashed files).

No-op in code; called out for transparency.

## What stays untouched

- All `<meta>`, JSON-LD, `aria-*`, semantic tags (SEO 100, BP 100, A11y 93 preserved).
- Alex behavior, voice config, routing.
- No new images invented; LCP becomes the static `<h1>`.

## Files to edit

- `index.html` — static LCP shell + inline CSS + preload
- `src/components/home-copilot/HeroCopilotMobile.tsx` — remove initial-opacity on `<h1>`, swap motion for CSS where above the fold
- `src/app/App.tsx` — lazy-mount dev huds
- `src/layouts/MainLayout.tsx` — defer journey tracker
- `src/pages/PageHomeCopilot.tsx` — lazy-load `AlexCopilotConversation`, idle-defer tracking
- `vite.config.ts` — explicit minify + manualChunks

## Expected impact

- LCP detected → Performance score jumps from "no score" to a real number (typically 60-80 baseline).
- Main-thread JS for `/` drops via framer-motion chunking + lazy panels.
- Image savings via WebP conversion on the 4 PNGs.
