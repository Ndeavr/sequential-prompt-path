

# UNPRO Google Index Domination System

## Summary

The site is a pure React SPA with no server-side rendering. Google sees an empty `<div id="root">` for all pages. The sitemap edge function exists but points to a wrong base URL pattern (`/api/sitemap`). Contractor public pages table is empty. This plan fixes all of it across 10 blocks.

---

## Technical Details

### Block 1 — Prerender Edge Function for Googlebot

Create `supabase/functions/prerender/index.ts` — a lightweight HTML renderer that serves static HTML snapshots to crawlers.

- Detect bot user-agents (Googlebot, Bingbot, etc.)
- For each known route pattern, query Supabase for the page data and return a complete HTML document with:
  - Proper `<title>`, `<meta description>`, OG tags
  - JSON-LD structured data
  - Visible text content in semantic HTML (h1, p, article)
  - Canonical URL
- Route patterns to handle: `/blog/:slug`, `/contractors/:id`, `/pro/:slug`, `/probleme/:slug`, `/ville/:slug`, `/services/:cat/:city`, `/s/:slug`, `/profession/:slug`, `/solution/:slug`, `/renovation/:type/:city`
- Non-bot requests get a redirect to the SPA (302 to same path)
- Static pages (homepage, /services, /pricing, etc.) return hardcoded HTML with real copy

### Block 2 — Fix robots.txt

Update `public/robots.txt`:
- Fix sitemap URL to `https://unpro.ca/sitemap.xml`
- Add `Disallow` for `/dashboard`, `/admin/`, `/pro/dashboard`, `/login`, `/signup`, `/onboarding`, `/settings/`, `/checkout/`
- Keep `Allow: /` for all public paths

### Block 3 — Sitemap Proxy Route

The current sitemap function uses `/api/sitemap?segment=X` which is an edge function URL, not accessible at `unpro.ca/sitemap.xml`.

Create a lightweight redirect or a new edge function `sitemap-index` that serves at a clean URL. Update the sitemap function's index to use `https://unpro.ca/functions/v1/sitemap?segment=X` as the correct loc URLs.

Also add a `contractors` segment that pulls from the `contractors` table directly (since `contractor_public_pages` is empty), generating `/contractors/:id` URLs.

### Block 4 — Contractor Public SEO Pages

Create a new public route `/entrepreneur/:slug` that renders a SEO-optimized contractor profile page.

- New page: `src/pages/seo/ContractorSeoPage.tsx`
- Resolves contractor by slug (generate slug from `business_name + city`)
- Renders: H1 with business name, services, city, description, trust badges, reviews, CTA
- Injects `SeoHead` + `LocalBusiness` + `BreadcrumbList` JSON-LD
- Route added to router.tsx

Create an edge function `contractor-seo-resolve` that:
- Accepts a slug
- Finds the matching contractor
- Returns full profile data for rendering

### Block 5 — Auto-Generate `contractor_public_pages` Records

Create a database migration + edge function `seed-contractor-pages` that:
- For each contractor with `business_name` not null
- Generates a slug: `kebab(business_name)-kebab(city)`
- Inserts into `contractor_public_pages` with `is_published = true`
- Updates sitemap contractor-profiles segment to use these

### Block 6 — Structured Data Engine

Create `src/seo/components/SeoStructuredDataInjector.tsx` — a component used in MainLayout that auto-injects based on current route:

- `/` → `WebSite` + `Organization`
- `/contractors/:id` or `/entrepreneur/:slug` → `LocalBusiness` + `BreadcrumbList`
- `/services/:cat/:city` → `Service` + `BreadcrumbList`
- `/probleme/:slug` → `FAQPage` (from problem FAQ data) + `BreadcrumbList`
- `/blog/:slug` → `Article` (already exists, ensure consistency)

### Block 7 — Internal Linking Engine

Create `src/components/seo/InternalLinkGrid.tsx`:
- Given current page context (city, category, problem), renders a grid of related internal links
- City pages link to services in that city
- Service pages link to contractors and problems
- Problem pages link to solutions and cities
- Auto-injected at bottom of SEO pages via a `SeoInternalLinks` wrapper

### Block 8 — Admin SEO Health Dashboard

Create `src/pages/admin/PageSeoIndexHealth.tsx`:
- **Index Health Card**: Count of pages in sitemap, pages with metadata, pages missing schema
- **Contractor Visibility**: List contractors, show which have public pages, which are in sitemap
- **Page Quality Scanner**: For each public page type, check: has title, has description, has H1, has schema, word count > 300, has CTA
- **Live Index Tester**: Input a keyword (e.g. "Zappa"), system checks if any page contains it, if it's in sitemap, internal link count
- **Fast Fixes Queue**: Pages needing attention sorted by priority

Route: `/admin/seo-index-health`

### Block 9 — Meta Tag Hardening

Update `src/seo/components/SeoHead.tsx`:
- Add `hreflang` support (`fr-CA` primary, `en` alternate)
- Ensure canonical is always set (derive from current pathname if not provided)
- Add `article:published_time` and `article:modified_time` for blog pages

Update `index.html`:
- Add default canonical `<link rel="canonical" href="https://unpro.ca" />`

### Block 10 — Weekly SEO Alert System (Edge Function)

Create `supabase/functions/seo-weekly-digest/index.ts`:
- Query all contractors without public pages
- Query pages with thin content (< 300 words in description)
- Query sitemap segments, count URLs
- Return JSON summary (can be triggered by cron to send email later)

---

## Database Changes

**Migration**: Auto-populate `contractor_public_pages` from existing `contractors` table.

```sql
INSERT INTO contractor_public_pages (contractor_id, slug, is_published, seo_title, seo_description)
SELECT 
  id,
  lower(regexp_replace(regexp_replace(business_name || '-' || coalesce(city, ''), '[^a-zA-Z0-9àâäéèêëïîôùûüÿçœæ]+', '-', 'g'), '-+', '-', 'g')),
  true,
  business_name || ' — Entrepreneur vérifié | UNPRO',
  'Profil vérifié de ' || business_name || coalesce(' à ' || city, '') || '. Services, avis et disponibilité sur UNPRO.'
FROM contractors
WHERE business_name IS NOT NULL
ON CONFLICT (contractor_id) DO NOTHING;
```

---

## Files Created/Modified

| Action | File |
|---|---|
| Create | `supabase/functions/prerender/index.ts` |
| Create | `src/pages/seo/ContractorSeoPage.tsx` |
| Create | `src/seo/components/SeoStructuredDataInjector.tsx` |
| Create | `src/components/seo/InternalLinkGrid.tsx` |
| Create | `src/pages/admin/PageSeoIndexHealth.tsx` |
| Create | `supabase/functions/seo-weekly-digest/index.ts` |
| Modify | `public/robots.txt` |
| Modify | `supabase/functions/sitemap/index.ts` |
| Modify | `src/seo/components/SeoHead.tsx` |
| Modify | `index.html` |
| Modify | `src/layouts/MainLayout.tsx` — add SeoStructuredDataInjector |
| Modify | `src/app/router.tsx` — add `/entrepreneur/:slug` and `/admin/seo-index-health` routes |
| Migration | Seed `contractor_public_pages` from contractors |

