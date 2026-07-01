## Fix Resend — Rotate key + isolated admin email delivery test

### Step 1 — Rotate `RESEND_API_KEY`
Open the secure secret form so you can paste the freshly-minted Resend key from the Resend dashboard (Settings → API Keys → Create → full-access, domain `mail.unpro.ca`). Nothing else in the app changes at this step.

### Step 2 — Harden `acq-test-send-email` (admin-only, CTA-enforced)
Patch `supabase/functions/acq-test-send-email/index.ts` to mirror the SMS admin override contract:

- Require `strict_admin_override: true` in the request body — otherwise return `403 admin_override_required`.
- Require the destination `to` to be present in `ADMIN_EMAIL_ALLOWLIST` (new secret, comma-separated). Reject otherwise with `403 not_in_admin_allowlist`.
- Generate `tracking_id` (already done) and **insert a row into `acquisition_tracking_links`** pointing to `https://unpro.ca/entrepreneur` so `/r/{id}` actually resolves (today the tracking_id is orphan).
- Build the CTA `https://unpro.ca/r/{tracking_id}` and inject it into both `html` and `text` bodies via the existing `ctaTracker` (block send if no CTA — same rule as prod).
- Use canonical sender `Alex d'UNPRO <alex@mail.unpro.ca>` via `_shared/emailSender.ts`.
- On Resend response:
  - `res.ok` → insert into `email_send_log` with `status='sent'`, `message_id = resend.id`, `template_name='admin_test'`, plus `logAcquisitionEvent('sent')`.
  - `!res.ok` → insert `email_send_log` `status='failed'` with `error_message = <resend body>` and log `acquisition_events.failed` with full status + body.
- Return `{ ok, resend_id, tracking_id, cta_url, to, subject, email_send_log_id, db_status }`.

### Step 3 — Deploy + execute
1. Deploy `acq-test-send-email`.
2. Set `ADMIN_EMAIL_ALLOWLIST` secret to the admin email you want to receive the test (I'll ask which).
3. Curl the function with `{ strict_admin_override: true, to: "<admin_email>" }`.
4. Query `email_send_log` and `acquisition_events` for the returned `tracking_id` / `resend_id` to confirm persistence.
5. HTTP-hit `https://unpro.ca/r/{tracking_id}` (via `acq-test-simulate-click`) to prove the CTA resolves 302 (already covered by prior tests, optional here).

### Return payload (reported back to you)
```
Email Delivered : PASS | FAIL
Resend message_id : <id or null>
To                : <admin email>
Subject           : UNPRO acquisition test — <iso>
CTA URL           : https://unpro.ca/r/<tracking_id>
DB event status   : email_send_log.status=<sent|failed>, acquisition_events.event_type=<sent|failed>
Exact error       : <resend json body if FAIL, else null>
```

### Guardrails
- No changes to production outreach paths (`acq-send-outreach`, `outreachDispatch.ts`, `send-transactional-email`).
- Admin override + allowlist are the only bypass, identical pattern to `smsGuard` allowlist.
- CTA rule enforced (block if none).
- Canonical sender enforced.

### Open questions before I execute
1. Which admin email should receive the test and be added to `ADMIN_EMAIL_ALLOWLIST` (e.g. the same you used for `ADMIN_TEST_EMAIL`)?
2. Confirm you want me to open the rotate-secret dialog for `RESEND_API_KEY` as Step 1 (you paste the new key from Resend dashboard).
