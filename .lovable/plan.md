# Growth Architecture — Implementation Plan

Aligns the codebase to the May 2026 SEO/AEO blueprint. We already have most building blocks (`seo_pages` table, `sitemap-xml` edge function, ~28 SEO page templates, schema helpers in `src/lib/seoSchema.ts`). The plan focuses on what's **missing** vs the blueprint, not rebuilding what works.

---

## Phase 1 — Architecture First (this PR)

Goal: make the structure crawlable & citation-ready before scaling content.

### 1.1 Canonical URL routes (blueprint formula)
Add four canonical route families to `src/config/routesConfig.ts` + `src/app/App.tsx`:

```
/solution/:service                           → service hub
/solution/:service/:city                     → service × city (core money page)
/solution/:service/:city/:neighborhood       → depth (Phase 3 ready)
/contractor/:slug/:city                      → contractor profile
/contractor/:slug/:city/reviews
/contractor/:slug/:city/projects
/guide/:topic                                → guide page (HowTo schema)
/guide/:topic/:city                          → localized guide
/project/:slug                               → before/after project
/en/...                                      → English mirrors
```

Existing `/services/:service/:city`, `/probleme/...`, `/s/:slug` pages stay live; we add **301 redirects** in `vite.config` + an edge `_redirects` style rewrite so legacy URLs canonicalize to the new `/solution/...` shape (handled in `src/seo/services/canonicalManager.ts`).

### 1.2 Sitemap index (multi-sitemap)
Refactor `supabase/functions/sitemap-xml` → split into:
- `sitemap_index.xml` (index of below)
- `sitemap-core.xml`
- `sitemap-solutions-fr.xml` / `sitemap-solutions-en.xml`
- `sitemap-contractors.xml`
- `sitemap-guides.xml`
- `sitemap-projects.xml`
- `sitemap-neighborhoods.xml` (empty until Phase 3)

Each sub-sitemap capped at 50k URLs; priority + changefreq per blueprint table. Add webhook trigger on `contractors` insert + `seo_pages` insert that pings `https://www.google.com/ping?sitemap=...`.

### 1.3 Bilingual hreflang
Extend `SeoHead.tsx` to always emit `<link rel="alternate" hreflang="fr-CA">`, `hreflang="en-CA">`, `hreflang="x-default">` pairs. Add `getEnglishCounterpart(path)` helper in `canonicalManager.ts`.

### 1.4 Schema stack (4 types, stacked)
Audit each template and ensure stacking:
- LocalBusiness + HomeAndConstructionBusiness on every `/contractor/...`
- FAQPage on every `/solution/:service/:city`
- BreadcrumbList sitewide (via new `<BreadcrumbSchema/>` in `MainLayout`)
- HowTo on every `/guide/:topic`

Add `src/seo/components/SchemaStack.tsx` that takes a `pageType` and renders the right combo.

### 1.5 AEO page template
Create `src/seo/components/AeoServicePageTemplate.tsx` enforcing:
- H1, then H2 = exact question, answered in first 2 sentences
- Price anchor table (currency, range)
- City + neighborhood + postal prefix in first 100 words
- 5–8 FAQ block (FAQPage JSON-LD)
- 3+ contextual internal links
- Before/after gallery slot with structured alt text

Wire `SolutionFrPage.tsx` + new `/solution/:service/:city` route to use it.

---

## Phase 2 — Content Core (separate PR)

- Generate 30 services × 10 cities = 300 rows in `seo_pages` via a one-off script (`scripts/seed-solution-pages.ts`)
- Publish 10 guides with HowTo schema (extend `src/seo/data/guides.ts`)
- Add price tables to `src/seo/data/services.ts`
- Activate review collection on contractor pages

## Phase 3 — Geographic Expansion
- Expand to 40 cities × 30 services (~1,200 pages)
- Activate `sitemap-neighborhoods.xml` for Montreal + Laval
- Project portfolio template

## Phase 4 — Authority & AEO Dominance
- Annual guide refresh job (cron edge function, January)
- RénoClimat subsidy tracker page
- Authority backlink outreach tracker in `/admin/seo-health`

---

## Technical scope (Phase 1 only — what I will edit)

**New files**
- `src/seo/components/SchemaStack.tsx`
- `src/seo/components/AeoServicePageTemplate.tsx`
- `src/pages/seo/SolutionServicePage.tsx` (`/solution/:service`)
- `src/pages/seo/SolutionServiceCityPage.tsx` (`/solution/:service/:city`)
- `src/pages/seo/ContractorCityPage.tsx` (`/contractor/:slug/:city`)
- `src/pages/seo/ProjectPage.tsx` (`/project/:slug`)
- `supabase/functions/sitemap-index/index.ts`
- `supabase/functions/sitemap-solutions/index.ts`
- `supabase/functions/sitemap-contractors/index.ts`
- `supabase/functions/sitemap-guides/index.ts`
- `supabase/functions/sitemap-projects/index.ts`

**Edited**
- `src/config/routesConfig.ts` — new ROUTES constants
- `src/app/App.tsx` — register new routes
- `src/seo/components/SeoHead.tsx` — hreflang pairs
- `src/seo/services/canonicalManager.ts` — `/solution/...` formula + EN counterpart
- `supabase/functions/sitemap-xml/index.ts` — convert to index that delegates
- `public/robots.txt` — point to `sitemap_index.xml`

**No DB migration in Phase 1** — `seo_pages` already supports this. Phase 2 adds `seo_pages.lang` if not present and a `seo_projects` table.

---

## Out of scope
- No business/auth changes
- No Alex/voice changes
- No content authoring (Phase 2)
- No contractor onboarding changes — only their public URL shape

Confirm and I'll execute Phase 1.
