# UNPRO — Multi-Channel Acquisition Hardening + Deterministic Targeting

## Scope
Extend the existing acquisition pipeline (already partially LTI-decoupled in the previous turn) so it:
1. Targets a specific contractor on demand (deterministic mode).
2. Never stops on Twilio Lookup/NPAC failures.
3. Automatically falls back from SMS to Resend email.
4. Persists full audit + reconciliation data visible in Admin.

No new tables, no parallel systems, no rebuilds. Reuses `acquisition-queue-worker`, `send-verified-batch`, `twilio-lookup-phone`, `outreach-resend-send`, `verified_contractor_prospects`, `acquisition_pipeline_events`.

## Current state (already done in previous turn)
- `twilio-lookup-phone` returns `number_valid` + `lti_available`.
- `acquisition-queue-worker` maps unknown-but-valid CA numbers to Tier C instead of quarantining.
- `compute_sms_eligibility_tier` trigger relaxed for Tier C.
- `send-verified-batch` already has partial SMS→email fallback logic (per prior turn's summary).

## Work remaining

### 1. Deterministic targeting (`acquisition-queue-worker`)
Add optional filters accepted in the `campaign` payload:
- `contractor_lead_id`, `contractor_prospect_id`
- `business_name_exact`, `business_name_ilike`
- `phone_e164`, `email`

Rules:
- If any deterministic filter is set → bypass scoring, process only matches, never substitute.
- Log `selection_mode: 'deterministic' | 'scored'`, filter used, chosen row id, and scoring values (when scored) into `acquisition_pipeline_events`.

### 2. Multi-channel delivery (`send-verified-batch`)
Confirm and finalize the existing SMS-first + Resend-fallback flow:
- Tier A/B/C → attempt SMS; on recoverable Twilio errors (21610 opt-out, 30003/30005/30006 unreachable, 30008 unknown, timeout, 5xx) → email fallback.
- Tier D or SMS permanent failure (21211 invalid, 21614 not mobile, landline confirmed) → email-only.
- Persist per attempt: `channel_used`, `sms_attempted`, `sms_provider_message_id`, `sms_error_code`, `sms_error_message`, `email_sent`, `email_provider`, `email_provider_message_id`, `fallback_reason`, `fallback_timestamp`, `delivery_status`, `retry_count`, `last_attempt_at`.
- Migration: add any of the above columns to `verified_contractor_prospects` that are still missing (idempotent `ADD COLUMN IF NOT EXISTS`).

### 3. Retry classification
Central helper in `send-verified-batch`:
- Recoverable → increment `retry_count`, requeue with backoff (max configurable, default 3).
- Permanent (invalid number, landline confirmed, opt-out) → mark terminal, skip retry, email fallback if email exists.

### 4. Immutable audit log
One row per outbound attempt in `acquisition_pipeline_events` with stage `outreach_attempt` containing: contractor id, business, channel, fallback reason, provider IDs, provider raw response, outcome. Never mutated.

### 5. Admin UI (`PageAdminAcquisitionPipeline.tsx` + hooks)
Two additions only — no new pages:
- **Business targeting panel**: inputs (business name / email / phone / contractor id) + "Exécuter sur ce contractor" button → calls the worker with deterministic filters.
- **Reconciliation table**: contractor, primary channel, fallback channel, Twilio SID, Resend msg id, delivery status, open, click, registration, payment, failure reason, retry count. Searchable. Sourced from `verified_contractor_prospects` joined with `acquisition_pipeline_events`.

### 6. Production safeguards
Worker + batch sender wrap every provider call in try/catch that logs + continues to next candidate. No global stop on NPAC/Lookup/timeout/Resend outage.

### 7. End-to-end verification
Live run with `{ city: "Laval", category: "plombier", limit: 1, business_name_exact: "Plomberie Expert KF & Fils Inc" }` (or user-provided). Return full reconciliation: selected row + reason, Twilio SID + status, fallback decision, Resend id if used, final status, DB updates, audit entry.

## Files to change
- `supabase/functions/acquisition-queue-worker/index.ts` — deterministic filters + scoring bypass + selection logging.
- `supabase/functions/send-verified-batch/index.ts` — finalize retry classification + column writes.
- `supabase/migrations/<new>.sql` — additive columns (only those still missing) on `verified_contractor_prospects`.
- `src/pages/admin/PageAdminAcquisitionPipeline.tsx` + related hook — targeting panel + reconciliation table.

## Out of scope (per user)
No SEO, sitemap, AI corpus, content, affiliates, role-switcher, or unrelated systems. No new tables. No new edge functions.

## Verification checklist
- Deterministic filter with fake id → 0 processed, no substitution.
- Deterministic filter with real business → exactly that row processed.
- CA number with LTI unavailable → SMS attempted, on failure email fallback fires, both IDs stored.
- Landline with email → email-only, no SMS attempted, no retry.
- Twilio outage simulated (bad key) → worker continues, all rows fall back to email.
- Reconciliation UI shows every field for each attempt.
