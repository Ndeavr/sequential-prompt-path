# Universal Lead Normalization Layer

Goal: One canonical `normalizeAcquisitionLead()` used by every ingress/egress path (scrape, enrich, validate, dispatch, Resend, Twilio, Stripe metadata, tracking links, admin UI). Then a one-shot repair pass on all existing `contractor_leads`. **No outbound messages sent.**

---

## 1. Shared normalization module

Create `supabase/functions/_shared/normalization.ts` (mirror in `src/lib/normalization.ts` for admin UI parity, both re-exporting the same pure logic).

Exports:
- `normalizeEmail(raw)` → trim, NFKC, strip zero-width/invisible chars, lowercase, RFC-ish regex validate. Returns `{ value, valid, error }`.
- `normalizePhone(raw, defaultCountry='CA')` → strip non-digits, handle leading `1`, E.164, reject test patterns (`555-01xx`, all-same-digit, `450-555-*`, `000…`). Returns `{ original, normalized, e164, status: 'valid'|'invalid'|'test'|'empty' }`.
- `normalizeWebsite(raw)` → trim, add `https://` if missing scheme, lowercase host, drop default ports, strip trailing slash (except root), keep path/query lowercased on host only, reject if `URL()` throws or host has no dot. Returns `{ value, host, valid }`.
- `sanitizeResendTag(name, value)` → NFKD strip accents, lowercase, non-`[a-z0-9_-]` → `_`, collapse `_`, trim length (name ≤ 40, value ≤ 100). Returns `null` if empty after sanitize (caller drops it, never blocks send).
- `sanitizeResendTags(tags)` → array/object → filtered array of valid `{name,value}`.
- `normalizeCompanyName(raw)` → `{ display, key }` where `key` is lowercased, accents stripped, punctuation removed, collapsed spaces → single space, common suffixes (`inc`, `ltée`, `ltee`, `enr`, `srl`) stripped for dedupe.
- `slugifyForUrl(str)` → ASCII, `[a-z0-9-]`, for tracking segments.
- `buildTrackingUrl({ lead_id, campaign_id })` → `https://unpro.ca/r/{tracking_id}` derived from ids only; never accepts raw company/city.
- `normalizeAcquisitionLead(rawLead)` → orchestrator returning:
  ```ts
  {
    email_normalized, website_normalized, company_name_normalized,
    phone_original, phone_normalized, phone_e164, phone_validation_status,
    normalization_status: 'ok'|'partial'|'rejected',
    normalization_errors: { email?, phone?, website?, company? },
    normalized_at: ISO,
  }
  ```

Unit-testable pure functions, no I/O.

Deprecate/redirect existing helpers: `_shared/resendTags.ts`, `_shared/phoneValidation.ts` (keep API, re-export from new module), `src/lib/phoneFormat.ts`, `src/lib/urlFormat.ts`.

---

## 2. Database migration

`supabase/migrations/<ts>_lead_normalization_fields.sql`:

```sql
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS email_normalized text,
  ADD COLUMN IF NOT EXISTS website_normalized text,
  ADD COLUMN IF NOT EXISTS company_name_normalized text,
  ADD COLUMN IF NOT EXISTS phone_original text,
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_validation_status text,
  ADD COLUMN IF NOT EXISTS normalization_status text,
  ADD COLUMN IF NOT EXISTS normalization_errors jsonb,
  ADD COLUMN IF NOT EXISTS normalized_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_email_norm    ON public.contractor_leads (email_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_phone_e164    ON public.contractor_leads (phone_e164);
CREATE INDEX IF NOT EXISTS idx_leads_company_key   ON public.contractor_leads (company_name_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_norm_status   ON public.contractor_leads (normalization_status);
```

Mirror the additive columns on `contractor_prospects` (email_normalized, phone_e164, company_name_normalized) if present — read-only add, no data change here.

---

## 3. Wire the normalizer into every path

Update to call `normalizeAcquisitionLead` (or the targeted helper) **before** writing / dispatching:

- **Scraper import** — `supabase/functions/acq-scrape-*` / CSV importer: normalize on insert; store all `*_normalized` columns.
- **`acq-enrich-contractor`** — normalize discovered email/phone/website before update; never overwrite a `valid` E.164 with a lower-confidence one.
- **`acq-reenrich-leads`** — same.
- **Phone validation (`_shared/smsGuard.ts`, `_shared/phoneValidation.ts`)** — use `phone_e164` as input; skip Lookup for `status='test'|'invalid'`.
- **Resend dispatch (`_shared/outreachDispatch.ts`, `outreach-resend-send`, `acq-followup-send`, `acq-test-send-email`, `acq-e2e-selftest`, health probes)** — recipient from `email_normalized`; tags via `sanitizeResendTags` (already partial, extend to strip accents and drop invalid without blocking).
- **Twilio dispatch (`acq-test-send-sms`, outreach worker, `twilio-*`)** — recipient from `phone_e164`; block if status ≠ `valid`.
- **Stripe metadata (`create-checkout-session`, `stripe-webhook`)** — pass `email_normalized`, `company_name_normalized`, `phone_e164` (metadata values ASCII-sanitized, ≤ 500 chars).
- **Click tracking (`r-redirect`, CTA builder `ctaTracker.ts`)** — URLs built only from `lead_id` + `campaign_id`; reject raw strings.
- **Admin audit UI** — `PageAdminDispatchBottleneck` + new panel to show normalization health.

---

## 4. Repair edge function (one-shot, no sends)

`supabase/functions/acq-normalize-repair/index.ts`:

- Input: `{ dry_run: boolean, limit?: number }` (default `dry_run=true`).
- Iterates all `contractor_leads` in batches (500), runs `normalizeAcquisitionLead` on raw fields, computes diff.
- Writes new columns + `normalization_status`, `normalization_errors`, `normalized_at`.
- Does **not** enqueue, send, or trigger outreach.
- Returns counters:
  ```
  { scanned, emails_normalized, phones_normalized, websites_normalized,
    companies_normalized, invalid_rejected, unchanged,
    sample_before_after: [ ...20 rows ] }
  ```

Admin trigger button on `/admin/dispatch-bottleneck` (and route entry on `/admin/normalization`).

---

## 5. Admin UI

New page `src/pages/admin/PageAdminNormalization.tsx` (route `/admin/normalization`):
- Counters (total, ok / partial / rejected).
- "Run dry-run" and "Apply repair" buttons.
- Table of 20 before/after samples returned by the function.
- Per-field breakdown of `normalization_errors`.

---

## 6. Validation & rollout

1. Deploy migration (columns + indexes).
2. Deploy `_shared/normalization.ts` + patched functions.
3. Run `acq-normalize-repair { dry_run: true }` → review sample.
4. Run `{ dry_run: false }` → repair all rows.
5. Report the required deliverables (files changed, rules added, counts, 20-row sample).

## Out of scope
- No outbound sends.
- No changes to funnel logic, RLS, or Stripe pricing.
- No schema changes beyond the additive columns above.

## Technical notes
- All ASCII sanitization uses `String.prototype.normalize('NFKD').replace(/\p{Diacritic}/gu, '')`.
- Invisible chars regex: `/[\u200B-\u200D\uFEFF\u00A0]/g`.
- Test-number blocklist: `/^\+1?(555\d{7}|(\d)\1{9})$/` plus `+1450555\d{4}`.
- Deduplication uses `(company_name_normalized, phone_e164)` and `(email_normalized)` — no destructive merge in this pass; just flag duplicates in `normalization_errors.duplicate_of`.
