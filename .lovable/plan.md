## Objective

Repair the existing autonomous acquisition pipeline so every qualified scraped prospect flows automatically through promotion → verification → eligibility → outreach. The city × category launcher is an added operator control on top — never the only path.

## Root cause recap

1. `acquisition-queue-worker` fallback selection uses global `order(created_at desc).limit(20)` → starves older Laval / plombier records.
2. Promotion into `verified_contractor_prospects` writes `phone_line_type='unknown'` + no `sms_eligibility_tier`, and sets `verification_status='verified'` unconditionally → false positive verification and empty send queue.
3. `twilio-lookup-phone` is wired only to `contacts`, never called on newly promoted prospects.
4. `send-verified-batch` has no way to be scoped to a specific run's prospect IDs.
5. No `run_id` correlation — Admin UI cannot render a real per-run funnel.

## Plan

### 1. Autonomous mode — fair queue selection (primary repair)

In `acquisition-queue-worker`, replace the current fallback:
- Drop global `order(created_at desc).limit(20)`.
- Select unprocessed eligible prospects using existing status fields, prioritizing in this order:
  1. Incomplete-but-eligible records (`verification_status IS NULL` OR stale) with a valid `phone_e164`.
  2. Oldest never-attempted records (`outreach_status='none'` OR NULL) — `order(created_at asc)`.
  3. Retryable failures (`acquisition_repair_log` with `repair_result='failed'` and attempts < 3) — respecting existing backoff.
- Apply the same normalization, exclusion (555, missing category, historical destinations), promotion and verification path used by targeted mode. One code path.

### 2. Targeted campaign mode — same code path, scoped

Accept:
```json
{ "campaign": { "city": "Laval", "category": "plumber", "limit": 25 }, "dry_run": false }
```
- Pre-filter the same selection query with city + normalized category before the shared processing loop runs. No divergent logic.

### 3. Category normalization

Build a small normalizer inside the worker mapping the operator input to all canonical equivalents present in production. First run a live inspection of distinct `contractor_leads.category_primary` and `.trade` values, then build the map. Seed:
- `plumber` ↔ `plumbing`, `plombier`, `plomberie`
- `roofing` ↔ `toiture`, `couvreur`
- `electrician` ↔ `électricien`, `electricite`, `electrical`
- (extend for each `TARGET_CATEGORIES` entry after inspection)
Matching: `.or("category_primary.in.(...)", "trade.in.(...)")` case-insensitive via `ilike` on lowered set. Applied only to targeted mode; autonomous mode processes all.

### 4. Idempotent promotion

`promoteProspect(lead)`:
- Compute canonical dedup key: normalized `phone_e164` + slugified `company_name`.
- Look up existing row in `verified_contractor_prospects` by that key.
- If exists: **update only null/stale fields** (`website_url`, `city`, `category` if null, `updated_at`). Never overwrite `casl_evidence_id`, `verification_status`, `verification_verified_at`, `outreach_status`, `outreach_history`, `sms_eligibility_tier`, `phone_line_type` when already set.
- If new: insert with `verification_status=null` (not `verified`).
- Emit `promoted` event exactly once per run (dedup by `(run_id, prospect_id)`).

### 5. Verification reuse gate — do not spend Twilio credits on valid records

Before calling `twilio-lookup-phone`, evaluate:
```
reuseVerification =
  phone_e164 present AND unchanged since verification
  AND phone_line_type ∈ {mobile, landline, voip}
  AND verification_status = 'verified'
  AND verified_at within existing freshness window (reuse the same constant already used by the send gate; if none is defined, use 90 days matching twilio-lookup-phone contacts cache)
```
- If `reuseVerification` → skip Lookup, emit `verification_reused` event, proceed to eligibility mapping using stored fields.
- Otherwise call `twilio-lookup-phone` (server-to-server) and apply eligibility mapping.

### 6. Correct eligibility mapping

After a Lookup call (or reuse):
- `mobile` → `sms_eligibility_tier='A'`, `sms_eligible=true`, `verification_status='verified'`, `verified_at=now()`.
- `voip` → `tier='C'` only if current send-gate policy allows (read the gate constant; if it disallows, treat as quarantine); `sms_eligible=false` unless allowed.
- `landline` → `tier='D'`, `sms_eligible=false` (email path).
- `unknown` → quarantine: `verification_status='unknown'`, `sms_eligible=false`, do NOT set `verified`.
- Lookup failure → quarantine with `verification_status='lookup_failed'` and `last_error_code`/`last_error_message` stored; mark `retryable=true` if provider returned a transient error, else false.
Store provider raw result in `metadata` on `acquisition_pipeline_events` (never in Admin UI card).

### 7. Historical-destination exclusion before paid Lookup

Before Lookup, cross-check normalized `phone_e164` against:
- `outreach_delivery_logs` (any status),
- `contractor_leads.last_sms_at IS NOT NULL`,
- `verified_contractor_prospects.outreach_status <> 'none'`.
If any match → emit `excluded_history` with source, skip Lookup and skip send.
The existing centralized `commercial-send-gate` remains the final authority before send; not bypassed, not duplicated.

