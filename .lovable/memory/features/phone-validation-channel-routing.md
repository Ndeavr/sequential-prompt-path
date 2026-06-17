---
name: Phone Validation & Manual Contact Verification
description: Twilio Lookup-driven phone line-type routing with automatic SMS→Email fallback, hard landline SMS block, and auto-enqueue from every acquisition pipeline into /admin/contact-verification
type: feature
---
# Phone Validation + Contact Verification

## Auto-enqueue (no admin action required)
Every enrichment edge function calls `_shared/autoVerifyContact.ts::enqueueContactVerification()`:
- `enrich-business-profile`, `edge-enrich-prospect`, `mission-enrich-batch`, `launch-agent-enrich`, `launch-agent-enrich-contact`, `fn-convert-prospect-to-lead`, `import-business-intelligence`.
- DB safety net: trigger `trg_auto_enqueue_contact_verification` on `contractor_enriched_profiles` (covers `autonomous-acquisition-engine` and any direct writers) → calls `contact-verification-enqueue` via `pg_net`.
- Idempotent via unique index `uniq_cvq_source` on `(source_table, source_lead_id)`.



## Channel routing (Module 1)
- `twilio-lookup-phone` edge function caches line type in `phone_carrier_cache` (90d TTL) and writes back to `contacts.phone_type` + `phone_verified`.
- `contact-router` edge function applies `outbound_contact_rules` seeded with:
  - `mobile_sms_first` → SMS, fallback Email
  - `landline_email_first` → Email only (NEVER attempts SMS on landlines)
  - `voip_sms_then_email` → SMS, fallback Email after 5 min
  - `unknown_phone_email` → Email
- Auto-fallback to email triggered when primary SMS fails; logged in `communication_logs` with `fallback_triggered=true` and `parent_log_id`.
- Frontend entry point: `src/lib/communications/router.ts` → `sendViaRouter()`. All outbound flows must use this — never call Twilio/email functions directly.
- Schema extensions: `communication_logs.fallback_chain jsonb`, `communication_logs.channel_decision_reason text`, `phone_carrier_cache.validated_at`.

## Manual verification queue (Module 2)
- Route: `/admin/contact-verification` (admin only). Page: `src/pages/admin/AdminContactVerification.tsx`.
- Tables: `contact_verification_queue`, `contact_verification_notes` (admin RLS).
- Enqueue: `supabase/functions/contact-verification-enqueue/index.ts` — call after lead enrichment with `{business_name, contact_person_name, email, phone, website, rbq_*, neq_*, google_*, category, city, source_lead_id, source_table}`. Computes:
  - **Match confidence** (high/medium/low/conflict) via Jaro-Winkler on business names vs RBQ/NEQ + email-domain↔website match.
  - **Phone type** via Twilio Lookup.
  - **Best contact method**: landline→email when email present; mobile→sms (or email for manual outreach); fallback contact_form.
  - **Priority score**: +30 valid RBQ, +20 NEQ, +20 email, +15 landline-with-email, +10 strong reviews, +15 priority trade (roofing/insulation/plumbing/electrical/HVAC/mold/foundation/windows/landscaping/reno), +10 priority region (Mtl/Laval/Rive-Nord/Rive-Sud/Lanaudière/Laurentides), -50 if duplicate.
  - Dedupe by `source_lead_id`, then phone, then email.
- Admin UI: 9 metric cards, 13 filter pills, table + side sheet with Identity / Verification reasons / Action grid / Notes thread. Landline phone_type swaps "Call manually" → "Call Landline" and hides SMS.
- Status automation: Send Email → sets `verification_status=contacted`, `last_contacted_at=now()`, `next_followup_at=now()+3d`.

## Critical rules
- Never auto-delete uncertain contacts — route to `needs_manual_review`.
- VOIP can attempt SMS but cascades to email on failure.
- Email sends from the admin sheet go through `sendViaRouter` with `channelOverride: "email"` and template_key `manual_verification_outreach`.
