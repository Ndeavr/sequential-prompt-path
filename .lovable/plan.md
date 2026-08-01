## Where unpro.ca stands (source: Semrush, CA database)

| Metric | Value |
|---|---|
| Organic keywords | 81 |
| Estimated organic traffic | ~0/mo |
| Best position | 48 (`désamiantage terrebonne`) |
| Pages ranking | mostly `/s/{service}-{ville}` programmatic pages |

Diagnosis: the programmatic SEO engine is working — 81 keywords are being picked up across real Quebec service+city terms, several with genuine demand (`drain français saint-hyacinthe` 720/mo, `rénovation cuisine saint-jean-sur-richelieu` 390/mo, `analyse moisissure mirabel` 320/mo, `loi 16 copropriété` 1 000/mo). But **every single one sits at position 48-96**, i.e. page 5-10. Nothing is on page 1-2, so traffic is effectively zero. The site is indexed but not competitive.

The stored SEO findings are **stale** (last scan 2026-07-07, 5 failing findings against an older commit) — they are not a current diagnosis of the project.

## Plan

### 1. Fresh SEO scan
Run a new SEO review so findings reflect the current commit instead of the July 7 snapshot.

### 2. Fix per-page metadata (currently duplicated)
The stale scan flagged duplicate titles/descriptions and identical social tags sitewide. Verify against the current code, then:
- Ensure every programmatic `/s/:slug` and `/problems/:problem/:city` page emits a unique `<title>` under 60 chars and a unique description, built from service + city.
- Add self-referencing `og:url` per route (today only the static index.html og tags exist for non-JS crawlers).

### 3. Concentrate authority instead of spreading it
30k+ thin programmatic pages at position 60+ is the classic symptom of no internal link equity per page. Fix the category, not one page:
- Pick the ~20 highest-demand service×city combos already ranking (drain français, moisissure, fissure fondation, désamiantage, rénovation cuisine) and deepen those pages: real FAQ, price ranges, local proof, contractor entities.
- Add internal links from `/journal` and `/blog` articles into those 20 pages so crawl equity flows to them.

### 4. Own `loi 16 copropriété` (1 000/mo, position 96)
Highest-volume term the site already touches, and it maps directly to the condo-manager product. Expand `/blog/loi-16-condo-quebec-obligations-syndicats` into a full compliance guide with FAQPage + Article schema, and link it from the condo surfaces.

### 5. Add the French-drain guide flagged by Semrush
Create `/guides/entretien-drain-francais` (signs of failure, maintenance steps), interlinked with the `drain-francais-{ville}` pages that already rank.

## Technical notes
- Metadata work stays in `src/seo/components/SeoHead.tsx` and the programmatic page components — no change to `canonicalManager` rules or the domain strategy.
- No sitemap regeneration, no `lastmod` fabrication; sitemaps already index the relevant paths.
- Classic Vite SPA: `<Helmet>` head changes are visible to Googlebot but not to non-JS social crawlers. Accurate per-page social previews would need SSR — [what the upgrade gives you](https://lovable.dev/blog/building-apps-using-tanstack-start).

## Scope check
Steps 4 and 5 create new content pages. Tell me if you want the review + technical fixes only (steps 1-3), or the full set.
