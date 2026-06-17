## Hard Validation Gate Before Outreach

Extend the existing phone pipeline with **company validation + confidence scoring + duplicate detection**, all enforced as a single hard gate before any SMS/email job is queued.

### 1. Schema (migration on `contractor_leads`)

New columns:
- `company_confidence_score int` (0-100)
- `phone_confidence_score int` (0-100)
- `overall_contact_confidence_score int` (0-100)
- `validation_status text` — enum-like: `pending_validation | valid | invalid_company | invalid_phone | duplicate | outside_quebec | needs_review`
- `company_failure_reason text` — canonical: `invalid_company_name | duplicate_company | empty_company | low_confidence | category_word_only | contains_phone | contains_city_only | reserved_keyword`
- `do_not_contact boolean default false`
- Partial unique index on `(lower(company_name), phone_e164)` where both are non-null (for duplicate detection)
- Index on `validation_status`

Reuse existing `phone_validation_status` / `phone_failure_reason` / `phone_area_code` from prior migration. Keep canonical failure codes — no `unknown`.

### 2. Shared validator `_shared/companyValidation.ts`

`classifyCompany(name)` returns `{ valid, score, reason? }`:
- Reject: empty, length < 2
- Reject if name is only a category word (load list: `couvreur`, `plombier`, `electricien`, `entrepreneur général`, `peintre`, etc.)
- Reject if name matches a phone regex
- Reject if name is just a city (cross-check against `cities` table, normalized)
- Reject if name contains `unknown`, `n/a`, `entrepreneur` (alone), `test`
- Score: 100 base, −15 per missing context (no Inc./Ltée/proper noun), −20 ambiguity, etc.

### 3. Unified validator `_shared/leadValidation.ts`

`validateLead(lead)` orchestrates:
1. Phone classify + Twilio Lookup (reuse existing `phoneValidation.ts`) → `phone_confidence_score`
2. Company classify → `company_confidence_score`
3. Duplicate check on `(company_name, phone_e164)`
4. `overall = round(0.5 * phone + 0.5 * company)`
5. Decide `validation_status`:
   - phone invalid/landline/outside QC → `invalid_phone` / `outside_quebec` / `landline`
   - company invalid → `invalid_company`
   - duplicate hit → `duplicate`
   - overall ≥ 85 → `valid`
   - 70–84 → `needs_review`
   - < 70 → `invalid_company` (low_confidence)

Persist all fields atomically.

### 4. Hard gate in queue workers

Update `run-curiosity-sms-worker`, `acq-sms-send`, `sms-prospect-send`, `run-contractor-onboarding-worker`, and outbound email send paths. Before any send:

```
if (validation_status !== 'valid') block(validation_status)
if (phone_confidence_score < 85) block('low_confidence')
if (company_confidence_score < 85) block('low_confidence')
if (do_not_contact) block('do_not_contact')
```

Log canonical reasons to `curiosity_funnel_events` / `sms_blocked` events — never `unknown`.

### 5. Background validator

Extend `validate-lead-phones` → rename internal logic to `validate-leads` (keep function name for cron compat). Each run:
- Picks `pending_validation` leads (batch 100)
- Runs full `validateLead` (phone + company + dup)
- Promotes to `valid` or sets specific failure state
- Re-enrolls newly-`valid` leads into curiosity sequence if eligible

### 6. Admin dashboard

Extend `PhonePipelineCard` (rename to `LeadValidationCard`) on `/admin/sms-health`:
- Valid Québec mobiles
- Invalid phones (split: format, landline, outside QC, lookup_failed)
- Invalid company names (split by reason)
- Duplicates removed
- Needs review (70–84)
- Blocked before Twilio (last 24h, from events)

Add "Needs Review" queue table linking to lead detail for manual approval/reject.

### Files

**New**
- `supabase/migrations/<ts>_lead_validation_hard_gate.sql`
- `supabase/functions/_shared/companyValidation.ts`
- `supabase/functions/_shared/leadValidation.ts`
- `src/components/admin/LeadValidationCard.tsx`
- `src/components/admin/NeedsReviewQueue.tsx`

**Edited**
- `supabase/functions/validate-lead-phones/index.ts` (full lead validation, not just phone)
- `supabase/functions/run-curiosity-sms-worker/index.ts` (hard gate)
- `supabase/functions/acq-sms-send/index.ts`, `sms-prospect-send/index.ts`, `run-contractor-onboarding-worker/index.ts`, `process-outbound-queue/index.ts` (hard gate)
- `src/pages/admin/PageSmsHealth.tsx` (mount new cards, drop old PhonePipelineCard)
- `src/integrations/supabase/types.ts` (auto)

### Success criteria

- Zero SMS/email leaves the system without `validation_status='valid'` AND both confidence scores ≥ 85
- Every block has a canonical reason (no `unknown`)
- Admin can see exact counts per failure category and triage the `needs_review` bucket
