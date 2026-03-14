# BLOCK 1 — Full Audit & Migration-Safe Extension Plan

> Generated: 2026-03-14 | Status: COMPLETE

---

## 1. AUDIT SUMMARY

The UNPRO codebase is **production-grade and mature**. It contains 85+ database tables, 115+ routes, 35+ hooks, 20+ edge functions, 5 storage buckets, and a complete contractor marketplace + verification engine + condo SaaS platform. The new property-centric vision (Passeport Maison, public pages, QR, map, grants) requires **extending** existing tables — not rebuilding.

---

## 2. WHAT ALREADY EXISTS

### 2.1 Database Schema (85+ tables)

| Domain | Tables | Status |
|--------|--------|--------|
| **Auth/Identity** | `profiles` (email, full_name, salutation, first_name, last_name, account_type, avatar_url), `user_roles` (app_role enum: homeowner/contractor/admin) | ✅ Solid. `handle_new_user` trigger auto-creates both. |
| **Properties** | `properties` (address, city, province, postal_code, property_type, year_built, square_footage, condition, lot_size, photo_url, user_id) | ✅ Exists. Missing: slug, public_status, claimed_by, lat/lng, normalized_address. |
| **Property Intelligence** | `property_documents`, `property_events`, `property_insights`, `property_scores`, `property_master_records`, `property_aliases`, `property_members`, `property_merge_candidates`, `property_source_links`, `property_ai_extractions`, `property_components`, `home_scores` | ✅ Strong foundation. |
| **Contractors** | `contractors` (separate from profiles, linked via user_id) with slug, aipp_score, verification_status, license, insurance, etc. | ✅ Correct architecture. |
| **Contractor Ecosystem** | 18 tables: services, areas, credentials, media, members, public_pages, public_scores, ai_profiles, dna_profiles, aipp_scores, gmb_profiles, review_aggregates, review_dimension_scores, comparables, problem_links, category_assignments, performance_metrics, subscriptions | ✅ Very mature. |
| **Verification** | 7 tables: runs, visual_extractions, probable_entities, registry_validations, license_scope_results, risk_signals, verification_assets + verification_reports | ✅ Complete engine. |
| **RBQ/Taxonomy** | `rbq_license_subcategories`, `rbq_license_work_types`, `project_work_taxonomy`, `rbq_project_compatibility_rules` | ✅ Seeded. |
| **Projects/Quotes** | `projects`, `quotes`, `quote_analysis`, `project_matches`, `project_context_snapshots` | ✅ Full pipeline. |
| **Matching** | `match_evaluations`, `match_explanations`, `dna_fit_results`, `homeowner_dna_profiles`, alignment questions, CCAI | ✅ Sophisticated. |
| **SEO/Knowledge Graph** | `home_problems`, `home_solutions`, `home_professions`, edges, city pages, `category_problem_links`, `cities`, `service_categories`, `answer_templates`, `answer_logs` | ✅ Full graph. |
| **Syndicates** | 15+ tables: members, components, documents, votes, projects, maintenance, reserve fund, budgets, audit logs, quote analyses, subscriptions | ✅ Complete condo SaaS. |
| **Billing** | `plan_catalog`, `contractor_subscriptions`, `checkout_sessions`, `promo_codes`, `subscription_accounts` | ✅ Stripe integration. |
| **AI/Agents** | `agent_registry`, `agent_tasks`, `agent_logs`, `agent_memory`, `agent_metrics` | ✅ Orchestration layer. |
| **RAG/Ingestion** | `rag_documents`, `rag_chunks`, `rag_queries_log`, `ingestion_jobs`, `ingestion_job_items`, `extraction_jobs`, `data_sources`, `field_validations` | ✅ Document AI pipeline. |
| **Conversations** | `conversations`, `conversation_messages`, `conversation_memory`, `alex_sessions` | ✅ Alex AI. |
| **Validation** | `validation_runs`, `validation_findings`, `page_scores`, `improvement_tasks` | ✅ Self-QA. |

### 2.2 Enums

