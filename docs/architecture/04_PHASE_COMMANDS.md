# 04 — Phase Commands

> Concrete, copy-pasteable instructions for each build phase.

---

## Pre-Flight Check (Run Before Any Phase)

```
Before proceeding, verify:
1. Read src/integrations/supabase/types.ts — confirm current schema
2. Check supabase/migrations/ — confirm no conflicting migrations
3. Review src/app/router.tsx — confirm current route structure
4. Check package.json — confirm current dependencies
```

---

## Phase V1 — Core Platform

### V1.1 — Authentication & Profiles

**Status: ✅ Complete**

Tables: `profiles`, `user_roles`
Trigger: `handle_new_user` (creates profile + assigns role on signup)
Routes: `/login`, `/signup`
Hook: `useAuth.ts`

### V1.2 — Property Management

**Status: ✅ Complete**

Tables: `properties`, `property_components`, `property_events`
Routes: `/dashboard/properties`, `/dashboard/properties/new`, `/dashboard/properties/:id`
Hook: `useProperties.ts`

### V1.3 — Contractor System

**Status: ✅ Complete**

Tables: `contractors`, `contractor_members`, `contractor_services`, `contractor_service_areas`, `contractor_credentials`, `contractor_media`
Routes: `/pro/*`, `/contractors/:id`
Hooks: `useContractor.ts`, `useContractorPublicPage.ts`

### V1.4 — Projects & Quotes

**Status: ✅ Complete**

Tables: `projects`, `quotes`, `quote_analyses`
Routes: `/dashboard/quotes/*`
Hooks: `useQuotes.ts`, `useQuoteAnalysis.ts`

### V1.5 — Contractor Onboarding & Billing

**Status: ✅ Complete**

Tables: `checkout_sessions`, `contractor_subscriptions`, `plan_catalog`, `promo_codes`
Edge Functions: `create-checkout-session`, `stripe-webhook`
Routes: `/contractor-onboarding`, `/pricing`

### V1.6 — Verification Engine

**Status: ✅ Complete**

Tables: `contractor_verification_runs`, `contractor_visual_extractions`, `contractor_probable_entities`, `contractor_registry_validations`, `contractor_license_scope_results`, `contractor_risk_signals`, `contractor_verification_assets`
Reference Tables: `rbq_license_subcategories`, `rbq_license_work_types`, `project_work_taxonomy`, `rbq_project_compatibility_rules`
Routes: `/verify`
Edge Function: `verify-contractor`

### V1.7 — AIPP Scoring

**Status: ✅ Complete**

Tables: `contractor_aipp_scores`, `aipp_scores`
Edge Function: `compute-contractor-score`
Routes: `/dashboard/aipp-score`, `/pro/aipp-score`

### V1.8 — Admin Dashboard

**Status: ✅ Complete**

Routes: `/admin/*` (dashboard, users, contractors, leads, quotes, reviews, documents, media, territories, agents, validation, growth, appointments, answer-engine)
Layout: `AdminLayout.tsx`

---

## Phase V2 — Syndicates (Condos)

### V2.1–V2.8 — Full Condo Platform

**Status: ✅ Complete**

Tables: `syndicates`, `syndicate_members`, `syndicate_components`, `syndicate_maintenance_tasks`, `syndicate_maintenance_logs`, `syndicate_documents`, `syndicate_quote_analyses`, `condo_subscriptions`
Edge Functions: `create-condo-checkout`, `condo-stripe-webhook`, `check-condo-subscription`
Routes: `/condos/*` (17 routes — public + dashboard)
Layout: `CondoLayout.tsx`
Hooks: `useCondoSubscription.ts`, `useCondoBuilding.ts`, `useSyndicate.ts`

---

## Phase V3 — Ingestion & Intelligence

### V3.1–V3.7 — Document Pipeline

**Status: ✅ Complete**

Tables: `rag_documents`, `rag_chunks`, `extraction_jobs`
Edge Functions: `rag-ingest`, `extract-document-entities`, `analyze-quote-document`, `analyze-reserve-fund-study`, `create-property-from-tax-bill`, `media-orchestrator`, `import-business-website`, `search-gmb-profile`
Hooks: `useIngestion.ts`, `useMediaOrchestrator.ts`, `useQuoteAnalysis.ts`

---

## Phase V4 — Knowledge Graph + SEO

### V4.1–V4.8 — Public Authority

**Status: ✅ Complete**

Tables: `home_problems`, `home_solutions`, `answer_templates`, `answer_logs`, `agent_registry`, `agent_tasks`, `agent_logs`, `agent_memory`, `agent_metrics`
Edge Functions: `seed-knowledge-graph`, `answer-engine`, `agent-orchestrator`
Routes: `/services/:cat/:city`, `/problems/:slug/:city`, `/profession/:slug`, `/guides/:slug`, `/property-graph`, `/answers`
SEO: `src/seo/` (components, data, services)

---

## Future Phases

### V5 — Matching & Appointments (Planned)
- Real-time matching engine with URS scoring
- Calendar integration (Google Calendar API)
- Appointment booking flow with Stripe payment

### V6 — Growth & Analytics (Planned)
- Contractor growth dashboards
- Territory exclusivity management
- Lead qualification pipeline
- Platform-wide analytics

---

_Each phase is designed to be independently deployable while maintaining backward compatibility._
