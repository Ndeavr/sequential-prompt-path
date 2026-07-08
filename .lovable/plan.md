# Stop-Loss Plan: Fix PROVIDER_401 + Block Test Numbers

**Root problem:** 300/300 SMS attempts fail with `PROVIDER_401` (Twilio auth rejected) and the queue contains placeholder numbers like `+14505551234`. Every scheduled run burns Twilio/Resend/AI credits for zero chance of revenue.

**Rule for this plan:** No new acquisition features. No copy changes. No SEO. Only: stop the bleeding, prove one real SMS can leave the server, then re-open the tap.

---

## 1. Kill switch (immediate stop-loss)

- Add runtime flag `OUTREACH_ENABLED` (Supabase secret, default `false` until 401 fixed).
- Every outreach edge function checks it first and short-circuits with a logged `outreach_delivery_logs` row (`error_code=OUTREACH_DISABLED`, `retryable=false`, no provider call):
  - `solicitation-send-sms`
  - `solicitation-build-queue`
  - `outreach-retry-failed`
  - any cron sender in the acquisition pipeline
- Admin UI shows a red banner on `/admin/solicitation` + `/admin/outreach-errors` when the switch is off, with a one-click toggle (admin-only RPC).

## 2. Provider Health cockpit (`/admin/provider-health`)

New page + new edge function `provider-health-check` that performs **read-only** auth probes and returns PASS/FAIL + latency + raw error body:

| Check | Call |
|---|---|
| Twilio Auth | `GET /2010-04-01/Accounts/{sid}.json` |
| Twilio Messaging Service | `GET /v1/Services/{msid}` |
| Twilio From-number | `GET /IncomingPhoneNumbers.json` (count) |
| Resend Auth | `GET /domains` |
| Stripe Webhook | verify signing secret present + last event age |
| Lovable AI Gateway | `verify_credentials` |

Results cached 60s in `provider_health_checks` table. Kill switch cannot be flipped to `true` while any P0 check (Twilio Auth, Messaging Service) is FAIL.

## 3. Diagnose the 401 without guessing

Add a one-shot diagnostic edge function `twilio-auth-diagnose` that:
- Reads `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` from `Deno.env` (never logs values, only presence + first/last 4 chars of SID).
- Reports which secrets are missing / malformed / mismatched (SID must start `AC`, MSID must start `MG`).
- Calls the Twilio account endpoint and returns the exact response body.

Expected outcomes it will surface:
- Secret missing in Supabase Edge Functions env (present only in Lovable preview) → user re-adds via `add_secret`.
- Auth token rotated in Twilio console → user updates via `update_secret`.
- Using Account SID as Auth Token by mistake → flagged by shape check.
- Messaging Service belongs to a different account → surfaced by cross-check.

## 4. Placeholder / test-number guard

New shared module `_shared/phoneGuard.ts` with deterministic rules, applied in **three places**:
1. `solicitation-build-queue` — reject before insert.
2. `solicitation-send-sms` — reject before Twilio call (defense in depth).
3. `/admin/outreach-errors` — new "Invalid numbers" tab.

Rules (all normalized to E.164 first):
- Area code `555` anywhere in NANP number.
- Exchange `555` + line `01xx` (official fictional range).
- Repeating digits (`0000`, `1111`…`9999`) in the last 4.
- Sequential `1234`, `4321`.
- Non-NANP length for QC/CA rows.
- Duplicate of any number already in `contractor_outreach_queue` for last 30d.

Rejected rows are inserted into `outreach_delivery_logs` with `error_code=INVALID_TEST_NUMBER`, `retryable=false`, and the queue row is marked `status='blocked_invalid_number'`. They **never** hit Twilio.

Backfill migration: scan existing `contractor_outreach_queue` + `contractors.phone`, mark matches as `blocked_invalid_number`, and dump the count into the Health Banner so we know how many rows were fake.

## 5. Re-classify the 300 existing PROVIDER_401 rows

- Migration/one-shot script tags all current failed rows as `retryable=true` **only after** the health cockpit shows Twilio Auth = PASS.
- `outreach-retry-failed` already exists; it will replay these once auth is green.

## 6. Success gate before re-enabling

`OUTREACH_ENABLED` may only be flipped to `true` when:
1. `/admin/provider-health` shows Twilio Auth + Messaging Service = PASS.
2. `phoneGuard` backfill has run.
3. A manual "Send test to founder phone" button on `/admin/provider-health` produces a real Twilio `sent` + `delivered` webhook, logged with full raw response.

Only then does the acquisition pipeline resume.

---

## Files to create

- `supabase/functions/provider-health-check/index.ts`
- `supabase/functions/twilio-auth-diagnose/index.ts`
- `supabase/functions/_shared/phoneGuard.ts`
- `supabase/functions/_shared/killSwitch.ts`
- `src/pages/admin/PageAdminProviderHealth.tsx`
- Migration: `provider_health_checks` table + `blocked_invalid_number` status + `OUTREACH_ENABLED` seed row in a `system_flags` table (so we can flip without redeploy).

## Files to edit

- `supabase/functions/solicitation-send-sms/index.ts` — kill switch + phone guard.
- `supabase/functions/solicitation-build-queue/index.ts` — phone guard at insert.
- `supabase/functions/outreach-retry-failed/index.ts` — kill switch.
- `src/pages/admin/AdminSolicitationPage.tsx` — kill switch banner + toggle.
- `src/pages/admin/PageAdminOutreachErrors.tsx` — "Invalid numbers" filter, disable "Retry" while switch is off or Twilio is FAIL.
- `src/app/router.tsx` — register `/admin/provider-health`.

## Explicitly NOT in this plan

- No SMS copy changes, no A/B testing, no scaling knobs.
- No SEO, no landing pages, no onboarding UX.
- No new scraping sources.
- No changes to homeowner surfaces or Alex.

## Definition of done

1. `OUTREACH_ENABLED=false` is enforced across every sender.
2. `/admin/provider-health` exists and truthfully reports Twilio/Resend/Stripe status.
3. Root cause of the 401 is named (missing secret vs rotated token vs wrong SID) — not guessed.
4. `+14505551234` and every 555/1234/repeating-digit row is `blocked_invalid_number`, never sent.
5. One real SMS to a real phone shows `queued → sent → delivered` with the full Twilio JSON in `outreach_delivery_logs.raw_response`.

Only after step 5 do we consider the acquisition engine unblocked.
