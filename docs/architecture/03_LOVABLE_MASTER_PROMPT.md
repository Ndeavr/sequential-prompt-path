# 03 — Lovable Master Prompt

> Canonical instructions for Lovable to execute the UNPRO build. Paste this as project knowledge or use as a reference prompt.

---

## Identity

You are building **UNPRO**, an AI-powered property intelligence platform for Quebec. The platform serves homeowners, contractors, and condo syndicates.

## Stack

- React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- Lovable Cloud (Supabase: Postgres, Auth, Edge Functions, Storage)
- Stripe for payments
- Lovable AI Gateway for all AI features

## Critical Rules

### Database
1. **Never create duplicate tables.** Before any migration, check `types.ts` and existing schema.
2. **Never FK to `auth.users`.** Use `user_id UUID` columns without foreign keys to auth schema.
3. **Contractors are NOT profiles.** `contractors` is a separate business entity table linked via `user_id`.
4. **RLS on all tables** with user data. Use `has_role()` for admin access.
5. **Use validation triggers** instead of CHECK constraints for time-based validations.
6. **Never modify** `auth`, `storage`, `realtime`, or `supabase_functions` schemas.
7. **Use the migration tool** for all schema changes. Never edit `types.ts` manually.

### Code
1. **Never edit** `client.ts`, `types.ts`, `config.toml`, or `.env` — these are auto-managed.
2. **Import Supabase** from `@/integrations/supabase/client`.
3. **Semantic tokens only** — use CSS variables from `index.css`, never hardcoded colors.
4. **Feature organization**: business logic in `src/features/`, pages in `src/pages/`, shared UI in `src/components/ui/`.
5. **Roles in `user_roles`** table only. Never store roles on profiles or in localStorage.

### Security
1. **Private by default**: properties, documents, projects, quotes.
2. **Storage buckets are private**. Use signed URLs.
3. **Admin checks server-side** via `has_role(auth.uid(), 'admin')`.
4. **No anonymous signups**. Standard email/password + optional OAuth.
5. **Email verification required** unless user explicitly requests auto-confirm.

### AI Features
1. **Use Lovable AI Gateway** for all AI capabilities — no external API keys needed.
2. Supported models: Gemini 2.5 Pro/Flash, GPT-5/Mini/Nano.
3. For edge functions needing AI, use the `LOVABLE_API_KEY` secret.

## Architecture Layers

```
L4: Public Authority — SEO pages, Answer Engine, Knowledge Graph
L3: Marketplace — Contractor profiles, AIPP, matching engine
L2: Decision — AI scoring, recommendations, cost estimates
L1: Property Intelligence — Properties, documents, events, Home Score
```

## Data Flow

```
User Input → Property/Project → Matching Engine → Contractor Recommendations
     ↓              ↓                    ↓
  Documents    Knowledge Graph      AIPP + DNA + CCAI Scores
     ↓              ↓                    ↓
  RAG Chunks    SEO Pages          Appointments + Quotes
```

## Key Relationships

- `profiles.user_id` → `auth.users.id` (trigger-created)
- `contractors.user_id` → `auth.users.id` (no FK)
- `properties.profile_id` → `profiles.id`
- `projects.property_id` → `properties.id`
- `projects.service_category_id` → `service_categories.id`
- `quotes.project_id` → `projects.id`
- `contractor_verification_runs.user_id` → `auth.users.id` (no FK)

## Naming Conventions

- Tables: `snake_case`, plural (`contractors`, `properties`)
- Columns: `snake_case` (`business_name`, `created_at`)
- Enums: `snake_case` (`app_role`, `verification_verdict`)
- Routes: kebab-case (`/contractor-onboarding`, `/home-score`)
- Components: PascalCase (`ContractorCard.tsx`, `HeroSection.tsx`)
- Hooks: camelCase with `use` prefix (`useAuth`, `useContractor`)

## Execution Protocol

1. Read the current schema from `types.ts` before any migration
2. Check for existing tables/columns to avoid duplicates
3. Create migration SQL via the migration tool
4. Implement frontend components referencing the new schema
5. Add RLS policies for every new table
6. Verify with console logs and network requests
7. Run acceptance criteria from `05_SELF_QA_AND_ACCEPTANCE.md`

---

_This prompt ensures Lovable builds consistently across sessions._
