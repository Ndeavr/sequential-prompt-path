# Phase 2 — Brand Logo Extraction + Monochrome Pipeline

Goal: every brand in `brands` automatically gets a color logo + a premium monochrome variant, cached on the `brand-assets` storage bucket and surfaced through `LogoMonochromeRenderer` with zero manual upload.

## What ships

### 1. Storage bucket
- Create `brand-assets` bucket (public read), folder layout:
  - `logos/color/{slug}.svg|png`
  - `logos/mono/{slug}.svg|png`
- RLS: public SELECT, service-role write only.

### 2. Edge function — `brand-fetch-logo`
Input: `{ brand_id }` or `{ slug }`.
Pipeline:
1. Load brand row (name, slug, website, existing logos).
2. Skip if `logo_svg_url` or `logo_png_url` already set AND `force !== true`.
3. Try sources in order, stop on first success:
   - **Brandfetch** `https://api.brandfetch.io/v2/brands/{domain}` (uses `BRANDFETCH_API_KEY` if present) → pick best SVG, fallback PNG.
   - **Clearbit Logo** `https://logo.clearbit.com/{domain}?size=512&format=png` (no key, free).
   - **Google favicon** `https://www.google.com/s2/favicons?domain={domain}&sz=256` (last-resort PNG).
4. Download bytes → upload to `brand-assets/logos/color/{slug}.{ext}`.
5. Call internal `brand-generate-monochrome` with the color asset.
6. Update `brands` row: `logo_svg_url`, `logo_png_url`, `logo_grey_svg_url`, `logo_grey_png_url`, `logo_source`, `logo_fetched_at`.
7. Insert row in `brand_logos` (history of variants + provenance).
8. Log to `brand_detection_logs` (source=`logo_fetch`, status, latency).

### 3. Edge function — `brand-generate-monochrome`
Input: `{ brand_id, source_url, mime }`.
- **SVG path**: parse with regex/`deno-dom`, strip `fill=`/`stroke=` color attrs, replace inline style colors, inject `fill="currentColor"` on root + paths. Save as `logos/mono/{slug}.svg`.
- **PNG path**: use `imagescript` (Deno) → load → for each pixel, compute luminance, threshold at 0.55 → output white-on-transparent (mono mask). Save as `logos/mono/{slug}.png`.
- Returns public URLs of mono variants.

### 4. Edge function — `brand-backfill-logos`
Admin trigger. Iterates `brands` where `logo_svg_url IS NULL AND logo_png_url IS NULL`, fans out to `brand-fetch-logo` with concurrency 5, rate-limited (250ms). Returns `{ processed, succeeded, failed }`.

### 5. DB migration
- `brands`: add `logo_source text`, `logo_fetched_at timestamptz`, `logo_attempts int default 0`, `logo_last_error text`.
- `brand_logos` already exists from Phase 1 — add index on `(brand_id, variant)`.
- Storage bucket + RLS policies.
- Trigger on `brands` INSERT: enqueue async fetch via `pg_net` POST to `brand-fetch-logo` (fire-and-forget, no blocking).

### 6. Admin UI — `/admin/brand-intelligence/logos` (minimal)
- Table of brands with: logo preview (mono + color hover), source, fetched_at, status, "Refetch" button.
- Top action: **Backfill missing** (calls `brand-backfill-logos`).
- Filter: missing only / failed only / all.
- Lives at `src/pages/admin/AdminBrandLogos.tsx`, registered in admin router.

### 7. Wiring
- `LogoMonochromeRenderer` already consumes `logo_grey_svg_url` / `logo_grey_png_url` → no change needed; logos appear automatically once cached.
- `useContractorBrands` unchanged.

## Out of scope (deferred to Phase 3)
- AI brand detection from text/website/photo (`brand-detect-from-*`).
- Public `/marques/:slug` SEO pages.
- Contractor-side "claim brand certification" flow.
- Brandfetch webhook for logo updates.

## Secrets
- Optional: `BRANDFETCH_API_KEY` — if absent, function falls back to Clearbit + Google favicon (still works).

## Success criteria
- Run `brand-backfill-logos` once → ≥80% of the 60 seeded brands have both color + mono assets cached on `brand-assets`.
- `ContractorEcosystemSection` and `BrandCloud` render real logos in monochrome with color-on-hover, no broken images.
- New brand inserted → logo appears within ~5s without manual action.

## Phase order after this
- Phase 3: detection engine (text/website/image → `contractor_brand_profiles`).
- Phase 4: SEO pages + admin intelligence dashboard.

Approve to ship Phase 2.
