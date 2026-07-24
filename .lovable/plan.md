## Root cause (confirmed against production DB)

Three concrete Postgres errors are being logged as `promotion_insert_failed` / `fallback_insert_failed` in `acquisition_pipeline_events` over the last 24h:

| # | Count | PG error | Real cause |
|---|---|---|---|
| 1 | **824** | `null value in column "verification_status" ... violates not-null constraint` (23502) | Column is `NOT NULL DEFAULT 'needs_enrichment'`. `acquisition-queue-worker/promoteProspect` explicitly inserts `verification_status: null`, overriding the default. |
| 2 | **380** | `null value in column "category" ... violates not-null constraint` | `category` is `NOT NULL`. Candidates coming from sources whose category didn't map (raw string, e.g. `"plumber"` vs `"plombier"`, or missing) reach the insert with `null`. |
| 3 | **228** | `violates check constraint "verified_contractor_prospects_phone_validation_status_check"` | Allowed values are `valid_mobile|valid_sms_capable_voip|landline|invalid|disconnected|unverified`. Other writers (`acq-phone-backfill`, `_shared/phoneValidation`, some fallback inserter) write `verified_mobile`, `verified_not_mobile`, `verified`, `lookup_failed`, `invalid_format` — none of which pass the check. |

Plomberie Expert KF & Fils Inc reproduces #1: the row is built, `verification_status: null` is sent, Postgres rejects, promotion is aborted, no SMS is attempted.

The current event only stores `reason_text` + `metadata.pg_code`, so `error.details`, `error.hint`, target table, operation, prospect_id and run_id are not persisted — the operator only sees `"promotion_insert_failed"`.

## Fix plan (P0, no scope creep)

Scope: only the promotion insert path, the fallback insert enum, error persistence, idempotency, and one-prospect replay. **No** landing/scraper/Twilio/scoring/dashboard-style changes.

### 1. `supabase/functions/acquisition-queue-worker/index.ts` — primary promotion insert
- Remove `verification_status: null` from the insert row; let the `'needs_enrichment'` default apply. Keep the healing branch that resets `verification_status` back to `'needs_enrichment'` (not `null`) when a stale row is detected.
- Skip the candidate before the insert when `category` is empty. Emit a distinct `reason_code = 'category_missing'` event (not `promotion_insert_failed`) so it stops polluting the counter.
- Normalize category once at the top of the candidate loop using the existing FR/EN map (`plumber`→`plombier`, `roofer`→`toiture`, `insulation`→`isolation`, etc.). If still unknown, emit `category_unmapped` and skip.
- Persist the full DB error on every insert failure via a new helper `logDbFailure(op, table, err, ctx, lead)` that writes to `acquisition_pipeline_events.metadata` all of: `pg_code`, `pg_message`, `pg_details`, `pg_hint`, `table`, `operation`, `prospect_id`, `run_id`, `payload_keys`.

### 2. Fallback path — check-constraint violation
- Audit the three writers that set `phone_validation_status` outside the allowed enum (`_shared/phoneValidation.ts`, `acq-phone-backfill/index.ts`, `acq-normalize-repair/index.ts`) and map their outputs to the DB-allowed values:
  - `verified_mobile` → `valid_mobile`
  - `verified_not_mobile` → `landline`
  - `verified` (generic) → `valid_mobile` when line_type=mobile, else `landline`
  - `lookup_failed` / `invalid_format` → `invalid`
- No schema change; the constraint is correct.

### 3. Idempotency (already partial, complete it)
- Add a Postgres unique index migration on `verified_contractor_prospects(phone_e164) WHERE phone_e164 IS NOT NULL` if not already present, and switch the insert to `.upsert(row, { onConflict: 'phone_e164', ignoreDuplicates: false })` returning the existing row. This closes the race where two workers promote the same phone twice.
- Reuse existing verification: keep the current `verificationIsFresh` gate — do not re-call Twilio Lookup when `phone_line_type ∈ {mobile,landline,voip}` and `sms_eligibility_tier ∈ {A,B,C,D}`.

### 4. Run status must reflect reality
- In the worker, when 100% of candidates fail promotion for a given `run_id`, mark `acquisition_pipeline_runs.status = 'blocked'` (not `running`/`succeeded`) and store the aggregated top DB error on the run row.
- In `PageAdminAcquisitionPipeline.tsx`, render `blocked` runs with the raw DB error + required next action; no other UI change.

### 5. One-prospect proof
- Add a tiny admin action `Replay one prospect (KF)` that:
  1. Looks up Plomberie Expert KF & Fils Inc in `contractor_prospects`.
  2. Calls `acquisition-queue-worker` in targeted mode with `prospect_ids: [<id>]`, `dry_run: false`, `limit: 1`.
  3. Waits for the run to finish and displays the 12-stage strip.
- Success gate to display in Admin: `verified=1, promoted=1, queued=1, sms_attempted=1, sms_sent=1 OR twilio_error_code=<code>`. Any earlier stage failure blocks the run.

### 6. Safe replay of the backlog
- After the KF proof succeeds, add an admin action `Replay failed promotions (24h)` that:
  - Selects distinct `phone_e164` from `acquisition_pipeline_events` where `reason_code IN ('promotion_insert_failed','fallback_insert_failed','category_missing','category_unmapped')` in the last 24h and not already `outreach_status IN ('sent','delivered','clicked','activated')`.
  - Feeds them to the repaired worker in batches of 25.
  - Idempotent upsert + existing `history_prospect_contacted` gate prevents duplicate SMS.

## Verification (must all pass before declaring success)

1. Manual reproduce → real DB error persisted with `pg_code=23502` and `details/hint` fields (not just `promotion_insert_failed`).
2. Deploy → replay KF alone → row appears in `verified_contractor_prospects` with `verification_status='needs_enrichment'`, then progresses to `valid_mobile`, then SMS attempted.
3. Admin shows `sms_sent=1` **or** an explicit Twilio Messaging error code on the KF row.
4. Backlog replay processes ≥ 100 previously failed rows without emitting a single new `promotion_insert_failed` and without any duplicate SMS (`select phone_e164, count(*) from outreach_sms_logs where sent_at > now()-interval '1h' group by 1 having count(*)>1` returns 0 rows).
5. `acquisition_pipeline_runs.status` correctly reads `blocked` when a run has 0 successful promotions.

## Files touched (planned)

- `supabase/functions/acquisition-queue-worker/index.ts` — insert row, error logger, category normalization, upsert, run-status write.
- `supabase/functions/_shared/phoneValidation.ts` — map to DB-allowed enum values.
- `supabase/functions/acq-phone-backfill/index.ts` — same enum mapping.
- `supabase/functions/acq-normalize-repair/index.ts` — same enum mapping.
- `src/pages/admin/PageAdminAcquisitionPipeline.tsx` — two buttons (replay one KF, replay 24h backlog), blocked-run rendering.
- One migration: unique partial index on `verified_contractor_prospects(phone_e164)` (idempotent `IF NOT EXISTS`).

Out of scope (untouched): landing page, scraper, scoring, Twilio Lookup logic, dashboard styling, SEO, sitemap, AI corpus.
