
# Rebuild Real Import Pipeline — End Fake "Missing" States

## Problem

When a contractor enters their website, UNPRO reports logo/photos/RBQ/reviews/description as "missing" — even when all that data is publicly visible on their site. Root cause: the current UI displays placeholders and pre-enrichment scoring, the crawler is not orchestrated end-to-end, and Firecrawl results are not merged into the contractor profile before the UI renders verdicts. ISR (`isroyal.ca`) is the QA test case.

## Goal

A real ingestion pipeline that crawls → enriches → extracts → merges → scores → streams to UI. Profile cards must show **actual extracted assets** (real logo, real gallery, real reviews, real services) before any negative signal is allowed to appear.

---

## Architecture

```text
Contractor inputs (website | GBP | business name)
         │
         ▼
edge: import-business-intelligence  ← NEW orchestrator
  1. normalize domain
  2. Firecrawl scrape (homepage, formats: markdown+html+links+screenshot+branding+json)
  3. Firecrawl map → discover /about /services /realisations /contact /avis
  4. Firecrawl batch scrape top N internal pages
  5. Extract structured data (Gemini 2.5 Flash via Lovable AI)
  6. Parallel enrichers:
       - gmb-lookup (existing)
       - rbq-lookup (existing pattern)
       - neq-lookup
       - social profile detection (FB, IG, LI, YT from links)
  7. Merge → contractor_profile_enriched
  8. Compute enrichment_scores (after merge, never before)
  9. Stream stage progress via realtime broadcast channel
         │
         ▼
contractor_import_runs (status, progress, stage, raw_json)
contractor_assets (logo, gallery, favicon, social, videos, certifications)
contractor_enrichment_scores (seo, trust, social, conversion, completeness, aeo)
         │
         ▼
LiveImportTimeline (subscribes to channel)
  → green check cards animate in as each signal lands
  → real logo/photos/reviews render immediately
  → "missing" only shown after run.status = completed AND signal truly absent
```

## Files

### New edge functions
- `supabase/functions/import-business-intelligence/index.ts` — orchestrator, streams progress to `contractor_import_runs` and broadcast channel `import:{runId}`
- `supabase/functions/extract-business-signals/index.ts` — Gemini 2.5 Flash structured extraction from crawled markdown/html (logo, phone, RBQ, services, cities, certifications, testimonials, financing, emergency, before/after)
- `supabase/functions/compute-enrichment-scores/index.ts` — runs AFTER enrichment; writes `contractor_enrichment_scores`

### Modified edge functions
- `supabase/functions/aipp-real-scan/index.ts` — defer scoring until import run is `completed`; remove pre-enrichment penalties
- existing gmb / rbq lookups — invoked by orchestrator in parallel

### New tables (migration)
- `contractor_import_runs` (id, contractor_id, domain, status enum draft|crawling|enriching|scoring|completed|failed, current_stage text, progress int, started_at, completed_at, raw_json jsonb, error text)
- `contractor_assets` (contractor_id, logo_url, favicon_url, gallery jsonb, social_links jsonb, videos jsonb, certifications jsonb, hero_images jsonb)
- `contractor_enrichment_scores` (contractor_id, seo_score, trust_score, social_score, conversion_score, completeness_score, aeo_score, computed_at)
- Realtime: add all three to `supabase_realtime` publication

### Frontend
- `src/services/importIntelligenceService.ts` — `startImport(input)`, `subscribeToRun(runId, cb)`
- `src/components/import-intelligence/LiveImportTimeline.tsx` — animated card stream (blue=analyzing, green=detected, amber=partial, red=truly missing only after completion)
- `src/components/import-intelligence/DetectedAssetGallery.tsx` — renders real logo + real photos + real reviews + detected services/cities
- `src/components/import-intelligence/ProfileCompletenessRing.tsx` — "Profil importé à 82 %" + quick wins list, replaces "5 éléments manquants"
- `src/components/import-intelligence/AlexLiveCommentary.tsx` — Alex narrates stages in fr-CA ("Je détecte votre fiche Google…", "47 photos trouvées.")
- Replace mock data in `src/pages/entrepreneur/PageEntrepreneurImportProcessing.tsx` with real run subscription
- Wire `HeroSectionAIPPReveal` submit → `startImport()` → navigate to `/entrepreneur/onboarding/analyse?run={runId}`

### Removed / disabled
- `DEMO_IMPORT_DATA` mock object in `PageEntrepreneurImportProcessing.tsx`
- Pre-enrichment scoring calls in any landing/aipp components
- Static "missing" badges that fire before run completion

## UI state rules (enforced in `LiveImportTimeline`)
- `pending` → blue dot, "Analyse en cours…"
- `detected` → green check, render the actual value
- `partial` → amber, "Détecté partiellement, à confirmer"
- `missing` → red, **only** when `run.status === 'completed'` and no source returned the signal
- Never show red before completion. Never show "X manquant" if any source contains it.

## Mobile (384px)
- Compact horizontal scrollable detection cards
- Sticky bottom Alex commentary bar with live updates
- Real gallery thumbnails in 3-col grid, not whitespace

## QA gate (`isroyal.ca`)

Pipeline must detect, on a fresh run with no cached data:
- logo (favicon + header img)
- attic insulation specialization (`isolation entretoit`)
- gallery photos (≥10)
- phone numbers
- service cities (Laval, Terrebonne, Rive-Nord)
- RBQ license
- reviews (GBP)
- before/after visuals
- financing mentions

If any of the above is publicly visible on isroyal.ca but reported missing → ship blocker.

## Out of scope (this phase)
- BBB, Apple Maps, Bing Places enrichment (architecture supports, sources stubbed)
- Personalized pricing changes
- Outbound / sniper changes
- New Alex prompt rewrites (only commentary strings)

## Approach summary

Phase A — Migration + 3 edge functions (orchestrator, extractor, scorer) + Firecrawl wiring.
Phase B — Frontend: live timeline, detected-asset gallery, completeness ring, Alex commentary, remove mocks.
Phase C — QA on `isroyal.ca`, tune extraction prompt until all required signals detected.

Memory `mem://features/import-intelligence-pipeline` will be created on completion.
