# RBQ Compliance Status System

Add a first-class compliance field on contractors that drives badges AND recommendation eligibility.

## 1. Database migration

Extend `public.contractors` (existing `rbq_number` stays):

```sql
CREATE TYPE public.rbq_status AS ENUM ('verified','in_progress','not_provided','expired');

ALTER TABLE public.contractors
  ADD COLUMN rbq_status public.rbq_status NOT NULL DEFAULT 'not_provided',
  ADD COLUMN rbq_verified_at   timestamptz,
  ADD COLUMN rbq_expiry_date   date,
  ADD COLUMN rbq_last_check    timestamptz;

CREATE INDEX contractors_rbq_status_idx ON public.contractors(rbq_status);
```

Backfill:
- rows with a valid-looking `rbq_number` + `verification_status='verified'` → `verified`, set `rbq_verified_at = now()`.
- rows with `rbq_number` present but unverified → `in_progress`.
- rows with no `rbq_number` → `not_provided`.

Nightly cron edge function `rbq-expiry-sweeper` flips `verified` → `expired` when `rbq_expiry_date < now()` and stamps `rbq_last_check`.

## 2. Shared compliance helper

New `src/lib/compliance/rbqStatus.ts` — single source of truth:

- `RBQ_STATUS` type + `RBQ_BADGES` map (label FR/EN, tone, icon).
- `getRbqCompliance(contractor)` → `{ status, badge, eligibility, visibilityMultiplier, explanation }`.
- Bilingual explanation strings (FR canonical, EN fallback):
  - verified — « Licence RBQ vérifiée et active. » / "RBQ license verified and active."
  - in_progress — « Démarche RBQ en cours. Éligible aux catégories sans exigence de licence obligatoire. »
  - not_provided — « Aucune licence RBQ fournie. Visibilité réduite, badge conformité indisponible. »
  - expired — « Licence RBQ expirée ou invalide. Recommandations suspendues jusqu'à correction. »

## 3. Badge component

New `src/features/compliance/RbqStatusBadge.tsx` — colored pill using existing design tokens (green/amber/muted/destructive), tooltip carries FR+EN explanation. Reused on:
- public contractor profile
- `/pro/profile`
- admin contractor detail view
- recommendation cards (secondary chip)

## 4. Recommendation engine rules

Update `src/features/planSystem/recommendationScoreEngine.ts` (and `v_contractor_recommendation_score` view / edge scoring where applicable):

| Status | Eligibility | Score effect |
|---|---|---|
| verified | 100% | ×1.0, unlocks compliance badge |
| in_progress | Only for categories not requiring an active RBQ (checked against `services.rbq_required`) | ×0.85 |
| not_provided | Eligible only where RBQ not mandatory | ×0.60, no compliance badge |
| expired | Excluded entirely | ×0 (filtered out) |

If `services.rbq_required` column doesn't exist yet, add a boolean column with sensible defaults for the trades listed in the qualification engine (roofing, foundation, electrical, plumbing, hvac → true; landscaping, painting → false).

## 5. Profile form update

`src/pages/pro/ProProfile.tsx` — add RBQ block: number, status dropdown (contractor-editable only to `not_provided` / `in_progress`; `verified` and `expired` are admin/system-controlled), expiry date picker. Uses existing `isValidRbq`.

## 6. Admin surface

Admin contractor detail: manual override of `rbq_status`, `rbq_verified_at`, `rbq_expiry_date` with an audit row into existing `contractor_domain_admin_notes` (or `admin_action_logs`).

## 7. Verification

- Typecheck.
- Migration applies cleanly, backfill counts match.
- Badge renders in all 4 states.
- Recommendation query excludes `expired` and de-ranks `not_provided` / `in_progress`.
- Playwright: visit a seeded contractor profile per status and screenshot the badge + tooltip.

## Files touched

- new: `supabase/migrations/<ts>_rbq_status.sql`
- new: `supabase/functions/rbq-expiry-sweeper/index.ts` + cron entry
- new: `src/lib/compliance/rbqStatus.ts`
- new: `src/features/compliance/RbqStatusBadge.tsx`
- edit: `src/features/planSystem/recommendationScoreEngine.ts`
- edit: `src/pages/pro/ProProfile.tsx`
- edit: admin contractor detail page
- edit: public contractor profile + recommendation cards to render the badge
