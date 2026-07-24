
# UNPRO — Production Metadata, Social Preview, Favicons & App Icons

## Root cause (audit findings)

- `index.html` static head still uses "Passeport Maison" as the primary title/description and OG. This is what crawlers, iMessage, LinkedIn, Slack, and Google see.
- Per-route Helmet in `src/pages/PageHomeCopilot.tsx` (the actual `/` and `/index` renderer) also sets a "Passeport Maison" title — this must be repositioned to UNPRO.
- **No `manifest.webmanifest` exists** in `public/` and none is linked from `index.html` → Android install / PWA broken.
- Favicons: only chrome PNGs + generic `unpro-favicon.svg`. Missing: `favicon.ico`, `apple-touch-icon.png` (180×180), `android-chrome-192/512`, `maskable-512`.
- OG image `og/unpro-og-v3.jpg` alt says "Trouvez le bon entrepreneur" — outdated positioning; the JPG itself likely displays wrong headline. Needs regen.
- Organization JSON-LD description references "Home Passport" as primary — needs to lead with "AI Home Intelligence Platform".
- Two OG description systems drift: static head (fr) vs `SeoHead.tsx` client-side (fr). Repair by consolidating the static head first (crawler-visible) and aligning client-side per route.

## Scope constraints

- No new metadata system. Reuse `index.html` (static, crawler-safe) + existing `SeoHead` / react-helmet-async for per-route.
- No visible page redesign; brand/logo assets already approved in `src/config/branding.ts`.
- Bilingual routing preserved (client Helmet handles FR/EN counterpart on English routes).

## Changes

### 1. `index.html` — canonical static head

- Title → `UNPRO | Votre plateforme d'intelligence résidentielle propulsée par l'IA` (site is fr-CA default; English routes override via Helmet).
- Description → approved FR copy: *"UNPRO aide les propriétaires à prendre de meilleures décisions de rénovation grâce à l'IA, à des recommandations personnalisées et au jumelage avec le bon entrepreneur — pas seulement trois soumissions."*
- OG/Twitter title + description mirror the above; keep `og:site_name=UNPRO`, `og:url=https://unpro.ca/`, `og:locale=fr_CA`, add `og:locale:alternate=en_CA`.
- Update `og:image` to a fresh versioned URL (`?v=20260724`) and update alt to `UNPRO — Votre plateforme d'intelligence résidentielle propulsée par l'IA`.
- Add favicon/app-icon link set:
  - `<link rel="icon" href="/favicon.ico" sizes="any">`
  - `<link rel="icon" type="image/svg+xml" href="/unpro-favicon.svg">`
  - `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">`
  - `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`
  - `<link rel="manifest" href="/manifest.webmanifest">`
  - `<meta name="application-name" content="UNPRO">`
  - `<meta name="apple-mobile-web-app-title" content="UNPRO">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
- Update Organization JSON-LD `description` to lead with "AI Home Intelligence Platform" (Passeport Maison stays only as one feature in `knowsAbout`).
- Keep FAQ + Alex JSON-LD (unchanged content).

### 2. Web App Manifest — `public/manifest.webmanifest` (new)

```json
{
  "name": "UNPRO",
  "short_name": "UNPRO",
  "description": "AI Home Intelligence Platform",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#060B14",
  "theme_color": "#060B14",
  "lang": "fr-CA",
  "icons": [
    { "src": "/android-chrome-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/android-chrome-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/maskable-512.png",       "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 3. Icon assets — generate from approved UNPRO mark

Generate premium raster set from the approved UNPRO "infinity bubbles" mark (blue on transparent for standard, blue on white with safe-zone padding for maskable):

- `public/favicon.ico` (multi-size 16/32/48)
- `public/favicon-32.png` (already exists — keep; add if missing)
- `public/apple-touch-icon.png` (180×180, opaque background per Apple)
- `public/android-chrome-192.png` (192×192, transparent)
- `public/android-chrome-512.png` (512×512, transparent)
- `public/maskable-512.png` (512×512, opaque, ~20% safe-zone)

Delete obsolete: `public/unpro-icon-fleur.png`, `unpro-logo-house.png` (only if not referenced — verify with `rg` before deleting).

### 4. Open Graph image — `public/og/unpro-og-v4.jpg`

Regenerate at 1200×630 (premium quality tier for typography):
- UNPRO wordmark top-left.
- Headline: **Your AI Home Intelligence Platform**.
- Sub: *Smarter home improvement decisions. Not just 3 quotes.*
- Cinematic dark `#060B14` with subtle blue glow — brand-consistent.
- No fake scores/ratings.

Update all references (`index.html`, `src/seo/ogImage.ts`) to `/og/unpro-og-v4.jpg?v=20260724`.

### 5. Per-route Helmet homepage fix

- `src/pages/PageHomeCopilot.tsx`: replace Helmet title/description/OG to the approved UNPRO positioning (FR).
- `src/pages/PageHomeSimple.tsx` and `src/pages/Home.tsx`: same fix (any of them may be the active route via `HomeWithFeatureFlag`).
- `src/pages/home/PageHomeVariantC.tsx`: replace title with the approved FR title.
- Leave English routes to `SeoHead` — update the DEFAULT_OG_IMAGE constant and default FR description in `SeoHead` fallbacks if any.

### 6. Structured data (`src/lib/seoSchema.ts`)

- `organizationSchema.description`: rewrite to lead with "AI Home Intelligence Platform" (keep bilingual services in `knowsAbout`). No new schemas; reuse existing helpers.
- `websiteSchema.description` aligned to same positioning.

## Files touched

- `index.html`
- `public/manifest.webmanifest` (new)
- `public/favicon.ico`, `apple-touch-icon.png`, `android-chrome-192.png`, `android-chrome-512.png`, `maskable-512.png` (new)
- `public/og/unpro-og-v4.jpg` (new, regenerated)
- `src/seo/ogImage.ts`
- `src/pages/PageHomeCopilot.tsx`, `PageHomeSimple.tsx`, `Home.tsx`, `home/PageHomeVariantC.tsx`
- `src/lib/seoSchema.ts`

## Verification

1. `curl -sI` each new asset → HTTP 200 on preview.
2. `curl -s https://<preview>/ | grep -E 'og:title|<title>|manifest|apple-touch'` shows new copy and links.
3. Playwright: load `/`, screenshot browser tab title area + `document.title` + `document.querySelector('link[rel=manifest]')`.
4. Validate manifest JSON (`bunx web-app-manifest-validator` or manual parse).
5. Confirm no reference to `unpro-og-v3.jpg` remains (`rg unpro-og-v3`).
6. Publish; note that social crawler caches (LinkedIn/FB/iMessage) will retain the old preview until they refetch — user can force refresh via each platform's debugger.

## Not in scope

Outreach pipeline, SEO/sitemap regeneration, AI corpus, contractor systems — untouched.
