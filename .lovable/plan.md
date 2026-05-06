# UNPRO Form Reliability System

Centralized orchestrator so every form (Partenaire, Condo, Contact, Onboarding, Callback Alex, Devis, Newsletter, etc.) is **saved → emailed → confirmed → retried → monitored**, with zero lost leads.

---

## 1. Database (migration)

### `form_submissions`
`id, form_type, status (received|processing|sent|failed|retrying), first_name, last_name, email, phone, company, payload jsonb, source_page, utm_source, utm_medium, utm_campaign, ip_address, user_agent, reference_code (short human-readable), email_user_sent bool, email_admin_sent bool, retry_count int, last_error text, created_at, updated_at`

### `form_email_logs`
`id, submission_id FK, email_type (user_confirmation|admin_notification), recipient, provider (lovable_email|resend), status (sent|failed|bounced), response jsonb, attempt int, created_at`

### `form_events`
`id, submission_id FK, event_type (submitted|saved|email_queued|email_sent|email_failed|retry|admin_alerted|viewed_admin), metadata jsonb, created_at`

### RLS
- `form_submissions` / `form_email_logs` / `form_events`: **INSERT public** (anonymous forms), **SELECT/UPDATE admin only** via `has_role(auth.uid(),'admin')`.
- Edge functions write via service role.

### Trigger
- `before insert` on `form_submissions` → generate `reference_code` (e.g. `UNP-PART-7K2X9`).
- `after insert` → `pg_net` call to `process-form-submission` edge function (async, non-blocking).

---

## 2. Frontend orchestrator — `src/lib/forms/`

```
src/lib/forms/
  types.ts              // FormType union, FormPayload, SubmitResult
  submitForm.ts         // single entrypoint used everywhere
  useFormSubmit.ts      // React hook (loading, error, success, retry, ref code)
  validation.ts         // shared zod schemas per form_type
  utm.ts                // capture + persist UTM/source
```

### `submitForm(formType, data)` flow
1. Zod validate → throw `ValidationError` (no network).
2. Insert into `form_submissions` with status `received` + UTM + `source_page` + `user_agent` (IP filled by edge).
3. Returns `{ id, reference_code }` immediately → UI can confirm even if email is still in-flight.
4. Fire-and-forget call to edge `process-form-submission` (DB trigger is the safety net if this fails).

### `useFormSubmit`
- `submit(data)` — debounced, disables button, prevents double submit, sets `isSubmitting`.
- `state: idle | submitting | success | error`.
- Returns `referenceCode`, `retry()`, `error`.

---

## 3. Edge functions — `supabase/functions/`

### `process-form-submission`
- Triggered by DB trigger AND direct invoke (idempotent on `submission_id`).
- Loads submission, picks template by `form_type`.
- Sends **user confirmation** + **admin notification** via Lovable Emails (uses existing `send-transactional-email` infra, with Resend fallback if user already has it).
- Writes `form_email_logs` rows per attempt.
- On failure → updates `status=failed`, `last_error`, increments `retry_count`, schedules retry.

### `retry-failed-forms` (cron, every 5 min)
- Picks `status='failed' AND retry_count < 5`.
- Exponential backoff (5m, 15m, 1h, 6h, 24h).
- After 5 attempts → `status='dead'` + admin alert email.

### Email templates (transactional, react-email)
- `form-user-confirmation` — generic, branded, shows reference code, form type, "we'll contact you shortly".
- `form-admin-notification` — full payload table, link to `/admin/forms-monitoring/:id`.
- `form-system-alert` — sent to admin when retries exhaust or queue stalls.

---

## 4. Form migration

Migrate every existing form to `useFormSubmit`:

