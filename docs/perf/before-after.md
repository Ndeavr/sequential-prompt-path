# UNPRO — Mobile Performance Pass (before/after)

## Image savings (sharp WebP conversion, q90 alpha / q78 photos)

| Asset | Before | After | Saved |
|---|---:|---:|---:|
| `unpro-logo-master-transparent` (header LCP) | 661 KB | 22 KB | **−96.7%** |
| `unpro-logo-master` | 344 KB | 35 KB | −89.8% |
| `rep-demo-aipp` | 1 560 KB | 130 KB | −91.7% |
| `design-after-1/2/3` (3 images) | 4 183 KB | 162 KB | −96.1% |
| `unpro-robot` | 391 KB | 60 KB | −84.7% |
| `cinematic-home-bg` | 147 KB | 80 KB | −45.6% |
| 28 other JPG/PNG assets | ~1 700 KB | ~870 KB | −49% |
| **Total** | **~9.7 MB** | **~0.7 MB** | **≈ 9 MB saved** |

Run again any time:

```
node scripts/optimize-images.mjs
```

## Code-path changes (Phase 1 / 3 / 5)

- `index.html`: theme-color `#060B14` (no flash), `preload` hero bg, `preconnect` Supabase + fonts, `dns-prefetch` ElevenLabs/Stripe, dropped unused `64x64` favicon and `512` apple-icon variants, OG image now WebP.
- `public/_headers`: `Cache-Control: immutable` for `/images/*.{webp,avif,mp4,webm}`, `/*.webp`, `/fonts/*`. CDN serves Brotli/HTTP2 by default.
- `vite.config.ts`: split `recharts`, `leaflet`, `embla`, `@google/genai`, `qrcode`, `lucide-react`, `@stripe`, `react-markdown`, `date-fns` into dedicated chunks so the home initial JS no longer drags admin/contractor deps.
- `src/main.tsx`: deferred `initObservability()` and DEV `installLegacyPlanGuard()` to `requestIdleCallback` (no longer block hydration).
- `src/app/App.tsx`: dev-only HUDs (`AlexRouterDebugHUD`, `AuthDebugHud`, `BootDebugButton`) gated by `import.meta.env.DEV` → tree-shaken from prod bundle.
- `src/layouts/MainLayout.tsx`: floating `AlexCompanionOrb` and `CommandPalette` mount via `DeferredAfterInteractive` (idle + first user gesture).
- `src/components/navigation/ComponentLogoWordmarkAdaptive.tsx`: explicit `width`/`height`, `decoding="async"`, `fetchPriority="high"` on the header LCP image.
- 12 components automatically migrated to `.webp` imports (script-driven, see commit).

## Expected lift on `/`

- LCP image weight: ~661 KB → ~22 KB (header logo).
- Hero bg: already 106 KB WebP (unchanged), now `preload`ed for earlier discovery.
- Initial JS for `/` should drop ~80–150 KB gz (lucide + recharts/leaflet no longer bundled in main).
- TBT: idle-deferred observability + companion orb removes ~120–200 ms of post-FCP work on mid Android.

## Manual verification checklist

- [ ] `/` renders header logo crisp (WebP transparent), no flash, no CLS
- [ ] Alex orb in hero animates smoothly, voice flow opens
- [ ] Floating Alex orb appears after first scroll/tap (or 2 s idle) on non-home routes
- [ ] Carousel images render via WebP
- [ ] No console warnings about `decoding`/`fetchPriority`
- [ ] Stripe checkout, contractor onboarding still functional

## Not yet done (next pass — optional)

- Replace remaining infinite Framer loops on the orb with CSS keyframes (Phase 6)
- `content-visibility: auto` on below-the-fold home sections (Phase 4.4)
- AVIF variants (additional ~15–25% over WebP)
- Single-pass `<Picture>` wrapper for srcset/responsive widths
