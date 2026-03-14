# 01 — Master Context

> Single source of truth for UNPRO's architecture, data model, and design principles.

## 1. Vision

UNPRO is an **AI operating system for property ownership** in Quebec. It consolidates property intelligence, building diagnostics, contractor verification, and marketplace matching into a unified SaaS platform powered by the **Alex** AI assistant.

## 2. Conceptual Layers

```
┌─────────────────────────────────────────────┐
│  L4 — Public Authority Layer                │
│  SEO pages, Answer Engine, Knowledge Graph  │
├─────────────────────────────────────────────┤
│  L3 — Marketplace Layer                     │
│  Contractor profiles, AIPP scores, matching │
├─────────────────────────────────────────────┤
│  L2 — Decision Layer                        │
│  Recommendations, costs, timing, AI scoring │
├─────────────────────────────────────────────┤
│  L1 — Property Intelligence Layer           │
│  Properties, documents, events, Home Score  │
└─────────────────────────────────────────────┘
```

## 3. User Roles

| Role | Description |
|------|-------------|
| `homeowner` | Property owner — manages properties, projects, quotes |
| `contractor` | Professional — manages business profile, leads, appointments |
| `admin` | Platform operator — full access, validation, agent orchestration |

Roles are stored in `public.user_roles` (never on `profiles`). A user can hold multiple roles. Priority: admin > contractor > homeowner.

## 4. Data Model — Core Entities

### Identity
- `auth.users` → identity source (managed by Supabase Auth)
- `profiles` → application layer (created via `handle_new_user` trigger)
- `user_roles` → role assignments (enum: `app_role`)

### Properties
- `properties` → address, type, year_built, owner via `profile_id`
- `property_components` → building components (roof, HVAC, etc.)
- `property_events` → maintenance history, inspections

### Contractors (separate from profiles)
- `contractors` → business entity (business_name, slug, license, city)
- `contractor_members` → links users to contractor entities
- `contractor_services` → service offerings
- `contractor_service_areas` → geographic coverage
- `contractor_credentials` → verified certifications
- `contractor_media` → portfolio images
- `contractor_ai_profiles` → AI-generated personality summaries
- `contractor_dna_profiles` → behavioral DNA for matching
- `contractor_aipp_scores` → AI Presence & Performance score
- `contractor_gmb_profiles` → Google My Business data

### Verification Engine
- `contractor_verification_runs` → each verification session
- `contractor_visual_extractions` → OCR results from images
- `contractor_probable_entities` → reconstructed identities
- `contractor_registry_validations` → RBQ/NEQ snapshots
- `contractor_license_scope_results` → license-to-project mapping
- `contractor_risk_signals` → detected risk factors
- `contractor_verification_assets` → uploaded file metadata

### Knowledge Graph (V4)
- `home_problems` → property issues
- `home_solutions` → recommended fixes
- `service_categories` → professional categories
- `cities` → geographic entities
- `rbq_license_subcategories` → RBQ reference data
- `project_work_taxonomy` → homeowner work types
- `rbq_project_compatibility_rules` → license-project fit rules

### Projects & Quotes
- `projects` → links property + service category to quoting lifecycle
- `quotes` → contractor bids on projects
- `quote_analyses` → AI-powered quote comparison

### Syndicates (Condos)
- `syndicates` → condo building entity
- `syndicate_members` → role-based access (owner_admin, board_member, manager)
- `syndicate_components` → building asset inventory
- `syndicate_maintenance_tasks` / `syndicate_maintenance_logs`
- `syndicate_documents` → secure document vault
- `condo_subscriptions` → SaaS billing via Stripe

### Agents
- `agent_registry` → registered AI agents
- `agent_tasks` → proposed/executed actions
- `agent_logs` → audit trail
- `agent_memory` → persistent agent context
- `agent_metrics` → performance tracking

## 5. Architecture Guardrails

### Schema Invariants
1. **No duplicate tables**: Every entity has exactly one canonical table. Check existing schema before creating.
2. **No FK to auth.users**: Application tables reference `profiles.user_id` or use `user_id UUID` without FK to `auth.users`.
3. **Contractors ≠ Profiles**: Never merge contractor fields into profiles. They are separate business entities.
4. **RLS on everything**: Every table with user data must have RLS enabled with appropriate policies.
5. **Private by default**: Properties, documents, projects, and quotes are visible only to their owner unless explicitly shared.

### Code Invariants
1. Never edit `src/integrations/supabase/client.ts` or `types.ts`
2. Never edit `supabase/config.toml` or `.env`
3. Use `supabase` client from `@/integrations/supabase/client`
4. Use semantic Tailwind tokens — no hardcoded colors in components
5. Feature code lives in `src/features/` or `src/pages/` — not in `src/components/ui/`

## 6. Security Model

- **Authentication**: Email/password + Google OAuth (via Supabase Auth)
- **Authorization**: RLS policies + `has_role()` security definer function
- **Storage**: All buckets private; use `supabase.storage.createSignedUrl()`
- **Secrets**: Stored in Supabase Vault; never in code or `.env`
- **Admin checks**: Always server-side via `has_role(auth.uid(), 'admin')` — never client-side

## 7. Integration Points

| System | Purpose | Connection |
|--------|---------|------------|
| Stripe | Payments | Edge functions + webhooks |
| Google Places | GMB data | Edge function via API key |
| Lovable AI | AI features | Built-in gateway, no key needed |
| ElevenLabs | Voice (Alex) | Connector-managed secret |
| Firecrawl | Web scraping | Connector-managed secret |

---

_This document is the canonical reference. All other docs derive from it._
