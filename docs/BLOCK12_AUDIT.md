# UNPRO — Block 12: Production Readiness Audit

**Date**: 2026-03-14  
**Scope**: Full systems review of all modules post-Block 12

---

## Module Status Matrix

### ✅ Implemented & Functional

| Module | Status | Notes |
|--------|--------|-------|
| **Auth & Profiles** | ✅ Solid | `handle_new_user` trigger, `user_roles` table, `has_role()` SECURITY DEFINER. RLS enforced. |
| **Properties** | ✅ Solid | CRUD, slug generation, address normalization, public/private status lifecycle. |
| **Claim Flow** | ✅ Functional | `claimProperty()` with null-check on `claimed_by`. Status transitions work. |
| **Public Property Pages** | ✅ Solid | `/maison/:slug` with score, CTAs, neighborhood momentum, privacy-safe. |
| **Passport** | ✅ Solid | 5 weighted sections, completion engine with micro-tasks, `getNextTasks()`. |
| **Completion Engine** | ✅ Solid | 15 task definitions, priority-based, idempotent seeding. |
| **Home Score** | ✅ Solid | V2 with confidence levels, score types (estimated/enriched/certified), factor breakdown. |
| **Digital Twin Predictions** | ✅ Basic | `predictionService.ts` exists. Component lifecycle estimation works. |
| **Grants** | ✅ Functional | Eligibility service, questionnaire structure, city-aware. |
| **Contractor Profiles** | ✅ Solid | Full public profile via `get_contractor_public_profile()` RPC, AI profiles, DNA profiles. |
| **Contractor Trust** | ✅ Solid | Trust summary view, AIPP score, verification runs, credentials. |
| **Project Requests** | ✅ Functional | `ProjectNewPage`, matching engine integration. |
| **Matching** | ✅ Functional | CCAI alignment, territory-based, similarity scoring. |
| **QR Systems** | ✅ Solid | 3 QR types, `resolve_qr_token()` RPC, privacy-safe jobsite landing. |
| **Contractor Contributions** | ✅ Solid | Pending → approved flow, owner approval required, passport integration. |
| **SEO Pages** | ✅ Solid | French-first routes, city/problem/solution pages, thin-page gating, JSON-LD. |
| **Problem Graph** | ✅ Solid | 15-entity knowledge graph, problem→solution→professional→city topology. |
| **Agents Orchestration** | ✅ Functional | Registry, task queue, 7 agents registered, edge function orchestrator. |
| **Analytics / Observability** | ✅ Functional | `platform_events` table, `eventTrackingService`, admin operations hub. |
| **Admin** | ✅ Functional | Operations hub with claims, verifications, contributions, agent jobs, analytics. |
| **QA Automation** | ✅ Basic | 20 Vitest tests covering scoring, normalization, passport weights. |
| **Homeowner Messaging** | ✅ Basic | `messagingService.ts`, message center page. |
| **Public Map** | ✅ Basic | `BuildingIntelligenceMap` with color-coded building health. |
| **Data Moat** | ✅ NEW | `dataMoatService.ts` — canonical action→asset registry for 13 actions. |
| **Funnel Optimization** | ✅ NEW | `ScoreTeaser`, `NextBestAction`, `NeighborhoodMomentum` components. |
| **Neighborhood Intelligence** | ✅ Functional | `neighborhoodService.ts` with aggregated stats, comparison, social proof. |

---

## Priority Bug List

| # | Issue | Severity | Module |
|---|-------|----------|--------|
| 1 | `AddressSearchInput` compact variant sets `streetName` on combined input change — loses structured data | Medium | Property |
| 2 | `PublicScoreCalculatorPage` extracts city from existing property but not from new address input | Low | Score |
| 3 | No rate limiting on `platform_events` inserts — potential for high-volume spam | Medium | Analytics |
| 4 | `neighborhood_stats` table may not exist yet (no migration found) — queries will 404 silently | High | Neighborhood |
| 5 | `property_completion_tasks` table needs `completed_at` and `dismissed_at` columns verified | Medium | Passport |

---

## Essential Missing Items (Pre-Production)

1. **`neighborhood_stats` table migration** — Required for neighborhood momentum feature to function.
2. **Email verification enforcement** — Auth is configured but auto-confirm should be explicitly disabled.
3. **Rate limiting** on public endpoints (score calculator, address search).
4. **Storage signed URL helper** — Currently referenced but not consistently used.
5. **Claim verification UX** — Document upload or postal code verification flow needs UI completion.

---

## What Should Wait (Next Phase)

- AI-powered listing parser (requires Firecrawl integration testing)
- Certified score type (requires inspector partnership)
- Contractor DNA profile auto-generation (requires more review data)
- Full sitemap index with `<sitemapindex>` wrapper
- Neighborhood stats aggregation cron job (agent task, not yet scheduled)
- Push notifications for passport completion reminders
- Stripe checkout for contractor plans (wired but needs e2e testing)

---

## Recommended Next Execution Order

1. **Create `neighborhood_stats` migration** (unblocks momentum feature)
2. **Fix AddressSearchInput compact variant** (data integrity)
3. **Add rate limiting middleware** to edge functions
4. **Complete claim verification UI** (document upload step)
5. **Schedule neighborhood stats aggregation** via agent orchestrator
6. **E2E test: address search → score → signup → claim → passport** flow
7. **Deploy and validate sitemap** edge function

---

## Data Moat Asset Registry

| Action | Primary Table | Feeds |
|--------|---------------|-------|
| Property created | `properties` | home_score, neighborhood_stats, seo_city_pages |
| Address searched | `platform_events` | seo_demand_signals, neighborhood_heat_map |
| Property claimed | `properties` | home_score, passport, certification_reviews |
| Passport field completed | `property_passport_sections` | home_score, confidence_level, digital_twin |
| Document uploaded | `property_documents` | home_score, passport_completion, certification |
| Electrical panel photo | `property_documents` | home_score (systems), digital_twin, safety |
| Project request | `projects` | matching_engine, lead_generation, neighborhood_trends |
| Contractor matched | `project_matches` | aipp_score, territory_demand, conversion |
| Contractor verified | `contractor_verification_runs` | aipp_score, trust_summary, public_profile |
| Contribution approved | `contractor_contributions` | property_events, passport, home_score |
| Grant answers | `grant_questionnaire_answers` | grant_eligibility, property_characteristics |
| Public page visited | `platform_events` | seo_analytics, neighborhood_interest |
| Map interaction | `platform_events` | territory_heat_map, contractor_opportunities |

---

## Architecture Strength Assessment

- **Property-centered model**: Strong. Every entity connects back to `properties`.
- **Score system**: Robust. Three-tier (estimated/enriched/certified) with confidence.
- **Privacy**: Excellent. No PII on public pages, aggregated neighborhood data only.
- **SEO**: Strong. French-first, data-gated thin-page protection, JSON-LD.
- **Agent system**: Functional foundation. Needs scheduling and automated execution.
- **Data moat**: Now formalized. Every user action creates a reusable structured asset.
