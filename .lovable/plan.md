
# UNPRO — AI Visibility, GEO, AEO & Entity Dominance Audit + Auto-Repair

## Strategy

The existing `Internal Content Guard` (`/admin/content-guard`) already covers Phase 8 (trust leaks). I'll extend that pattern into a unified **Visibility & Trust Audit Cockpit** at `/admin/ai-visibility-audit` that runs all 10 phases, persists findings, auto-repairs what's safe, and queues the rest as actionable tasks.

Three layers:
1. **Runtime scanners** (edge functions) — crawl routes, parse JSON-LD, score citation-readiness, detect missing entities.
2. **Auto-repair workers** (edge functions) — inject schema, generate missing pages from templates, fix breadcrumbs, remove leaked prompts.
3. **Manual task queue** (admin UI) — surfaces what requires human judgment (copy rewrites, onboarding redesigns, contractor data).

Reuses: `content_audit_runs`, `content_visibility_rules`, `SchemaStack`, `seoSchema.ts`, `aeo_*` tables, prerender layer, `platform_operation_outcomes` (reliability).

---

## Phase 1 — AI Entity Audit (auto)

**New edge fn `audit-schema-graph`** crawls every route in `routeRegistry`, fetches pre-rendered HTML, extracts `<script type="application/ld+json">`, validates against schema.org for: Organization, WebSite, LocalBusiness, FAQPage, BreadcrumbList, Article, Review, Service.

**Auto-repair:**
- Inject missing Organization + WebSite via existing `SeoStructuredDataInjector` (extend to all routes, not just `/`).
- Inject BreadcrumbList automatically on `/entrepreneur/:slug`, `/probleme/:slug/:city`, `/service/:slug/:city` via `SchemaStack`.
- Enforce canonical UNPRO entity block (name, pronunciation FR/EN, description) on every page through `<head>` (the strings stay in JSON-LD only — never visible UI, satisfying Content Guard whitelist).

**Manual tasks generated:** pages where description is generic, Service schema needs human-verified pricing, Review schema needs aggregateRating data.

---

## Phase 2 — Knowledge Graph Audit (auto)

**New edge fn `audit-knowledge-graph`** SQL-checks relationship completeness:
- Contractor ↔ Trade/City/Postal/Region/Service/Reviews/Verification/RBQ/Insurance/ResponseTime/Projects
- Property ↔ City/Renovation/Risk/Maintenance/Passport

**Auto-repair:**
- Backfill `contractor_entities` relationships from existing data (RBQ from `contractors`, city from address, services from `service_regions`).
- Insert missing `property_graph` edges for owned properties.
- Generate `truth_layer_article_topics` for any (City × Service) with ≥1 contractor but 0 article.

**Manual tasks:** contractors missing RBQ/insurance docs, properties missing passport tier.

---

## Phase 3 — AI Citation Score (auto + manual)

**New edge fn `audit-citation-readiness`** scores each public route 0–100 across:
- Structure (H1/H2/H3 hierarchy, semantic HTML)
- Entity density (named entities per 1000 chars)
- FAQ presence + schema
- Citations/sources block
- Clarity (Flesch readability, French-adapted)
- Direct answer in first 160 chars

