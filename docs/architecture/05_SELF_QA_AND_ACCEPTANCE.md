# 05 — Self-QA & Acceptance

> Automated verification rules and acceptance criteria for every build phase.

---

## Pre-Commit Checklist (Every Change)

### Schema Safety
- [ ] No duplicate table names in migration SQL
- [ ] No `ALTER TABLE auth.users` or modifications to reserved schemas
- [ ] No FK references to `auth.users` — use `user_id UUID` without FK
- [ ] All new tables have `ENABLE ROW LEVEL SECURITY`
- [ ] All RLS policies use `auth.uid()` or `has_role()` — never client-side checks
- [ ] No CHECK constraints with `now()` — use validation triggers instead
- [ ] `contractors` table remains separate from `profiles`

### Code Safety
- [ ] `src/integrations/supabase/client.ts` was NOT modified
- [ ] `src/integrations/supabase/types.ts` was NOT modified
- [ ] `supabase/config.toml` was NOT modified
- [ ] `.env` was NOT modified
- [ ] No hardcoded colors — only semantic Tailwind tokens
- [ ] No roles stored on profiles table or in localStorage
- [ ] No anonymous signups implemented
- [ ] Supabase client imported from `@/integrations/supabase/client`

### Security
- [ ] New tables with user data have RLS policies
- [ ] Admin access uses `has_role(auth.uid(), 'admin')` server-side
- [ ] Storage access uses signed URLs (no public bucket access for private data)
- [ ] No API keys or secrets hardcoded in frontend code
- [ ] Edge function secrets are configured in Supabase Vault

---

## Phase Acceptance Tests

### V1 — Core Platform

#### Auth (V1.1)
```
TEST: Sign up with email → profile created in profiles table
TEST: Sign up with role "contractor" → user_roles entry created
TEST: Login → session established, correct dashboard shown
TEST: Unauthorized access to /admin → redirected to /login
VERIFY: handle_new_user trigger fires on auth.users INSERT
```

#### Properties (V1.2)
```
TEST: Create property → visible only to owner (RLS)
TEST: Other user cannot SELECT owner's property
TEST: Admin can view all properties via has_role()
TEST: Property detail page loads with correct data
```

#### Contractors (V1.3)
```
TEST: Contractor profile is separate from user profile
TEST: contractor_members links user to contractor entity
TEST: Public contractor page loads without auth
TEST: Contractor can edit own profile, not others'
```

#### Verification (V1.6)
```
TEST: Create verification run → linked to user_id
TEST: Child tables (visual_extractions, risk_signals) inherit access via owns_verification_run()
TEST: RBQ reference data is publicly readable
TEST: Verdict enum accepts: succes, attention, non_succes, se_tenir_loin
```

### V2 — Syndicates

```
TEST: Create syndicate → creator becomes owner_admin member
TEST: Non-members cannot access syndicate data (RLS)
TEST: Board members can edit, read_only cannot
TEST: Condo checkout creates Stripe session for correct tier
TEST: Webhook updates condo_subscriptions on payment
TEST: Building health score computes from syndicate_components
```

### V3 — Ingestion

```
TEST: Upload PDF → rag_documents + rag_chunks created
TEST: Vector search returns relevant chunks above threshold
TEST: Quote analyzer processes 2+ documents and returns comparison
TEST: Entity extraction populates property fields
```

### V4 — Knowledge Graph + SEO

```
TEST: home_problems → home_solutions relationship is traversable
TEST: SEO page at /services/:cat/:city renders with JSON-LD
TEST: Answer engine returns structured response for known question
TEST: Agent task can be created, approved, and executed
TEST: Agent audit log records all actions
```

---

## Guardrail Violations (Auto-Reject)

The following patterns MUST trigger an immediate rollback or fix:

| Violation | Detection | Action |
|-----------|-----------|--------|
| FK to `auth.users` | Migration SQL contains `REFERENCES auth.users` | Remove FK, keep `user_id UUID` |
| Edit `types.ts` | File diff shows `types.ts` changes | Revert — file is auto-generated |
| Edit `config.toml` | File diff shows `config.toml` changes | Revert — file is auto-managed |
| Role on profiles | Migration adds `role` column to `profiles` | Move to `user_roles` table |
| Public storage | Bucket created with `public: true` (for private data) | Set to private, use signed URLs |
| Hardcoded color | Component uses `text-white`, `bg-black`, etc. | Replace with semantic token |
| Missing RLS | New table without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | Add RLS + policies |
| Anonymous signup | `supabase.auth.signUp()` without email | Replace with standard auth flow |
| Reserved schema mod | Migration touches `auth.*`, `storage.*`, `realtime.*` | Remove — not allowed |
| Client-side admin | `localStorage.getItem('role') === 'admin'` | Replace with `has_role()` query |

---

## Continuous Verification Commands

### Check for schema duplicates
```sql
SELECT table_name, COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public'
GROUP BY table_name
HAVING COUNT(*) > 1;
```

### Check RLS is enabled on all tables
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

### Check for orphaned policies
```sql
SELECT pol.polname, tab.relname
FROM pg_policy pol
JOIN pg_class tab ON pol.polrelid = tab.oid
WHERE tab.relnamespace = 'public'::regnamespace;
```

### Verify no FK to auth.users
```sql
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE confrelid = 'auth.users'::regclass;
```

---

## Post-Deploy Smoke Test

After any deployment, verify:

1. **Homepage loads** — no console errors, hero section renders
2. **Auth flow** — signup → email verification → login → dashboard
3. **Protected routes** — unauthenticated access redirects to `/login`
4. **Admin routes** — non-admin access shows unauthorized
5. **SEO pages** — at least one `/services/:cat/:city` page returns 200
6. **Edge functions** — `verify-contractor` responds to POST
7. **Storage** — file upload to `contractor-documents` succeeds with signed URL

---

_Run these checks after every significant change. Failures must be fixed before proceeding._
