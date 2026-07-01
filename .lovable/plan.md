
# UNPRO Admin Operations Center — `/admin/ops`

Unified command layer over every existing admin repair tool. Nothing is removed; existing routes stay intact. New layer summarizes, ranks by ROI, automates the safe fixes, and requires explicit approval for the risky ones.

---

## 1. Database (single migration)

### `admin_system_checks`
Current state of each health check.
- `check_key` (unique), `label`, `category`
- `status`: `healthy | warning | critical | unknown`
- `affected_count`, `last_checked_at`, `last_auto_fix_at`
- `recommended_action`, `repair_route`, `metadata jsonb`

### `admin_repair_jobs`
Every dry-run / apply / auto-fix attempt.
- `job_type`, `status` (`queued|running|dry_run_completed|waiting_approval|applied|failed|skipped`)
- `risk_level` (`safe|review|danger`), `affected_count`
- `sample_diff jsonb` (≤20 rows: `{record_id, table, field, before, after, reason, safe_to_apply}`)
- `summary jsonb`, `error_message`
- `created_by`, `approved_by`, `applied_at`

**RLS:** admin-only via `has_role(auth.uid(),'admin')`; `service_role` full. Grants for `authenticated` + `service_role` in same migration.

---

## 2. Tool Registry — `src/admin/adminToolsRegistry.ts`

Static catalog of every existing admin tool. Shape:
```ts
{ id, label, description, route, category,
  risk_level: 'safe'|'review'|'danger',
  automation_available, requires_approval,
  related_tables: string[], primary_metric, recommended_action }
```
Seeded with: Normalization, Phone Validation, Acquisition Funnel, Outreach Funnel, Dispatch Bottleneck, Recovery Sprint, Revenue Gate, Revenue Path, Contractor Activation, Stripe / Checkout audit, Profile Publishing, Scraper Import, Demand Intelligence, Redirect / CTA Tracking, Twilio & Email Health, Outreach Health.

Rendered at bottom of `/admin/ops` in a grouped “All Admin Tools” directory (Revenue • Acquisition • Data Quality • Delivery • Trust/Safety).

---

## 3. Edge Function — `admin-ops-health-check`

One idempotent scanner that upserts a row into `admin_system_checks` per `check_key`, and creates dry-run `admin_repair_jobs` for safe auto-fixes.

Checks (all read-only, cheap COUNT queries + LIMIT 20 samples):
- Company names with leading/trailing spaces or double spaces
- Inconsistent capitalization (city not title-case, province not `QC`)
- Phones not E.164 / missing `+1`
- Websites missing `https://`, mixed www, trailing slash w/o path
- Empty required profile fields
- Prospects stuck `invalid` >7d
- Leads pending validation >48h
- Contractors paid (`stripe_subscription_status=active`) but `profile_status != active`
- Contractors active but `slug` unreachable / no city / no category
- Outreach `sent` with no matching `acquisition_events` tracking row
- Tracking links with 0 redirect resolutions after 24h
- Demand signals waiting with no recruitment target

For each: compute `affected_count`, `status` (thresholds per check), and `recommended_action`. Safe fixes emit a `dry_run_completed` job; risky ones emit `waiting_approval`.

---

## 4. Normalization Bridge

`acq-normalize-repair` already exists. Wrap it so every dry-run/apply writes an `admin_repair_jobs` row with the 20-row diff. No rule changes to the existing shared module beyond confirming:
- trim + collapse spaces
- E.164 only when deterministic (NANP 10/11 digits)
- URL: add `https://`, lowercase host, strip trailing `/` unless path
- City → Title Case, Province → `QC` uppercase
- Company names: **trim only** (no case rewrites — protects brands)
- Email: trim + lowercase domain only

/admin/normalization page gains a link back to `/admin/ops` and shows its last job from `admin_repair_jobs`.

---

## 5. `/admin/ops` Page — `src/pages/admin/PageAdminOps.tsx`

Route registered in `src/app/router.tsx` under the admin guard. Uses `.admin-theme` wrap per readability rule.

### Layout (top → bottom)

**A. Highest ROI Actions** (ranked list, top of page)
Rank: `critical` → revenue impact weight → `affected_count` → `automation_available`. Each row: severity chip, why-it-matters one-liner, primary CTA button, owner tag (`admin | automation | lovable_fix`).

**B. System Health Grid** (9 cards)
Data Normalization • Phone Validation • Outreach Delivery • Contractor Onboarding • Stripe Activation • Profile Publishing • Scraper Quality • Tracking/Clicks • Demand Signals.

Each card: status pill, `affected_count`, `last_checked_at`, `last_auto_fix_at`, `action_required`, primary CTA linking to the exact repair route from the registry. Expandable 20-row evidence table pulled from the latest `admin_repair_jobs.sample_diff`.

**C. Automated Jobs Panel**
Table of recent `admin_repair_jobs`: last run, status, scanned, fixed, needs-approval, failed. Buttons: Run health check now • Normalization dry-run • Apply safe fixes • Re-run phone validation • Rebuild contractor visibility • Recheck Stripe activations • Recompute demand targets. Each button invokes the corresponding existing edge function and refreshes the checks table.

**D. All Admin Tools Directory**
Rendered from `adminToolsRegistry.ts`, grouped by category with risk-level chips.

---

## 6. Safety Matrix (enforced in edge function + UI gating)

| Class | Examples | Behavior |
|---|---|---|
| **Safe** | trim, URL protocol, city/province case, deterministic E.164 | Auto dry-run + one-click apply |
| **Review** | company name rewrites, mark lead valid, activate paid contractor with unclear Stripe evidence, merge duplicates | Requires `approved_by` before apply |
| **Danger** | bulk delete, overwrite scraped data, mutate Stripe state, change subscription plan | UI blocks; requires typed confirmation + logs `danger` job |

---

## 7. Cron

`pg_cron` runs `admin-ops-health-check` every 15 min (`net.http_post` with anon key) so `/admin/ops` is always fresh without user action.

---

## 8. Out of Scope (this iteration)

- No changes to existing admin pages' internals beyond linking back to `/admin/ops`.
- No deletion of legacy routes.
- No new business logic in normalization module.
- No app-wide redesign.

---

## Files touched

**New**
- `supabase/migrations/<ts>_admin_ops_center.sql`
- `supabase/functions/admin-ops-health-check/index.ts`
- `src/admin/adminToolsRegistry.ts`
- `src/pages/admin/PageAdminOps.tsx`
- `src/hooks/useAdminOps.ts` (TanStack Query bindings for checks + jobs)
- `src/components/admin/ops/HealthCard.tsx`
- `src/components/admin/ops/NextActionRow.tsx`
- `src/components/admin/ops/RepairJobsTable.tsx`
- `src/components/admin/ops/ToolsDirectory.tsx`

**Edited**
- `src/app/router.tsx` — register `/admin/ops`
- Admin nav — add “Operations Center”
- `src/pages/admin/PageAdminNormalization.tsx` — wire jobs into `admin_repair_jobs`, add link back to `/admin/ops`
- `supabase/config.toml` — register new edge function

**Success**
`/admin/ops` loads with 9 populated health cards, ranked ROI actions, at least one working safe auto-fix (URL protocol or trim), and a linked directory of every existing admin tool — with zero regressions to current routes.