Persists to `ai_citation_scores` table with per-engine likelihood (ChatGPT/Gemini/Perplexity/Claude/Copilot — heuristic weights based on each engine's documented preferences).

**Auto-repair (pages < 80):**
- Inject `AeoBlocks` if missing.
- Add FAQ section from `faq_entries` if topical match exists.
- Rewrite H1 to question-form via Lovable AI Gateway when score < 60 (queued for admin approval before publish).

**Manual tasks:** copy rewrites flagged for editorial review.

---

## Phase 4 — Contractor Discovery (auto)

Audit `/entrepreneur/:slug` for required sections. Extend `ContractorSeoPage` to **always render** (with empty-state placeholders that don't ship to crawlers if data missing):
- Service areas (from `service_regions`)
- Specialties, years in business, insurance, verification, response speed
- Reviews, project photos, languages
- **New sections**: "Pourquoi UNPRO recommande cet entrepreneur" / "Idéal pour" / "Moins adapté pour" — generated from `contractor_scores` + plan tier + project history via edge fn `generate-contractor-fit-blocks`, cached in `contractor_fit_blocks` table.

**Manual tasks:** contractors with no project photos or <3 reviews flagged for outreach.

---

## Phase 5 — Homeowner Intent Pages (auto)

Seed 10 symptom slugs (moisissure-grenier, planchers-froids, barrages-glace, sous-sol-humide, factures-hydro-elevees, fuite-toiture, odeur-moisi, condensation, problemes-electriques, urgences-plomberie) into `aeo_problem_topics`.

For each: generate diagnosis page (`/symptome/:slug`) using existing `aeo-generate-blocks` edge fn (already produces diagnostic + cost guide + FAQ + recommendation path). Inject into sitemap, add internal links from `/diagnostic` and city pages.

---

## Phase 6 — City × Service Dominance (auto)

Cross-product 13 priority cities × all `services` rows. Compare against existing `/service/:slug/:city` page registry. Queue missing combos into `aeo_batch_orchestrator` for generation (already exists, just feed it the matrix).

**Output:** `/admin/ai-visibility-audit` shows coverage heatmap (city rows × service columns, red/yellow/green).

---

## Phase 7 — Onboarding Conversion Audit (manual + auto)

Walk homeowner + contractor onboarding flows via Playwright (admin-triggered). Score:
- Steps before first value
- Fields per step
- Verification timing

**Auto-repair (safe):** move phone/email verification to AFTER project/claim creation in `PageClaimWizard` and homeowner intake — already aligned with Claim-First philosophy. Audit checks no remaining "verify-first" gates exist.

**Manual tasks:** flow redesigns surface as PR-ready specs.

---

## Phase 8 — Trust Leak Audit (auto, already exists)

Re-run existing Content Guard + extend rules to catch:
- Lovable platform references in user-facing copy
- Visible system prompts (already covered)
- Debug toolbars rendered in production
- Admin-only components leaked into public routes (cross-check `/admin/*` imports from public pages)

Auto-block on CI; surface remaining warns in cockpit.

---

## Phase 9 — Performance Audit (auto)

Add **Lighthouse + CLS scanner** edge fn `audit-performance` hitting homepage, `/diagnostic`, `/entrepreneur/:slug`, `/dashboard`. Captures CLS, LCP, INP, hydration mismatches (from console errors), excessive re-render warnings.

**Auto-repair:** add explicit `width/height` to images missing them, wrap heavy components in `Suspense`, lazy-load below-fold sections. Per-fix PR-style diffs surfaced in cockpit.

**Manual tasks:** memory leaks, animation jank requiring component-level review.

---

## Phase 10 — Revenue Impact Ranking (auto)

Aggregate all findings into `ai_visibility_findings` with: `phase`, `severity`, `estimated_conversion_lift_pct`, `estimated_revenue_impact_cad`, `repair_difficulty` (1–5), `auto_repairable` (bool), `recommended_action`.

Scoring formula: `revenue_impact = monthly_traffic × conversion_lift × avg_ticket × plan_attach_rate` (uses real funnel data from `platform_operation_outcomes` + `launch_pipeline_events`).

**Top 20 board** auto-executes `auto_repairable=true` rows immediately, queues rest as admin tasks with one-click "Generate fix" buttons.

---

## Deliverables

### Database (single migration)
- `ai_visibility_findings` (phase, route, severity, score, auto_repairable, repair_status, impact_cad, lift_pct, action, payload jsonb)
- `ai_citation_scores` (route, engine, score, factors jsonb, scanned_at)
- `contractor_fit_blocks` (contractor_id, why_recommended, best_for, not_ideal_for, generated_at)
- `ai_visibility_runs` (run_id, phase, status, summary jsonb)
- All with GRANTs (authenticated read for admin, service_role full), RLS via `has_role('admin')`

### Edge functions (8)
- `audit-schema-graph`
- `audit-knowledge-graph`
- `audit-citation-readiness`
- `audit-contractor-coverage`
- `audit-symptom-pages`
- `audit-city-service-matrix`
- `audit-performance`
- `ai-visibility-orchestrator` (runs all phases, aggregates into Top 20)

### Pages (1 cockpit)
- `/admin/ai-visibility-audit` — Run All button, per-phase cards, coverage heatmap, Top 20 board, finding drawers with "Auto-fix" / "Generate fix" actions

### Auto-injected on every public route
- BreadcrumbList via `SchemaStack` (already exists, extend mount)
- Organization + WebSite JSON-LD (extend `SeoStructuredDataInjector` to all routes)
- Canonical + og:url self-reference checks

### CI
- Extend `npm run content-audit` to also call `audit-schema-graph` in dry-run, fail build on missing required schema on indexable routes

---

## Technical Notes

- All scanners reuse `withRetry` + `reportOutcome` from `src/lib/reliability/*` per Production Reliability Framework.
- Citation scoring weights stored in `ai_visibility_settings` (admin-editable).
- Auto-repair writes go through Founder Mode override for emergency rollback.
- Symptom + City×Service pages reuse `aeo-generate-blocks` (no new generator).
- Contractor "fit blocks" use Lovable AI Gateway (no API key needed) with Gemini 2.5 Flash, cached 30 days.

---

## Out of Scope (this plan)

- Rewriting Alex prompts (governed by `mem://ai/alex/behavioral-kernel`)
- Pricing/plan changes
- New contractor onboarding screens (only verification reordering)
- Touching `src/integrations/supabase/client.ts` or auto-gen files

---

## Open Questions

1. **Auto-publish threshold**: should AI-rewritten H1s (Phase 3, score <60) auto-publish or require admin approval? Default in plan = admin approval.
2. **Symptom pages**: ship all 10 immediately (auto-generated FR copy via Gemini) or seed first 3 (moisissure-grenier, sous-sol-humide, fuite-toiture) for editorial review then bulk-generate?
3. **City × Service matrix**: full 13×N generation now, or top 50 highest-demand combos first (from `city_service_demand_grid`)?