| Enum | Values |
|------|--------|
| `app_role` | homeowner, contractor, admin |
| `appointment_status` | requested, under_review, accepted, declined, scheduled, completed, cancelled |
| `property_condition` | excellent, good, fair, poor, critical |
| `quote_status` | pending, analyzed, accepted, rejected |
| `verification_status` | unverified, pending, verified, rejected |
| `verification_verdict` | succes, attention, non_succes, se_tenir_loin |
| `syndicate_member_role` | owner, board_member, manager, administrator |
| `ingestion_doc_type` | tax_bill, contractor_quote, reserve_fund_study, inspection_report, maintenance_document, insurance_certificate, other |
| `rbq_status` | valid, expired, suspended, not_found, unknown |
| `neq_status` | active, inactive, struck_off, not_found, unknown |
| `risk_severity` | low, medium, high |
| `vote_status` | draft, open, closed, cancelled |

### 2.3 Security Functions

| Function | Purpose |
|----------|---------|
| `has_role(uuid, app_role)` | SECURITY DEFINER role check |
| `handle_new_user()` | Auto-creates profile + role on signup |
| `owns_verification_run()` | RLS helper for verification |
| `is_syndicate_member()` | Condo access check |
| `is_syndicate_admin()` | Condo admin check |
| `get_contractor_public_profile()` | Aggregated public data |
| `get_contractor_dashboard()` | Private dashboard data |
| `match_rag_chunks()` | Vector similarity search |
| `search_rag_chunks_text()` | Full-text search |
| `validate_unpro_promo_code()` | Billing validation |

### 2.4 Views

| View | Purpose |
|------|---------|
| `v_contractor_public_profile` | Public-safe contractor data with review intelligence |
| `v_contractor_full_public` | Extended public data with AI profile |
| `v_match_results_safe` | Safe match results for homeowners |
| `ccai_answer_matrix` | Alignment questionnaire answers |
| `dna_profile_summary` | DNA profiles for both homeowners and contractors |

### 2.5 Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `contractor-documents` | No | Contractor certifications, licenses |
| `property-photos` | No | Property images |
| `inspection-reports` | No | Inspection documents |
| `quote-files` | No | Quote PDFs |
| `media-assets` | Yes | Public portfolio images |

### 2.6 Edge Functions (20+)

agent-orchestrator, alex-chat, analyze-quote-document, analyze-reserve-fund-study, answer-engine, check-condo-subscription, compute-contractor-score, compute-property-score, condo-growth-engine, condo-stripe-webhook, create-billing-portal, create-checkout-session, create-condo-checkout, create-property-from-tax-bill, elevenlabs-tts, extract-document-entities, import-business-website, media-orchestrator, rag-ingest, search-gmb-profile, seed-knowledge-graph, stripe-webhook, validation-orchestrator, verify-contractor

### 2.7 Secrets Configured

LOVABLE_API_KEY, ELEVENLABS_API_KEY, SUPABASE_ANON_KEY, SUPABASE_DB_URL, STRIPE_SECRET_KEY, FIRECRAWL_API_KEY, GOOGLE_PLACES_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY

### 2.8 Frontend Structure

| Directory | Contents |
|-----------|----------|
| `src/pages/` | 35+ pages: Home, Search, Login, Signup, contractor profiles, verification, pricing, SEO pages |
| `src/pages/dashboard/` | Homeowner dashboard: properties, quotes, home-score, insights, appointments, documents, syndicates |
| `src/pages/pro/` | Contractor dashboard: profile, AIPP, reviews, leads, billing, territories |
| `src/pages/admin/` | Admin: users, contractors, quotes, reviews, territories, agents, validation |
| `src/pages/condos/` | Condo SaaS: dashboard, building, components, maintenance, documents, reports, billing |
| `src/pages/seo/` | Programmatic SEO: city, service-location, problem, profession, guide pages |
| `src/components/` | 10 feature folders: agents, alex, contractor, flywheel, growth, home, matching, navigation, onboarding, verification + ui (50+ shadcn components) |
| `src/hooks/` | 36 hooks covering all domains |
| `src/services/` | 20+ service files + verification subfolder |
| `src/features/` | 9 feature modules |
| `src/lib/` | utils, formatting, geoHelpers, scoringEngine, aiHelpers |
| `src/seo/` | SEO data + components + content service |
| `src/config/` | Navigation, scoring weights, plan rules, pricing |
| `src/layouts/` | Main, Dashboard, Contractor, Admin, Condo layouts |

