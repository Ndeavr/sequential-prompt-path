
## Goal

The acquisition pipeline currently quarantines every Canadian prospect because Twilio Line Type Intelligence (LTI) returns `unknown` (error 60601). Remove that hard block. Attempt SMS on any structurally valid Canadian mobile-format number, and if SMS is undeliverable or the prospect has no valid phone, automatically send the onboarding email via Resend. Only quarantine when both channels fail or contact info is invalid.

## Current behavior (verified)

- `twilio-lookup-phone` returns `phone_type: "unknown"` for CA numbers → `mapEligibility` returns `sms_eligibility_tier: null`, `verification_status: "needs_enrichment"`.
- `acquisition-queue-worker` quarantines any prospect whose lookup returns `unknown` (line 982) and any that isn't tier A/B/C.
- `send-verified-batch` filters strictly on `sms_eligibility_tier IN ('A','B','C')` and `verification_status='verified'`, so tier-null / needs_enrichment rows never get an attempt.
- `email-fallback-dispatch` and `contact-router` already exist but are not wired into the acquisition worker path.

## Changes

### 1. `twilio-lookup-phone` — degrade gracefully on LTI failure
- When Twilio returns `lti_error_code = 60601` (or any LTI unavailable / null type) but the number passes basic validation (E.164, valid CA area code, `valid: true`):
  - Return `phone_type: "unknown_valid"` and `phone_verified: true`.
  - Include `lti_available: false` in the response.
- Keep `phone_type: "unknown"` only when the number itself is invalid.

### 2. `acquisition-queue-worker` — new tier + no quarantine on unknown
- Extend `mapEligibility`:
  - `mobile` → tier A (unchanged)
  - `voip` → tier C (unchanged)
  - `landline` → tier D, `sms_eligible=false`, `verification_status=verified` (email-only path)
  - `unknown_valid` → **new tier `B2`**, `sms_eligible=true` (SMS-attempt with automatic email fallback), `verification_status=verified`
  - `unknown` (invalid number) → quarantine only when no email present; otherwise tier `E` (email-only), `sms_eligible=false`, `verification_status=verified`
- Remove the "quarantine on unknown line type" branch (line ~982). Replace with the tier assignment above.
- `verifiedProspectMeetsSmsBar` (line 540) accepts `mobile`, `voip`, `unknown_valid`.
- Update counts strip: add `tier_B2_unknown_valid` and `tier_E_email_only`.

### 3. `send-verified-batch` — SMS-first with fallback
- Broaden eligibility filter to `sms_eligibility_tier IN ('A','B','C','B2')` OR `(tier IN ('D','E') AND email IS NOT NULL)`.
- For tiers A/B/C/B2: send SMS via existing Twilio path.
  - On Twilio error codes that indicate undeliverable-to-this-line (21610 opt-out, 21614 invalid mobile, 30003/30004/30005 unreachable/blocked, 21408 permission), immediately call the email fallback path (see §4) instead of marking failed.
- For tiers D/E: skip SMS entirely, go straight to email fallback.
- Only quarantine when: SMS attempt failed with a fallback-eligible error AND email fallback also failed (or no email present AND SMS failed for any reason).
- Record per-attempt in `acquisition_pipeline_events`: `channel_attempted`, `channel_used` (`sms` | `email` | `both_failed`), Twilio SID/error, Resend message id, final `outcome`.

### 4. Email fallback path (reuse existing infra)
- Route through `contact-router` with `channel_override: "email"` and a new `template_key: "acquisition_onboarding_v1"` (create the template registration in the router if missing; do not build a new sender).
- Update `verified_contractor_prospects.outreach_status` state machine: `sent_sms` | `sent_email_fallback` | `sent_email_only` | `both_failed`.
- Persist `channel_used`, `resend_message_id`, `twilio_sid`, `twilio_error_code`, `fallback_reason` on the prospect row.

### 5. Engagement tracking
- Existing `resend-events` and `engagement-webhook-resend` already capture open/click. Ensure they update `verified_contractor_prospects.last_open_at`, `last_click_at`, `landing_click_count` — extend only if columns are missing (verify in one migration; no schema rebuild).
- Existing `engagement-webhook-twilio` handles SMS delivery/click — unchanged.

### 6. Admin visibility
- `PageAdminAcquisitionPipeline` results strip: add columns for `channel_used`, `email_sent`, `email_opened`, `email_clicked` next to the existing SMS metrics. No new page.

## Non-goals (explicit)

- Do not remove Twilio Lookup — still called for the informational tier hint and to catch structurally invalid numbers.
- Do not modify Stripe, activation, /r/:token resolver, SEO, sitemap, AI corpus, affiliate form, or role switcher.
- Do not create new tables. All state fits existing columns on `verified_contractor_prospects` and `acquisition_pipeline_events`.
- Do not send new outreach as part of this plan — code change only.

## Verification (post-implement, before any live send)

1. Dry-run replay: `acquisition-queue-worker` with `{campaign:{city:"Laval",category:"plombier",limit:10},dry_run:true}` → expect 10 promoted, 0 quarantined, tier distribution shown (mix of A/B2/D/E).
2. Read-only assertion: `send-verified-batch` `preview=true` for the same run_id → each row shows `channel_planned` = `sms` (A/B/C/B2) or `email` (D/E).
3. Live canary of exactly 1 prospect (`limit:1`, `dry_run:false`):
   - Tier A/B2 → SMS attempt; if Twilio error is fallback-eligible → email sent; row shows `channel_used`, both provider ids.
   - Tier D/E → email only; Resend message id recorded.
4. Regression guard: if ANY existing tier-A mobile path returns a different outcome than before the change, stop and revert.

## Files touched

- `supabase/functions/twilio-lookup-phone/index.ts`
- `supabase/functions/acquisition-queue-worker/index.ts`
- `supabase/functions/send-verified-batch/index.ts`
- `supabase/functions/contact-router/index.ts` (register `acquisition_onboarding_v1` template only if not present)
- `src/pages/admin/PageAdminAcquisitionPipeline.tsx` (results strip columns only)
- One migration only if `channel_used` / `resend_message_id` / `fallback_reason` columns are missing on `verified_contractor_prospects`.
