## Objective

Stop wasting Twilio sends. No SMS enters the queue until the phone is normalized, NANP-valid, QC-flagged, and Lookup-confirmed as `mobile` (or `voip` with caution). Replace "unknown" diagnostics in the SMS health dashboard with actionable reason codes.

## Current state (already in repo)

- `supabase/functions/_shared/normalizePhone.ts` — strips junk, NANP regex, returns `valid` + `reason`.
- `supabase/functions/_shared/smsGuard.ts` — `validateBeforeSend()` checks normalized + blocked patterns + `sms_opt_outs`.
- `supabase/functions/twilio-lookup-phone/index.ts` — Twilio Lookup v2 `line_type_intelligence`, 90-day cache on `contacts` (NOT on `contractor_leads`).
- `contractor_leads` has `phone`, `mobile_phone`, but no `e164_phone`, `phone_type`, `phone_validation_status`, `phone_lookup_at`, `phone_failure_reason`.
- `run-curiosity-sms-worker` and other senders read `phone` directly; lookup is not enforced before send.

## What to build

### 1. Migration — phone validation columns + statuses

Add to `contractor_leads`:
- `phone_e164 text` (canonical +1XXXXXXXXXX)
- `phone_type text` — `mobile | landline | voip | unknown`
- `phone_validation_status text` default `pending_validation` — enum-like: `pending_validation | valid_mobile | valid_voip | landline | invalid_phone | outside_quebec | do_not_contact | lookup_failed`
- `phone_failure_reason text` — granular: `invalid_format | bad_length | invalid_nanp | blocked_pattern | landline | carrier_rejected | opt_out | outside_quebec | missing_country_code | lookup_failed`
- `phone_lookup_at timestamptz`
- `phone_carrier text`
- `phone_area_code text`

Index: `(phone_validation_status)`, `(phone_e164)`.

Backfill: run `normalizePhone` over existing rows (best-effort: mark `invalid_phone` for bad ones, `pending_validation` for valid ones so the worker re-validates with Lookup).

### 2. Shared module — `_shared/phoneValidation.ts`

Single source of truth. Exports:

```ts
QC_AREA_CODES = ['418','438','450','468','514','579','581','819','873','354','367','263']
classifyPhone(raw): { e164, area_code, status, reason }
   // Step 1: normalizePhone (clean + NANP)
   // Step 2: if not NANP → invalid_phone / missing_country_code
   // Step 3: if area not in QC_AREA_CODES → outside_quebec (still stored, just flagged)
   // Step 4: returns pending_validation if format passes, ready for Lookup
runLookupAndPersist(supabase, lead_id, e164): updates phone_type + phone_validation_status
   // mobile → valid_mobile
   // voip → valid_voip
   // landline → landline (block SMS)
   // invalid/null → lookup_failed
```

Reuses existing `normalizePhone.ts` and the Twilio call from `twilio-lookup-phone/index.ts` (refactor into shared helper).

### 3. Hard gate in SMS queue

Update `validateBeforeSend()` in `_shared/smsGuard.ts` to also require:
- lead has `phone_validation_status IN ('valid_mobile','valid_voip')`
- if `pending_validation` → trigger Lookup inline (or return `needs_lookup` so worker handles it, never sends)
- if any other status → return blocked with the existing `phone_failure_reason`

Update `run-curiosity-sms-worker` (and `run-contractor-onboarding-worker`, `process-outbound-queue`, `acq-sms-send`, `sms-prospect-send`) to:
1. Skip leads where `phone_validation_status NOT IN ('valid_mobile','valid_voip')`.
2. For `pending_validation`, call Lookup first, then re-evaluate.

### 4. Enrollment-time validation

Update `enroll_curiosity_sequence` trigger (and contractor onboarding trigger) so a lead is only enrolled when `phone_validation_status` is terminal-valid. Otherwise enqueue a `phone-validation-queue` job.