---

## 3. WHAT WILL BE REUSED (DO NOT RECREATE)

| Asset | Reuse Strategy |
|-------|---------------|
| `properties` table | **Extend** with new columns |
| `property_master_records` | **Reuse** as enrichment layer (canonical_address, cadastral, evaluation) |
| `property_documents` | **Reuse** for Passeport Maison document vault |
| `property_events` | **Reuse** for property timeline/history |
| `property_scores` | **Reuse** for Home Score |
| `property_components` | **Reuse** for digital twin |
| `property_insights` | **Reuse** for AI recommendations |
| `property_aliases` | **Reuse** for address normalization |
| `home_scores` | **Reuse** for detailed score breakdown |
| All contractor tables | **Reuse as-is** |
| All matching/CCAI tables | **Reuse** |
| All SEO/knowledge graph tables | **Reuse** and extend |
| All syndicate tables | **Reuse as-is** |
| All agent tables | **Reuse** |
| Auth system | **Reuse as-is** |
| All edge functions | **Reuse** |
| Storage buckets | **Reuse** |
| Design system | **Reuse** |

---

## 4. MIGRATION-SAFE DB EXTENSION PLAN

### Phase 2 — Property Core

```sql
-- Extend properties table (all nullable, no breaking changes)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS public_status TEXT DEFAULT 'estimated';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS claimed_by UUID;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS normalized_address TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS street_number TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS street_name TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS neighborhood TEXT;

-- Unique constraint on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug) WHERE slug IS NOT NULL;

-- Index for public lookups
CREATE INDEX IF NOT EXISTS idx_properties_public_status ON public.properties(public_status);
CREATE INDEX IF NOT EXISTS idx_properties_normalized_address ON public.properties(normalized_address);

-- RLS: public read for public_status != 'private'
-- (Policy will be added as a new policy, not replacing existing ones)
```

### Phase 3 — Claim + Passeport Maison

```sql
-- Passport completion tracking
CREATE TABLE IF NOT EXISTS public.property_passport_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL, -- 'toiture', 'plomberie', 'electricite', etc.
  section_label_fr TEXT NOT NULL,
  completion_pct INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  last_updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, section_key)
);

ALTER TABLE public.property_passport_sections ENABLE ROW LEVEL SECURITY;
```

### Phase 4 — Home Score Extensions

```sql
-- Extend property_scores if needed
ALTER TABLE public.property_scores ADD COLUMN IF NOT EXISTS score_confidence TEXT DEFAULT 'estimated';
ALTER TABLE public.property_scores ADD COLUMN IF NOT EXISTS score_source TEXT DEFAULT 'auto';

-- Neighborhood averages cache
CREATE TABLE IF NOT EXISTS public.neighborhood_score_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postal_code TEXT NOT NULL,
  city TEXT,
  avg_score NUMERIC,
  property_count INTEGER DEFAULT 0,
  score_distribution JSONB,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(postal_code)
);
```

### Phase 5 — Grants Engine

```sql
CREATE TABLE IF NOT EXISTS public.grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr TEXT NOT NULL,
  name_en TEXT,
  provider TEXT NOT NULL,
  program_url TEXT,
  max_amount INTEGER,
  eligibility_rules JSONB DEFAULT '{}',
  property_types TEXT[],
  regions TEXT[],
  status TEXT DEFAULT 'active', -- active, closed, upcoming
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_grant_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'insufficient_info', -- available, maybe, insufficient_info, not_available
  confidence NUMERIC,
  missing_fields TEXT[],
  assessed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, grant_id)
);
```

### Phase 7 — QR System