| Form | Current location | New `form_type` |
|---|---|---|
| Partenaires Certifiés | `PagePartenairesCertifies.tsx` | `partner_application` |
| Condo accès prioritaire | existing condo page | `condo_priority_access` |
| Contact | contact page | `contact` |
| Entrepreneur onboarding | onboarding flow | `contractor_onboarding` |
| Alex callback | Alex chat | `alex_callback` |
| Upload devis | quote upload | `quote_upload` |
| Analyse projet | project analysis | `project_analysis` |
| Devenir entrepreneur | recruitment | `contractor_signup` |
| Newsletter | footer/landing | `newsletter` |

Existing `partner_applications` table stays (data preserved); a small adapter writes to **both** during transition, then we cut over reads in admin to `form_submissions` filtered by `form_type='partner_application'`.

---

## 5. Confirmation UI — `src/components/forms/FormSuccess.tsx`

- Animated checkmark (framer-motion), glassmorphism card.
- "Demande envoyée • Référence **UNP-PART-7K2X9**".
- Status pill: "Email envoyé" / "Email en cours" (polls submission status once after 3s).
- Retry button if email failed after 30s.
- Reusable across every form.

Anti-bug guards built-in: button disabled during submit, debounce 800ms, idempotency key = `crypto.randomUUID()` stored in form state, page-leave warning while submitting.

---

## 6. Admin monitoring — `/admin/forms-monitoring`

Route guarded by admin role. Pages:

- **Overview** — KPIs: submissions today, failed emails, retry queue size, avg response time, conversion by form_type, top UTM sources.
- **Submissions table** — filters (form_type, status, date, UTM), search by email/reference, mobile-friendly card view < md.
- **Submission detail drawer** — full payload, timeline of `form_events`, `form_email_logs`, **Resend email** button, **Mark resolved**, **Export JSON**.
- **CSV export** — current filtered set.
- **Alerts panel** — failed > threshold, queue stalled, dead submissions.

---

## 7. Email provider

- **Default:** Lovable Emails (already configured on the project) via the existing `send-transactional-email` pattern.
- **Fallback:** If Lovable Email returns failure, the retry job tries again on next cycle. (Resend can be added later as a true secondary provider — proposed but not built in v1 unless you confirm; needs Resend connector + domain.)
- Anti-duplicate: idempotency key = `submission_id:email_type` checked against `form_email_logs`.

> **Decision needed:** v1 = Lovable Emails only with retry, OR add Resend now as secondary. Default plan = Lovable only (simpler, no extra setup). Tell me if you want Resend added.

---

## 8. Files created / edited

**New**
- `supabase/migrations/<ts>_form_system.sql`
- `src/lib/forms/{types,submitForm,useFormSubmit,validation,utm}.ts`
- `src/components/forms/FormSuccess.tsx`
- `src/components/forms/FormErrorRetry.tsx`
- `supabase/functions/process-form-submission/index.ts`
- `supabase/functions/retry-failed-forms/index.ts`
- `supabase/functions/_shared/transactional-email-templates/form-user-confirmation.tsx`
- `supabase/functions/_shared/transactional-email-templates/form-admin-notification.tsx`
- `supabase/functions/_shared/transactional-email-templates/form-system-alert.tsx`
- `src/pages/admin/FormsMonitoringPage.tsx` + subcomponents
- Route entries in `src/app/router.tsx`

**Edited (form migrations)**
- `src/pages/PagePartenairesCertifies.tsx`
- existing Contact / Condo / Onboarding / Callback / Quote upload / Newsletter components (one-by-one to use `useFormSubmit`)

---

## 9. Success criteria

- Every submission appears in `form_submissions` within 200ms of click, even if email fails.
- User sees confirmation + reference code within 1s.
- Failed emails auto-retry up to 5x with backoff.
- Admin sees live dashboard with filter, resend, export.
- Zero double-submits, zero lost leads, zero silent failures.

---

## Open questions before build

1. **Resend as secondary provider now, or Lovable Emails only for v1?** (default: Lovable only)
2. **Admin notification recipient email** — same as before (`partenaires@unpro.ca` / your admin email)? Confirm address.
3. Migrate `partner_applications` table data into `form_submissions` now, or keep dual-write for 1 release?