New edge function `validate-lead-phones` (cron `*/5 * * * *`):
- Picks leads with `phone_validation_status = 'pending_validation'` (cap 100/run).
- Runs `classifyPhone` + Twilio Lookup, persists results.
- Re-fires curiosity enrollment for newly-`valid_mobile` leads.

### 5. Dashboard — actionable diagnostics

Update `src/components/admin/CuriosityFunnelCard.tsx` and `src/pages/admin/PageSmsHealth.tsx`:
- New "Phone Pipeline" tile showing counts per `phone_validation_status` (pending, valid_mobile, valid_voip, landline, invalid_phone, outside_quebec, lookup_failed, do_not_contact).
- Replace the "unknown 103" bucket with the granular `phone_failure_reason` breakdown sourced from leads + `curiosity_funnel_events` failure rows.
- Show success rate = `delivered / valid_mobile_targeted` (not `delivered / attempted`).

### 6. KPI redefinition

Surface the real funnel KPI in the admin card:
- Leads imported
- → Valid QC mobile discovered
- → SMS delivered
- → Page viewed
- → Score revealed
- → Activated contractor (paid)

## Technical details

**Files to create**
- `supabase/migrations/<ts>_phone_validation_pipeline.sql`
- `supabase/functions/_shared/phoneValidation.ts`
- `supabase/functions/validate-lead-phones/index.ts` + cron entry in `supabase/config.toml`
- `src/components/admin/PhonePipelineCard.tsx`

**Files to edit**
- `supabase/functions/_shared/smsGuard.ts` — add status check + return granular failure reason
- `supabase/functions/twilio-lookup-phone/index.ts` — extract Twilio call into shared helper, also persist to `contractor_leads` when `lead_id` passed
- `supabase/functions/run-curiosity-sms-worker/index.ts` — pre-check status, skip non-valid
- `supabase/functions/run-contractor-onboarding-worker/index.ts` — same gate
- `supabase/functions/process-outbound-queue/index.ts`, `acq-sms-send/index.ts`, `sms-prospect-send/index.ts` — same gate
- `src/components/admin/CuriosityFunnelCard.tsx`, `src/pages/admin/PageSmsHealth.tsx` — new breakdown
- `src/lib/normalizePhone.ts` mirror untouched (already correct)

**Status state machine**

```text
pending_validation
  ├─ classifyPhone fails       → invalid_phone (+ reason)
  ├─ outside QC area           → outside_quebec
  └─ format ok → Lookup
        ├─ mobile              → valid_mobile     [SMS allowed]
        ├─ voip                → valid_voip       [SMS allowed, flagged]
        ├─ landline            → landline         [SMS blocked]
        ├─ invalid/no result   → lookup_failed    [SMS blocked, retry 1x/24h up to 3x]
opt-out reply / STOP           → do_not_contact   [terminal]
```

**Cost guard**: Lookup is ~$0.008/number. Cap `validate-lead-phones` at 100/run = ~$2/run. Cache on lead row (no re-lookup unless `phone_e164` changes or 90d stale).

## Tasks

1. Migration: columns + indexes + backfill + status enum check.
2. `_shared/phoneValidation.ts` with QC area codes + `classifyPhone` + `runLookupAndPersist`.
3. Refactor `twilio-lookup-phone` to use shared helper and also write to `contractor_leads` when `lead_id` provided.
4. New `validate-lead-phones` edge function + cron `*/5`.
5. Tighten `smsGuard.validateBeforeSend()`.
6. Add gate in every SMS sender (curiosity, onboarding, outbound, acq, prospect).
7. Update curiosity/onboarding enrollment triggers to require valid status.
8. `PhonePipelineCard` + dashboard breakdown swap.
9. Verify: select counts per status, replay 10 prior failed sends, confirm none reach Twilio.

## Success

- 0 sends to landlines or `invalid_nanp` numbers in 24h.
- "unknown" bucket eliminated — every failure has a named reason.
- Delivery rate on `valid_mobile` cohort ≥ 90%.
- Admin sees: imported → valid_mobile → delivered → clicked → activated.
