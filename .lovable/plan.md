

# Autopilot SEO Publisher + 50 Money Pages + AEO/GEO Engine

## What exists today
- `seo_pages` table with 368 published pages (city x profession grid)
- `seo_articles` table with 8 articles
- `seo_generation_queue` table for batch generation
- `seo-generator` edge function with AI content generation via Lovable AI
- `sitemap-xml` edge function
- Admin generator UI at `/admin/seo-generator`

## What is missing
- No scheduling system (publish_date, drip-feed logic)
- No autopilot cron to auto-publish on schedule
- No quality gate before publish (word count, schema check)
- No AEO-specific blocks (Quick Answer, HowTo, pricing tables)
- No GEO authority pages (reports, methodology, entity pages)
- No auto-refresh engine for low performers
- No internal link back-patching
- No dedicated command center dashboard

---

## Phase 1 — Database: `pages_queue` table

Create migration adding `pages_queue`:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| slug | text UNIQUE NOT NULL | URL path |
| title | text | Display title |
| city | text | Target city |
| service | text | Service/problem |
| page_type | text | city_service, price, problem, comparison, trust, aeo, geo |
| priority_score | integer default 50 | Higher = publish first |
| publish_date | date | Scheduled publish date |
| status | text default 'queued' | queued / generating / published / failed / refreshing |
| content_json | jsonb | Generated content cache |
| word_count | integer | Quality gate |
| has_schema | boolean default false | Schema markup present |
| has_faq | boolean default false | FAQ section present |
| has_answer_block | boolean default false | AEO quick answer |
| index_requested | boolean default false | Sent to indexing |
| impressions | integer default 0 | Tracking |
| clicks | integer default 0 | Tracking |
| leads | integer default 0 | Tracking |
| last_refreshed_at | timestamptz | Auto-refresh tracking |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Enable RLS. Admin-only policies.

## Phase 2 — Seed 50 Money Pages into queue

Insert 50 rows into `pages_queue` with:
- The exact slugs from the prompt (Montreal, Laval, Quebec, Longueuil, North Shore, problem pages, price pages, comparison/trust pages)
- Priority scores: problem/urgency pages highest (90+), price pages (80+), city/service (70), comparison (60)
- Publish dates: 2 pages/day for days 1-14, 1 page/day for days 15-36
- Status: `queued`

## Phase 3 — Upgrade `seo-generator` edge function

Add new actions to the existing edge function:

**`action: "generate_money_page"`**
- Pull next `queued` item from `pages_queue` by priority + publish_date
- Generate 1200+ word content using Lovable AI (Gemini 2.5 Flash)
- Include AEO blocks: Quick Answer (40-80 words), pricing table, FAQ (5-10 Qs), HowTo steps, trust section, red flags
- Include GEO signals: "Selon les données UNPRO...", quotable stats, entity consistency
- Include JSON-LD: FAQPage, HowTo, Service, BreadcrumbList, Article
- Include internal links: 3 related cities, 3 related services, 2 guides, homepage
- Quality gate: reject if < 900 words, no FAQ, no schema
- On success: insert into `seo_pages`, update `pages_queue` status to `published`
- On failure: mark `failed` with error

**`action: "auto_publish"`**
- Find all `queued` items where `publish_date <= today`
- Generate and publish them (max 3 per run)
- Called by cron

**`action: "refresh_low_performers"`**
- Find published pages older than 45 days with low clicks/impressions
- Regenerate title, meta, and first section
- Update `seo_pages` and `pages_queue`

**`action: "backpatch_links"`**
- For each newly published page, find 5 related existing pages and add reciprocal internal links

## Phase 4 — Cron job for autopilot

Schedule cron calling `seo-generator` with `action: "auto_publish"` daily at 8am EST. This drip-feeds pages according to `publish_date`.

## Phase 5 — AEO/GEO content templates

Enhance the AI generation prompt to produce:

**AEO blocks (per page):**
- `quick_answer`: 40-80 word direct answer at top
- `pricing_table`: low/mid/high ranges in CAD
- `how_to_steps`: numbered actionable steps
- `red_flags`: warning signs list
- `questions_before_hiring`: 5 questions
- 3 quotable passages under 60 words each

**GEO signals (per page):**
- Brand entity: "UNPRO" mentioned 2-3 times naturally
- Data citation: "Selon les données UNPRO..."
- Consistent entity description
- Publisher schema with Organization

## Phase 6 — Seed 25 AEO + 20 GEO pages

Add to `pages_queue` with appropriate types:
- 25 AEO pages (pricing queries, best choice, problem, comparison, trust)
- 20 GEO pages (brand authority, data reports, trust/education, product entity, thought leadership)
- Total: 95 pages in queue (50 money + 25 AEO + 20 GEO)

## Phase 7 — Command Center Dashboard

Create `/admin/seo-autopilot` page with glassmorphism premium UI:

**Sections:**
- Queue overview: queued / generating / published / failed counts
- Today's schedule: pages publishing today with status
- Calendar view: 30-day publishing calendar
- Published pages table: slug, type, word count, impressions, clicks, leads, quality score
- Top performers: sorted by clicks/leads
- Refresh candidates: pages older than 45 days with low performance
- AEO readiness: pages with/without answer blocks, FAQ schema, HowTo
- GEO authority: pages with brand mentions, data citations
- Missing API keys / blockers section

**Actions:**
- Generate next batch (manual trigger)
- Publish now (skip schedule)
- Refresh selected pages
- Request indexing (mark for GSC)

## Phase 8 — Sitemap auto-update

The existing `sitemap-xml` edge function already queries `seo_pages`. New pages inserted by the autopilot will automatically appear in the sitemap. No changes needed.

## Phase 9 — Internal link engine

When a new page is published:
1. Select 3 existing pages in the same city, 3 in the same service, 2 guide/article pages
2. Add links from new page to those pages
3. Update those pages' `internal_links` to include the new page
4. Store link relationships in `seo_pages.internal_links` jsonb

---

## Files to create/modify

| Action | File | Purpose |
|--------|------|---------|
| Migration | `pages_queue` table | Scheduling + tracking |
| Insert | Seed 95 pages into `pages_queue` | Initial load |
| Modify | `supabase/functions/seo-generator/index.ts` | Add money page generation, auto_publish, refresh, backpatch actions |
| Create | `src/pages/admin/PageSeoAutopilot.tsx` | Command center dashboard |
| Modify | `src/app/router.tsx` | Add route |
| Insert | Cron job for daily auto_publish | Automation |

## Expected outcome
- 95 pages queued with scheduled publish dates
- Daily autopilot generates and publishes 1-2 pages
- Every page has AEO answer blocks + GEO brand signals
- Quality gate prevents thin content
- Internal links auto-wired
- Sitemap auto-updated
- Premium command center at `/admin/seo-autopilot`
- First 50 money pages published within 30 days

