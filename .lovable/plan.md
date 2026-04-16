

# PageArticlesRecentCompressedFeed — Plan

## What exists today
- **No `/articles` route** — only `/articles/:slug` (detail page using `SeoArticlePage.tsx`)
- Data lives in `seo_articles` table (6 published articles) with `content_html`, `word_count`, `city`, `service_category`, `slug`, `title`, `meta_description`
- An unused `BlogPage2.tsx` uses mock data — will not be touched
- `ArticleCard.tsx` exists as a shared component but uses mock blog post shape

## What we'll build

### 1. New page: `src/pages/articles/PageArticlesRecentCompressedFeed.tsx`
- Fetches all published `seo_articles` ordered by `created_at DESC`
- **Hero**: Most recent article featured large (title, excerpt, category badge, reading time, cover/gradient fallback)
- **Feed**: Remaining articles as compact cards in vertical stack (mobile) / 2-col grid (desktop)
- Skeleton loading state, empty state, error with retry
- Dark premium theme consistent with UNPRO cinematic style

### 2. Components in `src/components/articles/`

| Component | Purpose |
|-----------|---------|
| `CardArticleCompressed` | Compact card: gradient visual fallback, title, excerpt (2 lines), category pill, reading time, date, "Lire" CTA |
| `HeroArticleFeatured` | Large featured card for newest article with prominent visual + description |
| `ButtonTalkToAlexArticle` | CTA injecting `{title, slug, category}` into Alex context |
| `SkeletonArticleCard` | Shimmer placeholder matching card shape |

### 3. Route addition in `router.tsx`
- Add `/articles` route pointing to `PageArticlesRecentCompressedFeed` (lazy loaded)
- Keep existing `/articles/:slug` unchanged

### 4. Detail page fixes (`SeoArticlePage.tsx`)
- Remove duplicate author display
- Fix bullet list alignment in chunked content
- Improve mobile paragraph spacing and max-width

### 5. No database migration needed
- Uses existing `seo_articles` table as-is
- Reading time computed from `word_count` client-side
- Category derived from `service_category` field

## File changes

| Action | File |
|--------|------|
| Create | `src/pages/articles/PageArticlesRecentCompressedFeed.tsx` |
| Create | `src/components/articles/CardArticleCompressed.tsx` |
| Create | `src/components/articles/HeroArticleFeatured.tsx` |
| Create | `src/components/articles/ButtonTalkToAlexArticle.tsx` |
| Create | `src/components/articles/SkeletonArticleCard.tsx` |
| Modify | `src/app/router.tsx` (add `/articles` route) |
| Modify | `src/pages/seo/SeoArticlePage.tsx` (fix duplicates + mobile spacing) |

## Constraints
- No new tables or migrations
- Dark cinematic theme (#060B14)
- Mobile-first, compact cards
- Does not touch any other route
- Alex context bridge via existing `useAlexVoice`

