
# Repair Acquisition Pipeline → First Real $1

## Root cause (traced, not guessed)

Real dashboard state on `verified_contractor_prospects` (last 15 rows):
- `phone_line_type = 'unknown'` on every recent row
- `phone_validation_status = 'unverified'`
- `sms_eligibility_tier = null`
- `verification_status = 'verified'` (set by an older backfill) while `sms_eligible = true`

`send-verified-batch` filters on `sms_eligibility_tier IN ('A','B','C') AND verification_status='verified' AND data_quality_score>=80 AND website_url NOT NULL`. Every promoted row is missing tier → **100% gated → QUARANTINED = 1, SMS_SENT = 0**.

`acquisition-queue-worker.promoteProspect` inserts rows with `phone_line_type=null, verification_status=null`, then relies on the LIVE branch to call `twilio-lookup-phone`. But `verificationIsFresh()` short-circuits when older rows already have `verification_status='verified'` (set by the earlier backfill) even though `phone_line_type` is still `null`/`unknown` — so **Twilio Lookup is skipped and the row is left with no tier**. That is why `TWILIO_LOOKUPS_EXECUTED = 0` after launch.

Second bug: `promoteProspect` returns the existing row without patching stale fields, so any row created by other paths (`run-live-acquisition`, backfills) is never healed.

Third bug: quarantine event is written with `reason_code = null`, so the Admin only shows the word `QUARANTINED` with no reason.

Nothing is wrong with Twilio credentials themselves — `Réno-Toit` was sent as Tier C proving the send path works.

## Fix (edge-function only, no schema redesign)

### 1. `_shared/acquisitionPipeline.ts`
- Add canonical `QUARANTINE_REASON` constants covering: `missing_phone`, `invalid_phone`, `landline`, `voip_unverified`, `lookup_failed`, `lookup_timeout`, `casl_failed`, `historically_contacted`, `send_gate_failed`, `tier_blocked`, `promotion_insert_failed`, `api_error`.
- Extend `logPipelineEvent` helper with `metadata.reason_detail` so every rejection has a machine + human reason.

### 2. `acquisition-queue-worker/index.ts` (promotion + lookup path)
- Tighten `verificationIsFresh`: require BOTH `verification_status='verified'` AND `phone_line_type IN ('mobile','landline','voip')` AND `sms_eligibility_tier IN ('A','B','C','D')`. Anything else → force a Twilio Lookup pass.
- In `promoteProspect`, when the existing row has `phone_line_type IS NULL` OR `sms_eligibility_tier IS NULL`, reset `verification_status = null` on the returned struct so the LIVE branch re-runs Lookup instead of trusting stale flags.
- After Lookup: always write `phone_line_type`, `phone_validation_status`, `sms_eligibility_tier`, `sms_eligible`, `eligibility_reason`, `verification_status`, `verified_at`, `last_action_at`. On Lookup HTTP error or timeout write explicit `rejection_reason_code` from the new constants and emit a `stage='quarantined'` event with the reason.
- Add a real 12-step `emitEvent` sequence for every prospect (`matched → promoted → historical_check → lookup_requested → lookup_result → tier_classified → send_attempted → sms_queued → sms_delivered → clicked → signup → paid`) so the Admin timeline strip renders real state instead of derived counts.

### 3. `send-verified-batch/index.ts`
- Never silently skip: for every ID passed in `prospect_ids` that fails the gate, write a `stage='quarantined'` event with the exact reason (`tier_blocked:<tier>`, `not_verified:<status>`, `quality_below_80:<score>`, `missing_website_url`, `already_<status>`) and mirror the reason into `verified_contractor_prospects.rejection_reason_code/text`.
- On Twilio 4xx/5xx, store `outreach_twilio_sid=null`, `outreach_failure_reason=<body slice>`, `rejection_reason_code='twilio_<http_status>'`, and emit `stage='rejected'` with the parsed Twilio error code (21610 opt-out, 21614 invalid, 30003 unreachable, …) so the dashboard shows a real cause.
- Emit `stage='contacted'` + `metadata={sid, to_masked, from}` on 2xx (already present, keep).

### 4. Retry surface (Admin API)
- Extend `acquisition-queue-worker` to accept `action` values: `retry_lookup`, `retry_promotion`, `retry_send`, `retry_campaign`. Each takes `prospect_ids[]` and re-executes only the requested step against existing rows (no duplicates, idempotent).

### 5. Twilio inbound + status webhooks
- `twilio-sms-status`/`twilio-status-webhook`: on every callback update `verified_contractor_prospects.outreach_status` (`queued → sent → delivered → failed`), write `outreach_delivered_at`, and emit corresponding `stage='delivered' | 'failed'` event with SID and Twilio `ErrorCode`.

### 6. Admin — `/admin/acquisition-pipeline`
- Add per-prospect trace drawer that reads `acquisition_pipeline_events` filtered by `prospect_id`, rendering the 12 steps with `success | failure | timestamp | reason_code | raw metadata`.
- Replace the plain "QUARANTINED" pill with the resolved `reason_code` from the latest event.
- Add per-campaign row: success %, avg duration, failure stage, "Retry Lookup / Retry SMS / Retry Promotion / Open logs / Twilio SID".
- Rejection reasons view already exists (`v_acquisition_rejection_reasons`) — surface it grouped for the current run.

### 7. Verification steps (real data, no mocks)
After deploy, from Admin `/admin/acquisition-pipeline`:
1. Run `Aperçu 3 prospects` on Laval × plombier → expect the current 8 Laval plumbers listed with real reasons.
2. Launch `Ville=Laval, Catégorie=plombier` (dry_run=false, limit=3).
3. Confirm event stream fires: promoted → lookup_requested → lookup_result(type=mobile) → tier_classified(A) → send_attempted → contacted(sid=SMxxx).
4. Poll Twilio status webhook → `delivered`.
5. First real recipient clicks the `/unpro/activate/:token` link → `clicked` stage.
6. Signup + Stripe $1 → `signup`, `paid`, `activated`.

Stop and surface the exact failing external request only if Twilio / Stripe returns an unrecoverable error.

## Files touched (only these)
- `supabase/functions/_shared/acquisitionPipeline.ts`
- `supabase/functions/acquisition-queue-worker/index.ts`
- `supabase/functions/send-verified-batch/index.ts`
- `supabase/functions/twilio-sms-status/index.ts` (and the equivalent status webhook already in use)
- `src/pages/admin/PageAdminAcquisitionPipeline.tsx` + `src/hooks/useFunnelAudit.ts` (trace drawer, real reasons, retry buttons)
- No schema changes required (`acquisition_pipeline_events`, `verified_contractor_prospects`, `contractor_prospects` already have the needed columns).

## Success criteria
Real campaign on Laval × plombier produces, in `acquisition_pipeline_events`, non-zero counts for every stage from `matched` through `paid`, mirrored in the Admin strip, using existing production prospects. Every quarantine row carries a machine-readable reason. First `verified_contractor_prospects.outreach_status='delivered'` + first `acq_subscriptions` row at $1 = done.
