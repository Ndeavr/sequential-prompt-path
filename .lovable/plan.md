# Fix: Homepage `/` returns `noindex` to Google

## Root cause (found)

The homepage `/` routes through `HomeAbSwitch` (`src/components/home-ab/HomeAbSwitch.tsx`), which randomly buckets each visitor — **including Googlebot** — into one of three variants:

- Bucket A → `PageHomeUnicorn` — indexable ✅
- Bucket B → `src/pages/home/PageHomeVariantB.tsx` — line 176: `<meta name="robots" content="noindex,follow" />` ❌
- Bucket C → `src/pages/home/PageHomeVariantC.tsx` — line 37: `<meta name="robots" content="noindex,nofollow" />` ❌

Bucketing is done client-side via `Math.random()` in `useHomeAbTest`. Googlebot renders JS with a fresh localStorage, so it lands in B or C ~66% of the time. Those variants inject a `noindex` meta via `react-helmet` that overrides the base `<meta name="robots" content="index,follow" />` from `index.html`.

This is exactly what GSC reports: fetch OK, but "noindex detected in robots meta tag" on `/`.

`robots.txt`, `sitemap.xml`, and the prerender edge function (`supabase/functions/prerender/index.ts`) for `/` are all clean and indexable. All other `noindex` occurrences in the repo are on private/app routes (admin, checkout, wizard, claim, founder, thank-you, etc.) and are intentional — no change needed.

## Fix

Variants B and C are **A/B tests of the public homepage** — they share the canonical URL `https://unpro.ca/`. Public homepage variants must be indexable; only the winning variant matters to Google, and canonical takes care of duplicate content.

### Changes

1. **`src/pages/home/PageHomeVariantB.tsx`** (line 176)
   - Remove: `<meta name="robots" content="noindex,follow" />`
   - Add canonical: `<link rel="canonical" href="https://unpro.ca/" />`

2. **`src/pages/home/PageHomeVariantC.tsx`** (line 37)
   - Remove: `<meta name="robots" content="noindex,nofollow" />`
   - Add canonical: `<link rel="canonical" href="https://unpro.ca/" />`

3. **`src/pages/PageHomeUnicorn.tsx`** (bucket A)
   - Ensure canonical `https://unpro.ca/` is present (verify; add if missing) so all three variants agree.

4. **`src/components/home-ab/HomeAbSwitch.tsx`** (defense in depth)
   - Detect bot user agents in `useHomeAbTest` (or here) and force bucket A for `googlebot|bingbot|applebot|duckduckbot|yandexbot|baiduspider|slurp|facebookexternalhit|twitterbot|linkedinbot|gptbot|chatgpt|claudebot|perplexity|google-extended|oai-searchbot|ccbot|meta-externalagent`. This guarantees any future variant that adds `noindex` cannot leak to crawlers.

### Not changing

- `robots.txt`, `sitemap.xml`, prerender function — already correct.
- All other pages with `noindex` (admin, wizard, checkout, founder plans, claim, thank-you, ISR demo, homeowner welcome, mes-proprietes, etc.) — correct, they are private/transactional.
- SEO pages like `RuePage` / `QuartierPage` / `ContractorSeoPage` that conditionally `noindex` thin content — correct pattern, keep.

## Validation after publish

1. `curl -A "Googlebot" https://unpro.ca/` → confirm rendered HTML contains `<meta name="robots" content="index,follow">` and no competing `noindex`.
2. Repeat 3× with `?variant=a`, `?variant=b`, `?variant=c` — none should emit `noindex`.
3. Google Search Console → URL Inspection on `https://unpro.ca/` → "Test live URL" → expect "Indexing allowed: Yes", then click "Request indexing".
4. Re-submit `https://unpro.ca/sitemap.xml` in GSC.

## Business impact

Homepage becomes eligible for indexing on every render, not just 1/3 of them. Unblocks all downstream SEO work (city pages, entrepreneur pages, journal, /pourquoi-unpro) that rely on `/` being crawlable as the graph root.
