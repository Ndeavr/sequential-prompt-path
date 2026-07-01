# Acquisition Recovery Sprint

Goal: move 238 imported → contactable → ready_for_contact → dispatched → delivered. No Stripe/matching/onboarding work.

## Phase 1 — Enrichment failure audit

New edge fn `acq-enrich-audit`:
- Classify the 156 no-contact leads by inspecting `contractor_leads` + `contractor_prospects` + latest run of `acq-enrich-contractor`.
- Buckets: `no_website`, `website_fetch_failed` (http 4xx/5xx/timeout logged), `parser_no_hits` (fetched but 0 tel/mailto/JSON-LD), `provider_error`, `normalization_dropped` (raw value present but normalized→null), `overwrite_wiped` (had value, later run set null), `duplicate_merge_loss`, `unknown`.
- Returns counts + 20 sample lead IDs per bucket.

Patch `acq-enrich-contractor`:
- Guard: never write NULL over an existing non-null `phone`/`email` (fixes overwrite bucket).
- Add extractors: `mailto:`, `tel:`, footer scan, `/contact`, `/nous-joindre`, JSON-LD `telephone`/`email`, obfuscated `(at)`/`[dot]`.
- Persist `enrichment_last_error`, `enrichment_last_source`, `enrichment_attempts` for observability.
- Ship whichever single patch addresses the largest bucket first; keep others behind the same fn.

## Phase 2 — Re-enrich missing leads

New edge fn `acq-reenrich-missing`:
- Query `contractor_leads WHERE phone IS NULL AND email IS NULL`.
- For each: try website → homepage → `/contact` → footer → mailto/tel → JSON-LD → cached Google Places payload (`contractor_prospects.raw_gmb_json` / `places_details`).
- Batched (concurrency 8), respects per-domain rate.
- Returns `{ before_missing, after_missing, new_phone_count, new_email_count, by_source }`.

## Phase 3 — Queue creation repair

New edge fn `acq-queue-audit`:
- Trace the 82 contactable → 0 `ready_for_contact` gap. Report per lead: `current_status`, `validation_status`, `phone_type`, `has_email`, `blocking_condition`, expected worker (`alex-outreach-queue-builder` or equivalent).

Patch queue builder (identified worker, likely `acquisition-autopilot` / `dispatch-outreach-batch`):
- Transition rule: `contactable AND (phone_type='mobile' OR email IS NOT NULL) AND NOT opted_out ⇒ ready_for_contact`.
- Idempotent upsert into `alex_outreach_queue`.
- Cron every 5 min + one-shot backfill call from repair phase.

## Phase 4 — Resend tag sanitizer

Central helper `supabase/functions/_shared/resendTags.ts`:
```
sanitizeTagValue(v) → strip accents (NFD), lowercase, replace non [A-Za-z0-9_-] with '_', trim to 256; drop tag if empty.
sanitizeTags(record) → array of {name,value}, drops invalids, never throws.
```
Wire into every `resend.emails.send` caller: `outreachDispatch.ts`, `outreach-resend-send`, `acq-followup-send`, `acq-test-send-email`, `acq-e2e-real`, `acq-e2e-selftest`, `email-daily-selftest`. Send proceeds even if all tags dropped (log warning to `outreach_repair_actions`).

## Phase 5 — Execute live repair

Call `dispatch-bottleneck-repair` with `dry_run=false` and actions:
`renormalize_phones, retry_stuck_validation, reenrich_missing_contact, requeue_orphaned, clear_dead_queue_locks, restart_stalled_workers`.

Immediately after: invoke `acq-queue-audit` + queue builder to materialize `ready_for_contact`. Still no outbound sends triggered by this step; sending remains gated by existing autopilot.

## Phase 6 — Final report page

Extend `/admin/dispatch-bottleneck` with a "Recovery Sprint" panel:
- BEFORE/AFTER counters: imported, contactable, ready_for_contact, queued.
- Top-20 recoverable prospects table (company, phone, email, current_status).
- Root cause ranking #1/#2/#3 from Phase 1 buckets.
- "Fastest path to first 10 activations" list: the 10 highest-score `ready_for_contact` leads with mobile phone or verified email.

## Technical notes

- New tables: none. New columns on `contractor_leads`: `enrichment_last_error text`, `enrichment_last_source text`, `enrichment_attempts int default 0`, `enrichment_last_run_at timestamptz` (migration with GRANTs — table already exists, just ALTER).
- New edge fns: `acq-enrich-audit`, `acq-reenrich-missing`, `acq-queue-audit`. Patched: `acq-enrich-contractor`, queue builder, all Resend senders.
- No schema-breaking changes; safe to ship incrementally (Phase 4 first to unblock any current send attempts, then 1→2→3→5→6).

## Out of scope
Stripe, matching, onboarding, message-content changes, new templates.
