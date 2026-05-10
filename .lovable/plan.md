# UNPRO Go-Live Critical Fix Plan

Minimal, surgical changes. No redesign. No homepage touch. No Alex voice changes.

## Part 1 — Admin Session Stability (FIX 1)

### Problem
`/admin` shows "Validation administrateur impossible — timeout" for `yturcotte@gmail.com`. Root cause in `ProtectedRoute.tsx`: a 3.5s `setTimeout` flips the admin check to `denied/load_error` before the `user_roles` query resolves on slow connections. There is no retry, no cache, no email fallback.

### Changes
1. **`src/lib/adminGuard.ts`** (new, ~60 lines)
   - `ADMIN_EMAILS = ["yturcotte@gmail.com"]` allowlist fallback.
   - `isAdminCached(userId)` / `setAdminCached(userId)` — `localStorage` key `unpro_admin_validated_v1` with 24h TTL, scoped per user_id.
   - `validateAdmin(userId, email)` — sequence:
     1. Cache hit → return `allowed`.
     2. Email in `ADMIN_EMAILS` → set cache, return `allowed`.
     3. Query `user_roles` with retry (3 attempts, 1s/2s/4s backoff, 8s per attempt).
     4. If any attempt finds `role='admin'` → cache + allow.
     5. Final fallback: query `profiles.role` (read-only check, doesn't change schema).
     6. Only deny after all retries exhausted AND email not in allowlist.

2. **`src/components/ProtectedRoute.tsx`** — replace the admin branch:
   - Remove the 3.5s hard timeout.
   - Use `validateAdmin()` instead of one-shot Supabase query.
   - While checking, show loader (do NOT redirect, do NOT logout).
   - On `denied`, render `AdminAccessDenied` (existing) — no navigation.
   - Save current path so reconnect returns to same `/admin/*` page (already partially done via `saveReturnPath`; verify).

3. **`src/hooks/useAuth.ts`** — keep as-is, but ensure `roleTimedOut` (8s) does NOT flip `isAuthenticated` to false. Verify session is never cleared on role timeout.

### Result
- Admin stays logged in across long ops.
- `yturcotte@gmail.com` always passes via email fallback even if `user_roles` is slow/empty.
- 24h local cache → instant admin entry on subsequent visits.

---

## Part 2 — Outbound Automation Pipeline (FIX 2, 4)

### Schema (migration)
Reuse existing `outbound_prospects`, `outreach_messages`, `contractor_enriched_profiles` where possible. Add only what's missing:

- **`automation_jobs`** (new): `id, type text, status text default 'pending', started_at, completed_at, error_message, created_by uuid, metadata jsonb, created_at`. RLS: admin-only.
- **`contractor_leads`** (new if not present — check first; likely overlap with `outbound_prospects`. If overlap, add missing columns to `outbound_prospects` instead: `aipp_score int, recommended_plan text, profile_id uuid, last_contacted_at timestamptz`).

### Edge function: `acquisition-pipeline-runner` (new)
Single orchestrator invoked by the admin button. Body: `{ source, limit, dry_run }`.
Steps per lead:
1. **scrape** — call existing `scrape-rbq-leads` / `scrape-google-leads` functions OR accept a manual list.
2. **enrich** — call existing `autonomous-acquisition-engine` (already present per `useAutonomousAcquisition.ts`) with `action: 'run_pipeline'`.
3. **score** — reuse existing AIPP scoring edge function. On failure, store fallback score with `score_label = 'estimé'`.
4. **draft profile** — insert into `contractor_profiles` with `status='draft', source='outbound', imported_logo_url, imported_images, aipp_score, recommended_plan`.
5. **outreach gate** — only enqueue email/SMS if:
   - `outbound_prospects.approval_status = 'approved'`
   - `email_domain_health.spf_valid AND dkim_valid AND mx_valid` (read from `useOutboundHealth`)
   - `outbound_mailboxes.auth_status = 'connected'`
   Otherwise mark `outreach_messages.status = 'blocked_infra'`.
6. **generate join link** — `/join/contractor?lead_id={uuid}` stored in lead row.
7. Log every step into `automation_jobs.metadata.steps[]`.

### Frontend
**`src/pages/admin/AdminAcquisitionLauncher.tsx`** (new) accessible from existing admin nav:
- Button: **"Lancer acquisition automatique"** → invokes `acquisition-pipeline-runner`.
- Realtime panel reading `automation_jobs` + `outbound_prospects`:
  - Active jobs, leads scraped, profiles drafted, emails sent, SMS sent, contractors joined, Stripe payments, activated, errors.
- Emergency actions: Retry admin validation · Restart pipeline · Pause/Resume outbound (toggle row in `outbound_settings`) · Test one contractor flow · Send one test email (uses existing `send-outbound-test-email`).

### Contractor join flow `/join/contractor?lead_id=...`
- Page loads lead, fetches `aipp_score` and recommended plan.
- Reuses existing `ContractorOnboardingLanding` (per memory) + Alex voice autostart (existing).
- After Alex collects goal + confirms profile, calls existing Stripe checkout flow (existing `voice-sales-checkout` per memory).
- Stripe webhook (existing) flips `contractor_profiles.status` to `active` and links `profile_id` back on the lead.

---

## Part 3 — Mailbox Status (FIX 3)

In `PanelLiveKPIs.tsx` and `ModalConfirmGoLive.tsx`:
- DKIM failure → show **yellow** banner: *"SMTP connecté — DKIM à corriger avant volume production."*
- Do NOT block the admin dashboard.
- Test send button stays enabled if `auth_status='connected'` AND mailbox is on a verified SMTP host.
- Mass send (pipeline outreach step) stays blocked until SPF+DKIM+MX all pass (already enforced server-side in step 5 above).

---

## Part 4 — Out of Scope
- No homepage / public site changes.
- No Alex voice config changes.
- No design system changes.
- No new tables beyond `automation_jobs` (and lead column additions if needed).
- Existing edge functions reused — only `acquisition-pipeline-runner` is new.

---

## Technical Details

### Files created
- `src/lib/adminGuard.ts`
- `src/pages/admin/AdminAcquisitionLauncher.tsx`
- `supabase/functions/acquisition-pipeline-runner/index.ts`
- 1 migration: `automation_jobs` + column additions to `outbound_prospects` (only if missing)

### Files edited
- `src/components/ProtectedRoute.tsx` — admin branch only
- `src/components/admin/system/PanelLiveKPIs.tsx` — DKIM yellow state
- `src/components/admin/system/ModalConfirmGoLive.tsx` — non-blocking DKIM
- Admin route registration to add `/admin/acquisition` (single route entry)

### Cache key
`localStorage["unpro_admin_validated_v1"] = { user_id, email, ts }` — 24h TTL.

### Retry policy (admin validate)
3 attempts, exponential backoff 1s/2s/4s, 8s per query. Total max ~30s but UI stays in "Validating…" without ever rendering the denied screen unless every attempt explicitly returns "no admin row".

### Success criteria match
1. `/admin` never locks out → no hard timeout, email fallback, cache.
2. `yturcotte@gmail.com` admin → guaranteed via `ADMIN_EMAILS`.
3. "Lancer acquisition automatique" button exists and triggers pipeline.
4–10. Pipeline orchestrator handles full chain: scrape → enrich → score → draft → outreach (gated) → join link → Alex → Stripe → activation.