# UNPRO AEO Domination — Final Build Plan

Transform UNPRO into the AI-cited local authority for Quebec residential services. Builds on existing `/pro/:slug`, `content_pages`, `contractor_ai_profiles`, `SchemaStack`, `SeoHead`, `canonicalManager`. Strictly additive — no breaks to Alex, Stripe, AIPP, auth, outbound.

---

## Phase 1 — Semantic Foundation (DB)

New tables (all RLS public-read, admin-write):
- `intent_vectors` — page_id, primary_intent, secondary_intents[], symptoms[], confidence
- `semantic_edges` — from_entity, to_entity, edge_type (service↔city↔problem↔contractor↔neighborhood)
- `entity_facts` — entity_type, entity_id, fact_key, fact_value, source, valid_from (drives JSON-LD)
- `page_freshness_signals` — page_url, weather_ctx, season, hydro_rate, last_refreshed
- `aeo_extraction_blocks` — page_id, block_type (reponse_rapide, en_resume, cout_estimatif, diagnostic_frequent, signes_visibles, quand_consulter), content_fr, content_en
- `problems`, `symptoms`, `materials`, `regulations`, `equipment`, `seasonal_patterns`, `building_types`, `neighborhoods` (lookup tables, seeded with QC data)
- `service_pages`, `problem_pages`, `comparison_pages`, `trust_pages` (registries with canonical, status, semantic_uniqueness_score, indexable flag)

## Phase 2 — Tiered Page Architecture

**L1 — Contractor Entity (`/pro/:slug`)** — extend existing page:
- Inject 8 JSON-LD: LocalBusiness, Organization, Service, FAQPage, Review, BreadcrumbList, Article, WebPage
- Add AEO extraction blocks (Réponse rapide, Résumé, Coût estimatif, À retenir)
- Render linked service×city + problem clusters; entity saturation (contractor + service + city + problem repeated semantically)
- Machine-readable trust strip (RBQ, NEQ, insurance, response time, capacity, AI confidence)

**L2 — Service × City (`/services/:service/:city/:slug?`)** — dynamic:
- Local weather, housing stock, neighborhood issues, energy cost realities, seasonal urgency
- Permits/rebates, real project price range, symptom explanations
- Top 3 contractors with AIPP rationale

**L3 — Problem (`/problemes/:problem/:city`)** — high-yield AI traffic:
- Causes, symptoms, diagnostic, urgency level, cost range, recommended pros
- Natural-language Q&A optimized for voice ("Pourquoi ma maison est chaude l'été?")

**L4 — Comparison (`/comparaison/:slug`)** — informational citations (laine soufflée vs uréthane, R60 vs R51…)

**L5 — Regulations/Trust (`/guides/:slug`)** — EEAT (subventions, RBQ, Loi 16)

## Phase 3 — AEO Generation Engine

Edge function `aeo-generate-blocks` (Lovable AI / gemini-2.5-flash):
- Input: page entity + intent vector + local context
- Output: 6 AEO blocks (FR-CA, exact spacing rules) + 8–15 FAQs + intent vector + JSON-LD entity facts
- Persists to `aeo_extraction_blocks`, `entity_facts`, `intent_vectors`
- Batch mode for mass generation (top 10 services × 25 cities × 20 problems = ~5000 pages immediately)

## Phase 4 — Freshness Loops

Cron `aeo-freshness-tick` (daily):
- Refresh `page_freshness_signals` with weather, season, Hydro QC rate, demand signals
- Updates lastmod in sitemap; tiny content deltas in pages → constant freshness signal

## Phase 5 — Canonical & Index Budget

Extend `canonicalManager`:
- Parent cluster logic, semantic uniqueness scoring (block thin/duplicate pages)
- Auto-noindex empty city×service combos, sub-threshold uniqueness
- `/ai/`, `/knowledge/`, `/data/`, `/methodology/` transparency pages (AIPP, matching logic, trust verification)

## Phase 6 — Internal Linking Mesh

`SeoInternalLinks` upgrade: every page links to city + nearby cities + related problems + related services + regulations + comparisons + contractor. Driven by `semantic_edges`.

## Phase 7 — Sitemap + Speech

- `generate-sitemap.ts` reads page registries (150k+ entries, chunked sitemap index)
- Speech-optimized H1/H2 patterns + Speakable schema on L3 problem pages
- Video/transcript pages where applicable

## Phase 8 — Admin Cockpit (`/admin/aeo`)

- Coverage matrix (service × city × problem completeness)
- AI citation tracker (manual + automated logs)
- Freshness queue, uniqueness scores, indexable count, JSON-LD validity
- One-click regenerate, force-refresh, bulk publish

## Phase 9 — Fastest Win (Week 1 execution)

After Phase 1 schema lands:
1. Seed top 10 services, 25 QC cities, 20 problems
2. Batch-generate ~5000 L2/L3 pages via `aeo-generate-blocks`
3. Inject JSON-LD + AEO blocks on all `/pro/:slug`
4. Activate freshness cron
5. Submit chunked sitemap to GSC + Bing
6. Open admin cockpit for monitoring

---

## Technical notes

- All FR-CA copy follows project punctuation rules (espace insécable, "V" in ville)
- Public pages keep warm theme; admin keeps cinematic dark
- `SECURITY INVOKER` for any new public views
- No changes to Alex, Stripe checkout, AIPP scoring, outbound, auth flows
- Edge functions use `https://esm.sh/@supabase/supabase-js@2.49.1`
- All new tables: RLS enabled, public-read where indexable content, admin-only write

## Approval

Approve to begin Phase 1 (DB migration) + Phase 9 step 1 (seed data) in the next turn. Phases 2–8 follow sequentially in dedicated turns to keep scope tight.