### 8. Dry-run contract (no writes, no billable calls)

For `{ dry_run: true }`:
- No insert into `verified_contractor_prospects`, no update to verification fields, no `twilio-lookup-phone` invocation (even cached — skip entirely), no SMS, no outreach history mutation.
- Return counts: `matched`, `already_promoted`, `already_verified`, `lookup_required`, `historically_excluded`, `missing_or_invalid_phone`, `potentially_sms_eligible` (labeled `estimate=true`), `quarantined`.
- Emit a single `dry_run_preview` event tagged with `run_id`.

### 9. Scoped send

Update `supabase/functions/send-verified-batch/index.ts`:
- Accept optional `prospect_ids: string[]`. When present, add `.in('id', prospect_ids)` to the selection; ignore global limit if smaller than array length; still preserve CASL gate, commercial-send-gate, throttling, quiet hours, dedup.
- Return one result entry per supplied ID (including `skipped_by_gate` reasons) so the worker can update per-prospect state.
Worker auto-send invocation always passes the exact `prospect_ids` collected in the current run — no unscoped calls after targeted mode.

### 10. Single `run_id` correlation

- Worker generates one `run_id = crypto.randomUUID()` at entry.
- Every event insert includes `metadata.run_id`, `metadata.city`, `metadata.category`, `metadata.mode ∈ {autonomous, targeted}`.
- Stages allowed to be written by the worker: `queued`, `promoted`, `verification_reused`, `verified`, `excluded_history`, `quarantined`, `sms_attempted`, `sms_sent`, `failed`.
- Stages `delivered`, `clicked`, `activated`, `paid` remain owned by existing downstream webhooks (`twilio-status`, tracking-link click handler, Stripe webhook). The worker never marks them.
- Worker returns `run_id` in JSON response.

### 11. Admin UI — additive, non-breaking

Edit existing `src/pages/admin/AdminAcquisitionPipeline.tsx` (+ its hook). Add one card `Campagne ciblée` beside current monitoring (nothing removed):
- Selects: **Ville** (distinct `contractor_leads.city`), **Catégorie** (from `TARGET_CATEGORIES` with FR labels), numeric **Limite** (max 50).
- Buttons: `Aperçu` (dry_run true) → shows preview counts + confirmation modal. `Lancer` (dry_run false) — enabled only if preview shows ≥1 potentially eligible or `verification_reused`.
- Displays `run_id`, real counts, exclusion & failure reasons.
- 12-stage strip fed from `acquisition_pipeline_events WHERE metadata->>'run_id' = $run_id`, each stage rendered as one of: `completed`, `processing`, `waiting_downstream` (for delivered/clicked/activated/paid), `failed`, `excluded`, `zero_eligible`. Never fake a success on a stage that has not emitted an event.
- Refresh button + auto-poll every 15 s while `processing` or `waiting_downstream`.

### 12. Production verification (real data, no mock)

After deploy:
1. Call worker `dry_run=true` autonomous → report counts, confirm older records now surface.
2. Call worker `dry_run=true` `campaign={city:Laval,category:plumber,limit:25}` → return exact real counts.
3. Confirm existing `verification_status='verified'` Laval plombiers show up as `verification_reused` and trigger 0 Twilio Lookup calls.
4. If at least one destination legally proceeds, run `dry_run=false` for targeted mode; otherwise stop and report exact reason per prospect.
5. Verify `/admin/acquisition-pipeline` renders the run correctly.
6. Report: matched, promoted, verification_reused, twilio_lookups_executed, tier_A_mobile, other_eligible, historically_excluded, quarantined, sms_attempted, twilio_accepted, immediate_failures, pending_delivery.

## Files to change

- `supabase/functions/acquisition-queue-worker/index.ts` — fair selection, shared promotion loop, verification-reuse gate, run_id, correct eligibility mapping, scoped send call, dry-run contract, campaign filter.
- `supabase/functions/send-verified-batch/index.ts` — accept `prospect_ids`, return per-ID result.
- `src/pages/admin/AdminAcquisitionPipeline.tsx` (+ existing hook) — add campaign card + 12-stage strip; keep current monitoring intact.

No new tables. No migration. No schema change. No new endpoints. Existing gate, webhooks and downstream workflows untouched.

## Out of scope (explicit)

Stripe, landing generator, SEO, sitemap, `contractor_leads` schema, scraping sources, CASL evidence capture, `commercial-send-gate` internals, downstream webhooks.

## Success criteria (all required)

- Autonomous processing advances older Laval/plombier records without operator input.
- Targeted launcher works and reuses the same code path.
- Existing valid verifications are reused; zero Twilio Lookup credit spent on those.
- No SQL intervention required.
- Rerunning the worker produces zero duplicates.
- At least one real eligible Laval plumber receives a live SMS attempt, OR every matched prospect has a precise auditable exclusion reason with `run_id`.
- Delivered / clicked / activated / paid are populated only by existing downstream webhooks.
- `/admin/acquisition-pipeline` accurately displays the run.
