# Fix — Smoke test email not delivered

## Diagnostic (root cause)

The router fell back to email and the email send failed with `non-2xx`. Logs + code review confirm:

1. The admin "Tester le routage" panel calls the router with `template_key: "router-smoke-test"`.
2. The router's email path invokes `send-transactional-email` with that key.
3. `supabase/functions/_shared/transactional-email-templates/registry.ts` does **not** contain a `router-smoke-test` entry, so `send-transactional-email` returns `404 Template not found` → the router logs `failed / lovable_email / Edge Function returned a non-2xx status code`.
4. Secondary issue: the SMS branch only fires when Twilio Lookup returns `phone_type === "mobile"` **and** `phone_verified === true`. When the test number's lookup is missing/cached as non-mobile, the router silently chooses email — which then hits issue #1.

So even with a real mobile number, the test currently never produces a delivered email and may not produce an SMS either.

## Fix

### 1. Register a real `router-smoke-test` email template
Create `supabase/functions/_shared/transactional-email-templates/router-smoke-test.tsx` — minimal UNPRO-branded "Test de routage" email (FR), subject "UNPRO — Test de routage Smart Router". Add it to `registry.ts`.

### 2. Add raw-HTML email path in the router (resilience)
Update `supabase/functions/contact-router/index.ts` `sendEmail()`:
- If `email_html` is supplied in the request body, send a one-off email directly through `send-transactional-email`'s raw-mode (or, simpler, only fall back to the registered template when `email_html` is absent). This guarantees any ad-hoc smoke test / one-off send works without registry edits.

### 3. Surface lookup result in the admin test toast
After the test call, show `phone_type` + `phone_verified` returned by the router so the operator immediately sees *why* SMS vs email was chosen (avoids "I sent a mobile number but got email" confusion).

Tiny return-shape addition in router: include `phone_type`, `phone_verified`, `reason` in the JSON response. Display them in `runTest()`'s success toast inside `PageAdminCommunications.tsx`.

### 4. Verify end-to-end
- Redeploy `contact-router` + `send-transactional-email`.
- Run the smoke test from the admin UI with the same mobile number + the user's real email.
- Confirm in `communication_logs` that one row is `sent / lovable_email` (or `sent / twilio` if mobile-verified) and check inbox.
- If SMS path is selected, confirm Twilio message SID is logged.

## Files touched
- `supabase/functions/_shared/transactional-email-templates/router-smoke-test.tsx` (new)
- `supabase/functions/_shared/transactional-email-templates/registry.ts`
- `supabase/functions/contact-router/index.ts`
- `src/pages/admin/PageAdminCommunications.tsx`

## Out of scope
No DB migration, no rule changes, no Twilio config changes. Email infra (`notify.unpro.ca`) is already verified.

## Success
- Clicking "Tester le routage" with a valid email delivers the email to the inbox within ~1 min.
- With a verified mobile number + SMS consent, an SMS arrives via Twilio.
- The toast shows the detected `phone_type` and the chosen channel.
- `communication_logs` row is `sent`, no more `Edge Function returned a non-2xx status code`.
