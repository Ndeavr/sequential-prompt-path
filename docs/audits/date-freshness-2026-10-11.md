# Public date freshness audit — 11 October 2026

## Scope and verified baseline

- Existing UNPRO project only; no production publication, remote writes, pricing, payment, SMS, onboarding, Clara or affiliate changes.
- Read-only database checks: 65 published blog articles, 7 published journal articles (3 English), 8 published SEO articles. All 80 original publication/creation dates are in 2026; zero before 2026.
- Blog/journal editorial publication ranges: March–June and May–June 2026. SEO has no dedicated publication timestamp; its existing creation dates were preserved, not relabelled as October reviews.
- Zero 2024/2025 title/meta matches across those 80 articles; one blog body has 2024 cost guidance (pavage-asphalte-laval-entree-garage). Zero journal/SEO body matches.
- Static scan: 2,203 source/public files in pages, components, SEO data and public assets. 73 non-admin candidate files contain older-year/numeric tokens; this is NOT a count of stale publications (includes building years, timers, dimensions and amounts).
- Seven 2024/2025 source occurrences after edits: one explicit historical-price warning; three private document-title examples; one construction-year upper bound (corrected); two private syndicate demonstration/history values (unchanged).
- Seven XML sitemap files parsed: 159 entries total including six index entries, 134 lastmod fields; zero before 2026 or after 11 October 2026. Old blog/journal timestamps retained. No RSS/Atom feed found in searched public/scripts/SEO sources.

## Changes

1. One genuine October update: entrepreneur AI-search guide, original 22 August publication preserved. Revised AEO explanation, FAQ and guidance on Google AI eligibility to remove misleading extra-optimization requirements; visible update, OpenGraph, JSON-LD and sitemap all use 11 October 2026.
   Source fetched successfully: https://developers.google.com/search/docs/appearance/ai-features?hl=fr . Google confirms existing SEO principles, no required special AI file/schema, visible-content consistency and no indexing/display guarantee. No statistics or prices invented.
2. Two public legacy listing URLs (`/blog2`, `/conseils-renovation`) now reuse the existing real blog collection instead of 12 demo posts. URLs remain intact.
3. Blog/journal publication dates explicitly labelled and formatted in Quebec time with semantic time elements. Original timestamps unchanged.
4. Shared editorial-date helper rejects future revisions, preserves originals and prevents date-only UTC day shifts. Blog/journal/SEO no longer infer a substantive review from automatic updated_at triggers. Explicit blog/SEO schema review dates are accepted only when valid.
5. Historical 2024 paving prices clearly identified as historical, NOT presented as verified October 2026 estimates. Amounts and original text retained; no fresh price claimed.
6. Lead-pipe city template corrected from current year + 1 to current year; fabricated per-visit Article publication removed because no verified publication date is available.
7. Two shared footer copyrights now use the current year. Construction-year slider no longer ends in 2024.
8. Sitemap generator uses evidence-backed revisions; only the genuinely revised static guide receives new page lastmod. Blog/journal XML entries unchanged. Generated index/corpus timestamps indicate generation, not editorial review.

## Checks actually performed

- Vitest: 9/9 passed (`editorial-date-freshness.test.tsx`, `blog-three-quotes-article.test.tsx`).
- Focused ESLint on helper, legacy listing and new test passed; git diff whitespace check passed.
- Official sitemap generator ran successfully for pages/blog/journal/entities/problems; contractor public-view query returned HTTP 401. Contractor sitemap was already empty before this work and remains unchanged. No permission bypass attempted.
- Harness automatic compilation: build OK after code edits; no manual build/typecheck executed.
- Chromium localhost desktop 1280×1800 and simulated mobile 390×844: blog, legacy real listing, inspection blog, historical paving blog, journal, AI guide and lead-pipe city all rendered without horizontal overflow. Guide visible original/update dates, OG and Article schema asserted; paving warning and city 2026 title asserted. Screenshots inspected for guide/paving mobile.
- Initial guessed guide URL `/guides/choisir-entrepreneur` returned unavailable; no fix attempted for an invalid slug. Final run: 20 browser page checks (10 routes × desktop/mobile) rendered, including valid `/guides/comment-choisir-couvreur`, `/articles/comment-intelligence-artificielle-trouve-bons-clients-entreprise` and `/journal/ia-prevention-problemes-residentiels-en`; no horizontal overflow. These are rendering/date checks, not full interaction tests.

## Preserved / remaining

- All 80 database originals preserved and NOT stamped October. The single substantively updated guide is a separate static article; the paving warning is contextual, not a full pricing review.
- No broad claim that every public route was rendered or every older-year fact validated. Historical building/legal facts and private document examples kept.
- Full price/grant/legal review needs authoritative current sources per article; defer that larger review after the two real paid activations. No invented updated numbers.
- SEO creation-versus-publication provenance, crawler prerender consistency and authenticated/private demo-data cleanup remain separate evidence-dependent work; no backend/deployment changes made here.
- Real devices and published-site verification of these changes are not performed; these changes have not been published.

## File inventory

- Shared date helper/test: `src/seo/editorialDates.ts`, `src/test/editorial-date-freshness.test.tsx`.
- Articles/listings: `src/pages/blog/BlogArticlePage.tsx`, `src/pages/blog/BlogIndexPage.tsx`, `src/pages/BlogPage2.tsx`, `src/pages/journal/JournalArticlePage.tsx`, `src/pages/seo/SeoArticlePage.tsx`, `src/pages/articles/PageApparaitreRechercheIA2026.tsx`, `src/components/blog/ArticleContentWithVisuals.tsx`.
- Other date display: `src/components/layout/SiteFooterPremium.tsx`, `src/components/scroll-story/ImmersiveFooterGrid.tsx`, `src/pages/lead-pipe/PagePlombEauCity.tsx`, `src/pages/CoproprietePage.tsx`.
- Generator: `scripts/generate-sitemaps.ts`; generated changes only in `public/sitemap-pages.xml`, `public/sitemap.xml`, `public/llms-full.txt`. Blog/journal/contractor XML unchanged.
- Documentation: this report, `roadmap.md`, architecture rule in `AGENTS.md`.