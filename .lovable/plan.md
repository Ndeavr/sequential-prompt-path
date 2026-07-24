## Live replay — Plomberie Expert KF & Fils Inc (Laval × plombier)

Execute one real (non-dry) targeted campaign run through the existing `acquisition-queue-worker` and follow it into `send-verified-batch`. No new code, no schema changes — only invoke the already-deployed pipeline with `limit=1` scoped to this business.

### Steps

1. **Pre-flight read** (`supabase--read_query`):
   - Confirm the prospect row exists in `contractors_prospects` (business_name ILIKE 'Plomberie Expert KF%', city='Laval') and capture its `id`, `phone_e164`, current `category`.
   - Confirm it is NOT on any historical exclusion list.
   - Snapshot current row (if any) in `verified_contractor_prospects` for that `phone_e164`.

2. **Invoke worker** (`supabase--curl_edge_functions` → `acquisition-queue-worker`):
   - `POST` body: `{ mode: "targeted", city: "Laval", category: "plombier", business_name_ilike: "Plomberie Expert KF%", limit: 1, dry_run: false }`
   - Capture returned `run_id` and counts (matched / already_verified / lookup_required / promoted / quarantined / rejected).

3. **Read pipeline events for that `run_id`** (`supabase--read_query` on `acquisition_pipeline_events`):
   - Verify no `promotion_insert_failed` / `fallback_insert_failed`.
   - Capture Twilio Lookup result (`phone_line_type`, `sms_eligibility_tier`).

4. **Invoke sender** (`supabase--curl_edge_functions` → `send-verified-batch`):
   - Body: `{ run_id: "<from step 2>", dry_run: false, limit: 1 }` (scoped strictly to this run's prospect ids per the existing scoping rule).
   - Capture Twilio SID + status, or exact Twilio error code + message.

5. **Post-run verification** (`supabase--read_query`):
   - `verified_contractor_prospects` row for this phone: `verification_status`, `phone_line_type`, `sms_eligibility_tier`, `outreach_status`.
   - `acq_sms_logs` (or equivalent) row for this run: Twilio SID, status, error_code.
   - `acquisition_queue` state transition.

### Deliverable

A single reconciliation table:

```text
prospect_id | phone (masked) | verified | promoted | queued | sms_attempted | sms_sent | twilio_sid | twilio_error
```

Plus the `run_id` and, if `sms_sent=0`, the exact Postgres or Twilio error code + message and the single next action.

### Guardrails

- Only one prospect touched (`limit=1` + `business_name_ilike` filter).
- No UI, no schema, no function code changes in this run.
- If step 2 returns any `*_insert_failed`, stop before step 4 and report the exact PG error — do NOT send SMS on a broken promotion.
- If Twilio Lookup classifies the number as landline (Tier D), stop before step 4 and report `not_sms_eligible` — do NOT force-send.
