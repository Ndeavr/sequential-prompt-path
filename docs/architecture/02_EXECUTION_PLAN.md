# 02 — Execution Plan

> Phased build order with dependencies, deliverables, and success criteria.

## Phase Overview

```
V1 Core ──→ V2 Syndicates ──→ V3 Ingestion ──→ V4 Knowledge+SEO
   │              │                  │                  │
   ▼              ▼                  ▼                  ▼
 Auth          Condo SaaS       Doc Analysis      Public Pages
 Profiles      Reserve Fund     RAG Pipeline      Answer Engine
 Properties    Maintenance      Quote AI          30k+ SEO
 Projects      Loi 16           Entity Extract    Knowledge Graph
 Contractors   Stripe Billing   Media Pipeline    Agent System
```

---

## V1 — Core Platform

### Dependencies
- Lovable Cloud enabled
- Supabase project provisioned

### Deliverables

| # | Component | Tables | Routes | Status |
|---|-----------|--------|--------|--------|
| 1.1 | Auth system | `profiles`, `user_roles` | `/login`, `/signup` | ✅ Done |
| 1.2 | Property CRUD | `properties` | `/dashboard/properties/*` | ✅ Done |
| 1.3 | Contractor profiles | `contractors`, `contractor_members`, `contractor_services`, `contractor_service_areas` | `/pro/*`, `/contractors/:id` | ✅ Done |
| 1.4 | Projects & Quotes | `projects`, `quotes` | `/dashboard/quotes/*` | ✅ Done |
| 1.5 | Contractor onboarding | `checkout_sessions`, `contractor_subscriptions`, `plan_catalog` | `/contractor-onboarding` | ✅ Done |
| 1.6 | Verification engine | `contractor_verification_runs`, + 6 child tables | `/verify` | ✅ Done |
| 1.7 | AIPP scoring | `contractor_aipp_scores`, `aipp_scores` | `/dashboard/aipp-score` | ✅ Done |
| 1.8 | Admin dashboard | — | `/admin/*` | ✅ Done |

### Acceptance
- [ ] User can sign up, get role assigned, see correct dashboard
- [ ] Contractor can complete onboarding, subscribe, manage profile
- [ ] Verification engine runs 8-step audit and produces verdict
- [ ] Admin can view all users, contractors, and verification results

---

## V2 — Syndicates (Condos)

### Dependencies
- V1 complete
- Stripe products created for condo tiers

### Deliverables

| # | Component | Tables | Routes | Status |
|---|-----------|--------|--------|--------|
| 2.1 | Syndicate entity | `syndicates`, `syndicate_members` | — | ✅ Done |
| 2.2 | Building passport | `syndicate_components` | `/condos/dashboard` | ✅ Done |
| 2.3 | Maintenance calendar | `syndicate_maintenance_tasks`, `syndicate_maintenance_logs` | `/condos/maintenance` | ✅ Done |
| 2.4 | Document vault | `syndicate_documents` | `/condos/documents` | ✅ Done |
| 2.5 | Reserve fund | — | `/condos/fonds-prevoyance` | ✅ Done |
| 2.6 | Condo billing | `condo_subscriptions` | `/condos/billing` | ✅ Done |
| 2.7 | Public condo pages | — | `/condos/loi-16`, `/condos/tarifs` | ✅ Done |
| 2.8 | Condo onboarding | — | `/condos/onboarding` | ✅ Done |

### Acceptance
- [ ] Syndicate admin can create building, add components, schedule maintenance
- [ ] Document vault enforces RLS per syndicate membership
- [ ] Stripe checkout creates subscription tied to syndicate
- [ ] Building health score computes from component data

---

## V3 — Ingestion & Intelligence

### Dependencies
- V1 + V2 complete
- Lovable AI gateway available

### Deliverables

| # | Component | Tables | Edge Functions | Status |
|---|-----------|--------|---------------|--------|
| 3.1 | Document analysis | `rag_documents`, `rag_chunks` | `extract-document-entities` | ✅ Done |
| 3.2 | RAG pipeline | — | `rag-ingest` | ✅ Done |
| 3.3 | Quote analyzer | `quote_analyses` | `analyze-quote-document` | ✅ Done |
| 3.4 | Property creation from tax bill | — | `create-property-from-tax-bill` | ✅ Done |
| 3.5 | Media orchestrator | — | `media-orchestrator` | ✅ Done |
| 3.6 | Business import | — | `import-business-website` | ✅ Done |
| 3.7 | GMB fusion | — | `search-gmb-profile` | ✅ Done |

### Acceptance
- [ ] Uploaded PDF extracts entities and populates property fields
- [ ] RAG chunks are searchable via vector similarity
- [ ] Quote analyzer compares 2+ bids with AI explanation
- [ ] GMB profile links to contractor with match confidence

---

## V4 — Knowledge Graph + SEO

### Dependencies
- V1–V3 complete
- Knowledge graph seed data loaded

### Deliverables

| # | Component | Tables | Routes | Status |
|---|-----------|--------|--------|--------|
| 4.1 | Knowledge graph | `home_problems`, `home_solutions`, `category_problem_links` | `/property-graph` | ✅ Done |
| 4.2 | Answer engine | `answer_templates`, `answer_logs` | `/answers` | ✅ Done |
| 4.3 | SEO: service+city | — | `/services/:cat/:city` | ✅ Done |
| 4.4 | SEO: problem+location | — | `/problems/:slug/:city` | ✅ Done |
| 4.5 | SEO: profession pages | — | `/profession/:slug` | ✅ Done |
| 4.6 | SEO: guide pages | — | `/guides/:slug` | ✅ Done |
| 4.7 | Agent system | `agent_registry`, `agent_tasks`, `agent_logs` | `/admin/agents` | ✅ Done |
| 4.8 | RBQ reference data | `rbq_license_subcategories`, `project_work_taxonomy`, `rbq_project_compatibility_rules` | — | ✅ Done |

### Acceptance
- [ ] Problem → Solution → Professional → City graph is navigable
- [ ] Answer engine returns structured responses with cost estimates
- [ ] SEO pages render with JSON-LD, canonical tags, and internal links
- [ ] Agent tasks are proposed, reviewed, and executed with audit trail

---

## Build Order Rule

> Never start phase N+1 until phase N acceptance criteria pass. Each phase must leave the database in a consistent, RLS-protected state.

---

_Last updated: 2026-03-14_
