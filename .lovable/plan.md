

# PR Loop Engine — Automated Content Authority Flywheel

## What exists
- `seo_articles` table for blog articles
- `seo-generator` edge function with AI content generation
- `pages_queue` table for SEO autopilot scheduling
- `/admin/seo-autopilot` dashboard

## What to build

### Phase 1 — Database: `pr_topics` and `pr_assets` tables

**Migration creates:**

`pr_topics`:
- id, title, slug, category (pain, pricing, trust, homeowner, contractor), status (draft/active/completed), priority_score, week_number, created_at, updated_at

`pr_assets`:
- id, topic_id (FK to pr_topics), channel (article, linkedin, x_thread, facebook_homeowner, facebook_contractor, reddit, short_video_script, long_video_script, email_newsletter, press_release, backlink_pitch, faq_snippets), content_text, hook, cta, brand_mentions (integer), status (queued/generated/published/failed), scheduled_date, published_at, engagement_clicks (integer default 0), engagement_shares (integer default 0), mentions_gained (integer default 0), backlinks_gained (integer default 0), created_at, updated_at

RLS: admin-only on both tables.

### Phase 2 — Seed 25 high-ROI topics

Insert 25 topics from the prompt into `pr_topics` with categories and priority scores. Assign week numbers (1-25) for weekly cadence.

### Phase 3 — Edge function: `pr-loop-generate`

New edge function with actions:

**`action: "generate_all_assets"`** (topic_id)
- Takes one topic, calls Lovable AI (Gemini 2.5 Flash) to generate all 12 channel assets in one structured call
- Each asset includes: hook, body, CTA, 2-3 natural UNPRO brand mentions
- Inserts 12 rows into `pr_assets` with scheduled dates following the 7-day distribution calendar (Day 1: article+linkedin, Day 2: X+facebook, etc.)
- Quality gate: reject if content is generic or under minimum length per channel

**`action: "generate_topic_batch"`**
- Generates assets for next 3 unprocessed topics
- Called by weekly cron

**`action: "stats"`**
- Returns topic count, asset count by status/channel, total mentions, total backlinks

### Phase 4 — Cron job

Weekly cron (Monday 7am EST) calling `pr-loop-generate` with `action: "generate_topic_batch"` to keep the pipeline fed.

### Phase 5 — Dashboard: `/admin/pr-loop`

Premium glassmorphism command center with:

**Sections:**
- Topic pipeline: list of all topics with status, week, asset completion count
- Weekly calendar: visual 7-day distribution view for current week
- Asset library: filterable by channel, status, topic
- Copy-to-clipboard for each asset (LinkedIn, X, Reddit, etc.)
- Performance: mentions gained, backlinks, branded searches (manual input fields)
- Generate controls: "Generate next topic" button, "Generate batch" button

**Key UX:**
- Each asset card shows channel icon, hook preview, publish date, status
- One-click copy for immediate posting to social channels
- Mark as published button per asset
- Inline edit for tweaking before posting

### Phase 6 — Route registration

Add `/admin/pr-loop` to router with admin protection.

---

## Files to create/modify

| Action | File | Purpose |
|--------|------|---------|
| Migration | `pr_topics` + `pr_assets` tables | Content tracking |
| Insert | Seed 25 topics | Initial pipeline |
| Create | `supabase/functions/pr-loop-generate/index.ts` | AI asset generation |
| Create | `src/pages/admin/PagePrLoop.tsx` | Command center |
| Modify | `src/app/router.tsx` | Add route |
| Insert | Weekly cron job | Automation |

## Expected outcome
- 25 topics loaded with priority scores
- One-click generation of 12 channel assets per topic
- 7-day distribution calendar per topic
- Copy-ready content for LinkedIn, X, Reddit, Facebook, email
- Weekly autopilot cron keeps pipeline fed
- Admin dashboard tracks mentions, backlinks, branded search lift

