# Auto-Wire Contact Verification Across All Acquisition Pipelines

## Goal
Every newly discovered/enriched contractor flows through `contact-verification-enqueue` before any outreach. Landlines never receive SMS — routed to email or manual call automatically, with zero admin action.

## Strategy
Two enforcement layers so nothing slips through:

1. **Source-level hook** — fire `contact-verification-enqueue` at every enrichment exit point.
2. **DB-level safety net** — a trigger on `contractor_enriched_profiles` (and equivalent prospect tables) that auto-enqueues any new/updated row missing a verification record.
3. **Router hard gate** — `contact-router` refuses SMS for `phone_type='landline'` regardless of caller intent, and auto-substitutes email or marks as manual-call.

## Changes

### 1. New shared helper `supabase/functions/_shared/autoVerifyContact.ts`
- `enqueueVerification(payload)` — fire-and-forget POST to `contact-verification-enqueue` with retries, idempotency key = `source_table:source_lead_id`.
- All callers below import this helper instead of duplicating invoke logic.

### 2. Wire into existing enrichment edge functions (call helper after successful enrichment)
- `enrich-business-profile/index.ts`
- `autonomous-acquisition-engine/index.ts` (after each `run_pipeline` enrich step)
- `edge-enrich-prospect/index.ts`
- `mission-enrich-batch/index.ts`
- `launch-agent-enrich/index.ts` and `launch-agent-enrich-contact/index.ts`
- `sniper-enrich` (sniper outreach engine)
- `import-business-intelligence/index.ts` (contractor import runs)
- `fn-convert-prospect-to-lead/index.ts`

Each call passes the canonical payload (business_name, phone, email, website, rbq/neq, google_*, category, city, source_lead_id, source_table).

### 3. DB safety-net trigger (migration)
- New trigger `auto_enqueue_contact_verification` on INSERT/UPDATE of `contractor_enriched_profiles`, `outbound_prospects`, `launch_leads`, `sniper_leads`, `companies` (when `status` transitions to enriched/approved).
- Trigger uses `pg_net` to call the edge function with service role JWT.
- Skips if a `contact_verification_queue` row already exists for the same `source_table+source_lead_id`.
- Idempotent — safe to re-fire.

### 4. Harden `contact-router` against landline SMS
- Before any SMS send: if `phone_type IN ('landline','fixedVoip')` → never send SMS. Auto-cascade to:
  - Email if `email` present and valid.
  - Else mark `verification_status='needs_manual_call'` in `contact_verification_queue` and log `communication_logs.channel_decision_reason='landline_no_email_manual_call'`.
- Add explicit `landline_sms_blocked` metric to `communication_logs.fallback_chain`.
- Pre-flight: if no `phone_type` cached, synchronously call `twilio-lookup-phone` first.

### 5. Manual-call workflow
- Surface `needs_manual_call` rows at top of `/admin/contact-verification` (new pinned filter) with "Call Landline" CTA — already supported by the existing UI's channel guard; just add the auto-set status path and a notification badge counter.

### 6. Observability
- New cards in `AdminOutreachAnalytics.tsx`:
  - "Auto-verifications enqueued (24h)"
  - "Landline SMS attempts blocked (24h)"
  - "Awaiting manual call" (count of `needs_manual_call`)
- Backfill job (one-shot edge function `backfill-contact-verification`) that walks existing `contractor_enriched_profiles` without a queue row and enqueues them in batches of 100.

## Out of scope
- Changing the verification scoring algorithm.
- New UI screens beyond the existing `/admin/contact-verification` page.
- Twilio Lookup cache TTL changes (stays 90d).

## Files
- **New:** `supabase/functions/_shared/autoVerifyContact.ts`, `supabase/functions/backfill-contact-verification/index.ts`, migration with trigger.
- **Edited:** 8 enrichment edge functions listed above, `supabase/functions/contact-router/index.ts`, `src/pages/admin/AdminOutreachAnalytics.tsx`, `src/pages/admin/AdminContactVerification.tsx` (pinned manual-call filter), `.lovable/memory/features/phone-validation-channel-routing.md`.
