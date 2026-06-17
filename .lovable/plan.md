## Smart SMS → Email Fallback System

The codebase already has the foundation: `phoneValidation.ts` (Twilio Lookup v2 → mobile/landline/voip/unknown), `smsGuard.ts` (pre-send blocker), `twilio-status-v2` (delivery webhook), and the canonical contact record `contractor_leads` (which already has `phone_type`, `phone_carrier`, `phone_validation_status`). There is **no** `contractor_contacts` table — the new counters/flags will land on `contractor_leads` (and mirror to `contractor_prospects` where the agents read). All edits are server-side; no UI redesign except the admin Contact Health panel.

### 1. Schema additions (one migration)
Add to `contractor_leads` (and same columns to `contractor_prospects` for parity):
- `contact_method text default 'unknown'` — `mobile_sms | email | manual | skip`
- `sms_attempts int default 0`
- `sms_failed_attempts int default 0`
- `sms_disabled boolean default false`
- `sms_status text` — last Twilio status (`delivered | failed | undelivered | …`)
- `email_status text` — last email status (`sent | bounced | opened | replied`)
- `email_fallback_enabled boolean default true`
- `last_sms_error_code text`
- `last_sms_attempt_at timestamptz`
- `sms_suppressed_at timestamptz`, `sms_suppressed_reason text`

Index: `(contact_method)`, `(sms_disabled)` for agent queries.

### 2. Pre-send guard upgrade (`_shared/smsGuard.ts`)
`validateBeforeSend()` now also rejects when, for the matching lead row:
- `sms_disabled = true` → `reason: "sms_disabled"`
- `phone_type !== "mobile"` → `reason: "not_mobile"` (VoIP/landline/unknown all blocked from SMS)
- `sms_failed_attempts >= 2` → auto-flip `sms_disabled=true`, `contact_method='email'`, then reject

Every caller (`acq-sms-send`, `sms-prospect-send`, `agent-send-outreach`, `sniper-queue-send`) already routes through this guard — no per-caller changes needed beyond passing `lead_id`.

### 3. Validation pipeline ordering
`validateAndPersistLeadPhone()` already classifies + Twilio-looks-up. Extend it to also set:
- `contact_method = 'mobile_sms'` when `phone_type='mobile'`
- `contact_method = 'email'` when landline/voip/unknown AND `email` present
- `contact_method = 'manual'` when no email AND not mobile
- `contact_method = 'skip'` when invalid/outside_quebec/opt-out

### 4. Failure protection in `twilio-status-v2`
On `failed` / `undelivered` callback:
- `sms_failed_attempts += 1`, `last_sms_error_code`, `last_sms_attempt_at = now()`
- If `sms_failed_attempts >= 2` → `sms_disabled=true`, `contact_method='email'`, enqueue email fallback (see §5)
- If `sms_failed_attempts >= 5` → also write `sms_suppressed_reason='permanent_suppression'`, `sms_suppressed_at=now()`, push admin note

On `delivered`: increment `sms_attempts`, set `sms_status='delivered'`.

### 5. Email fallback automation
New edge function `email-fallback-dispatch` (or extend existing `acq-send-outreach` email branch):
- Triggered (a) by validation pipeline when `phone_type !== 'mobile'` AND `email_fallback_enabled`, (b) by `twilio-status-v2` after 2nd SMS failure.
- Sends transactional template `contractor-fallback-analysis` (FR-CA, subject **"Votre entreprise est-elle prête pour les recommandations IA?"**) with `{{company_name}}`, `{{city}}`, `{{private_score_url}}`.
- Idempotency key: `fallback-${lead_id}`.
- Updates `email_status='sent'`, `contact_method='email'`.

Template lives in `supabase/functions/_shared/transactional-email-templates/contractor-fallback-analysis.tsx` and is registered.

### 6. Outreach priority engine
Centralize selection in `_shared/contactMethodSelector.ts`:
1. `phone_type='mobile'` AND `!sms_disabled` AND `email` → SMS + scheduled email
2. `email` present (any other case) → Email only
3. No email, has phone but not mobile → Manual review
4. Else → Skip

`acquisition-autopilot`, `sniper-queue-send`, `agent-send-outreach` call this selector instead of assuming SMS.

### 7. Scraping/discovery enrichment
Update enrichment edge functions (`outbound-*-enrich`, `agent-*`) to extract and persist into existing prospect fields: business email, mobile, office, contact-form URL, FB, IG, GMB. Compute `contact_method` immediately after enrichment so downstream agents never queue SMS to a landline.

### 8. Admin "Contact Health" panel
Add a section to `/admin/outbound/operations-hub` (or `/admin/dispatch-center`) showing:
- Counts: SMS sent, delivered, failed, email sent, opened, replied (last 7d & total)
- Phone-type breakdown with badges: 📱 Mobile / ☎️ Landline / 🌐 VoIP / ❓ Unknown
- Top SMS error codes
- Recent permanently-suppressed numbers

Data via `supabase--read_query` aggregations on `contractor_leads` + `communication_logs`.

### 9. Backfill
One-time SQL: for every existing `contractor_leads` row, derive `contact_method` from existing `phone_type` / `email`. Reset counters to 0.

## Out of scope
- New `contractor_contacts` table (using existing `contractor_leads` instead — call out in PR if you want a rename).
- Per-user SMS preferences UI.
- Replacing Twilio (still primary for verified mobiles).

## Success criteria
- 0 SMS attempts to `phone_type != 'mobile'`.
- After 2 Twilio failures → SMS permanently off for that lead, email fallback fires automatically.
- Admin sees mobile vs landline split + delivery KPIs in Contact Health.
- Existing 4 SMS edge functions need no per-function logic change beyond the centralized guard + selector.

## Files touched (preview)
- `supabase/migrations/<new>_smart_sms_fallback.sql`
- `supabase/functions/_shared/smsGuard.ts`
- `supabase/functions/_shared/phoneValidation.ts`
- `supabase/functions/_shared/contactMethodSelector.ts` *(new)*
- `supabase/functions/twilio-status-v2/index.ts`
- `supabase/functions/email-fallback-dispatch/index.ts` *(new)*
- `supabase/functions/_shared/transactional-email-templates/contractor-fallback-analysis.tsx` *(new)* + registry
- `supabase/functions/acquisition-autopilot/index.ts` (use selector)
- `src/pages/admin/...` Contact Health panel