```sql
CREATE TABLE IF NOT EXISTS public.property_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  qr_type TEXT NOT NULL, -- 'property', 'panel', 'jobsite'
  token TEXT NOT NULL UNIQUE,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qr_scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES public.property_qr_codes(id),
  scanned_at TIMESTAMPTZ DEFAULT now(),
  user_agent TEXT,
  ip_hash TEXT,
  referrer TEXT
);

-- Contractor contributions
CREATE TABLE IF NOT EXISTS public.contractor_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id),
  contribution_type TEXT NOT NULL, -- 'work_completed', 'inspection', 'photo'
  title TEXT NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Phase 8 — Public Map

```sql
-- Cache view for public map markers (no sensitive data)
CREATE TABLE IF NOT EXISTS public.property_map_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  public_status TEXT,
  estimated_score INTEGER,
  property_type TEXT,
  city TEXT,
  postal_code TEXT,
  computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_map_cache_coords
  ON public.property_map_cache(latitude, longitude);
```

### Phase 9 — SEO Registry

```sql
CREATE TABLE IF NOT EXISTS public.seo_page_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  page_type TEXT NOT NULL, -- 'property', 'city', 'service_location', 'problem', 'guide'
  entity_id UUID,
  title TEXT,
  meta_description TEXT,
  is_indexable BOOLEAN DEFAULT false,
  data_quality_score INTEGER,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_page_registry_type ON public.seo_page_registry(page_type);
```

### Phase 11 — Agent Jobs

```sql
-- Already exists: agent_registry, agent_tasks, agent_logs, agent_memory, agent_metrics
-- No new tables needed. Extend agent_registry with new agent_key entries via INSERT.
```

---

## 5. FOLDER STRUCTURE (POST-CLEANUP)

```
src/
├── agents/                    ← NEW barrel
├── app/                       ← exists (providers, router, App)
├── assets/                    ← exists
├── components/
│   ├── ui/                    ← exists (50+ shadcn)
│   ├── agents/                ← exists
│   ├── alex/                  ← exists
│   ├── contractor/            ← exists
│   ├── flywheel/              ← exists
│   ├── growth/                ← exists
│   ├── home/                  ← exists
│   ├── matching/              ← exists
│   ├── navigation/            ← exists
│   ├── onboarding/            ← exists
│   └── verification/          ← exists
├── config/                    ← exists
├── features/                  ← exists (9 modules)
├── hooks/                     ← exists (36 hooks)
├── layouts/                   ← exists
├── lib/                       ← exists
├── pages/                     ← exists (35+ pages)
├── seo/                       ← exists
├── services/
│   ├── contractor/            ← NEW barrel
│   ├── grants/                ← NEW placeholder
│   ├── lead/                  ← NEW barrel
│   ├── messages/              ← NEW placeholder
│   ├── property/              ← NEW barrel
│   ├── qr/                    ← NEW placeholder
│   ├── score/                 ← NEW barrel
│   ├── seo/                   ← NEW barrel
│   └── verification/          ← exists
└── types/                     ← exists (10 type files)
```

---

## 6. VERIFICATION CHECKLIST

- [x] `auth.users` = identity source
- [x] `profiles` = application layer (auto-created via trigger)
- [x] `contractors` separate from `profiles`
- [x] Roles in `user_roles` only (never on profiles)
- [x] `has_role()` SECURITY DEFINER exists
- [x] Storage buckets are private (except media-assets)
- [x] RLS enabled on data tables
- [x] No FK to `auth.users` schema in application tables
- [x] Design system uses semantic tokens
- [x] Routes protected by role via `ProtectedRoute`
- [x] No duplicate tables identified
- [x] All barrel indexes reference existing exports

---

## 7. REGRESSION RISKS

| Risk | Mitigation |
|------|-----------|
| Adding columns to `properties` could break existing queries | All new columns nullable with defaults; update `useProperties` hook after migration |
| New routes could conflict with existing | Namespace property routes under `/maison/` |
| RLS on extended properties | Add new policies, don't replace existing |
| `property_master_records` overlap | Use as enrichment source, `properties` remains user-facing |

---

## 8. RECOMMENDED NEXT STEP

**Phase 2 (Property Core)** — Run the `properties` table migration, add slug generation service, address normalization, and create the `/maison/[slug]` public property page. Say **"Go Phase 2"** when ready.
