# UNPRO Brand Ecosystem Engine

This is a very large system (DB + extraction pipelines + AI classifier + monochrome logo generator + premium UI + admin dashboard + SEO pages). Trying to ship it all in one pass would produce shallow, unstable work. I propose to build it in 4 phases, each shippable on its own.

## Phase 1 — Foundation (DB + Brand Library + Premium UI)

**Goal:** Have a real brand catalog and premium UI components rendered on contractor profiles, even before auto-detection runs.

**DB migrations** (Supabase, RLS-ready):
- `brands` (id, name, slug, category, subcategory, country, premium_score, trust_score, market_position, logo_svg_url, logo_png_url, logo_grey_svg_url, logo_grey_png_url, website, description)
- `brand_aliases` (brand_id, alias, locale)
- `brand_categories` (slug, label_fr, label_en, tier)
- `brand_logos` (brand_id, variant: color/grey/white/black, format, url, source)
- `contractor_brand_profiles` (contractor_id, brand_id, confidence_score, source_type, source_reference, is_primary_ecosystem, detected_at)
- `brand_detection_logs` (contractor_id, source_type, raw_text, brands_found, status)
- `brand_scores` (contractor_id, ecosystem_quality, premium_score, commercial_score, technical_score, luxury_score, budget_tier)
- `brand_relationships` (brand_id, related_brand_id, relation_type)
- `brand_assets_cache` (url, content_hash, storage_path, fetched_at)
- Storage bucket `brand-assets` (public read)

**Seed data:** ~60 known QC/CA construction brands (SOPREMA, GAF, BP, Maibec, Rockwool, Owens Corning, Hilti, Makita, Festool, DeWalt, Milwaukee, Bosch, CAT, Kubota, John Deere, Velux, Pella, TimberTech, Trex, Kohler, Moen, Delta, Mitsubishi, Lennox, Carrier, Daikin, Generac, Schluter, Mapei, etc.) with category + premium tier.

**UI components** (`src/features/brandEngine/components/`):
- `LogoMonochromeRenderer.tsx` — SVG with CSS filter for grey/white/black + color on hover
- `BrandPill.tsx`
- `BrandCloud.tsx` — animated marquee
- `BrandCarousel.tsx`
- `ContractorEcosystemCard.tsx`
- `BrandTrustMeter.tsx`
- `BrandCategoryGrid.tsx`
- `BrandDNAVisualizer.tsx`

**Hook:** `useContractorBrands(contractorId)`

**Integration:** Add a "Marques & Écosystèmes de confiance" section to the existing contractor public profile page.

## Phase 2 — Logo Extraction + Monochrome Pipeline

- Edge function `brand-fetch-logo`: tries Brandfetch API (needs `BRANDFETCH_API_KEY`), falls back to Clearbit Logo API (`https://logo.clearbit.com/{domain}`), caches into `brand-assets` bucket, writes `brand_logos` rows.
- Edge function `brand-generate-monochrome`: takes SVG → strips fills, applies `currentColor`; for PNG, uses canvas-based luminance threshold to produce grey/white/black PNGs; uploads to bucket.
- Admin button "Refresh logos" on each brand row.

## Phase 3 — Detection Engine

- Edge function `brand-detect-from-text` (Lovable AI Gemini 2.5 Flash) — input: text/OCR; output: brand_ids + confidence. Used by website scrape, OCR, Alex transcript, reviews.
- Edge function `brand-detect-from-website` — uses Firecrawl scrape (markdown + links + images), pipes to text detector, also matches `brand_aliases` regex.
- Edge function `brand-detect-from-image` — Gemini 2.5 Pro vision on uploaded photos/invoices.
- Edge function `brand-classify-contractor` — aggregates `contractor_brand_profiles` → writes `brand_scores` (ecosystem quality, premium, commercial, technical, luxury, budget tier).
- Hook into existing contractor onboarding (after website enrichment) to trigger `brand-detect-from-website` then `brand-classify-contractor`.

## Phase 4 — Admin Dashboard + SEO Pages

- `/admin/brand-intelligence`: detected brands, missing logos, failed extractions, ecosystem rankings, heatmap by city.
- SEO routes: `/marques/:slug`, `/marques/:slug/:ville`, `/entrepreneurs/:specialty/marque/:brand` — server-rendered via existing SEO programmatic engine, with structured data.

## Recommendation

Approve **Phase 1 only** for this turn. It delivers immediate visible value (premium brand sections on contractor profiles, monochrome logo system, full DB foundation), and unblocks every subsequent phase without committing to the heavier extraction/AI work yet.

After Phase 1 ships and you've reviewed the visual result, I'll proceed phase-by-phase.

## Out of scope for this plan
- Replacing existing AIPP scoring — brand scores will feed into it later via a separate plan.
- Public homeowner-facing brand filters (Phase 4+).
- Stripe/billing changes.

## Key technical notes
- Monochrome SVG strategy: replace `fill="..."` with `fill="currentColor"` server-side; component uses `text-foreground/60` then `group-hover:text-foreground` for color transitions. PNG fallback uses CSS `filter: grayscale(1) brightness(...)`.
- All logo URLs go through Supabase Storage (`brand-assets` bucket) for CDN + cache.
- RLS: `brands` and `brand_logos` public read; `contractor_brand_profiles` readable for verified contractors' public view; admin write only via security-definer functions.
