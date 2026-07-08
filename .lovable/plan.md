
## Root cause (confirmed by reading the code)

The user's instinct is right. The screenshots show provider **probes** failing, not the credentials. Three separate bugs in `supabase/functions/provider-health-check/index.ts`:

### 1. Twilio `auth` — FAIL 404
Probe calls `${GATEWAY}/twilio/Accounts.json`. The Lovable connector gateway **auto-prepends** `/2010-04-01/Accounts/{AccountSid}` to every Twilio path. Final URL becomes `.../2010-04-01/Accounts/{SID}/Accounts.json` → **404 Not Found**.

Meanwhile `from_number` calls `/twilio/IncomingPhoneNumbers.json`, which resolves to the correct `.../Accounts/{SID}/IncomingPhoneNumbers.json` → **200 PASS**. That's why one Twilio check passes and the other 404s with the exact same secrets. Credentials are fine; the URL is wrong.

The real send path (`_shared/twilioSend.ts`) also uses the gateway with `TWILIO_API_KEY` + `LOVABLE_API_KEY` (no `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` needed) — so the current secrets shape (`TWILIO_API_KEY` + `TWILIO_FROM_NUMBER`) is correct for production sending. No need to add SID/TOKEN.

### 2. Resend `auth` — FAIL 400
Probe calls `https://api.resend.com/domains` directly with `Bearer ${RESEND_API_KEY}`. If `RESEND_API_KEY` is a Lovable connector key (starts with `lovc_`), Resend rejects it → **400**. Must go through the gateway with both `LOVABLE_API_KEY` + `X-Connection-Api-Key`.

### 3. Lovable AI `auth` — FAIL 400
Probe calls `${GATEWAY}/api/v1/verify_credentials` with only `Authorization`. The endpoint requires **both** `Authorization: Bearer ${LOVABLE_API_KEY}` **and** `X-Connection-Api-Key: ${connector_key}`. Without the connection key header, the gateway can't verify anything → **400**.

## Fix plan

### A. Rewrite the three broken probes in `provider-health-check/index.ts`

- **Twilio auth**: change path from `/twilio/Accounts.json` to `/twilio/Messages.json?PageSize=1` (GET, non-destructive, returns 200 with a valid key, exposes real Twilio error body on failure).
- **Resend auth**: route through the gateway — `GET ${GATEWAY}/resend/domains` with both `Authorization` + `X-Connection-Api-Key: ${RESEND_API_KEY}` headers. Auto-detect whether `RESEND_API_KEY` is a direct key (`re_...`) or a gateway connection key; pick the path accordingly.
- **Lovable AI auth**: replace verify_credentials with a real 1-token chat probe against `https://ai.gateway.lovable.dev/v1/chat/completions` using `google/gemini-2.5-flash-lite` and `max_tokens: 1`. That is the actual endpoint the app uses, so a PASS here means production AI works.

### B. Surface full diagnostic detail in the response (per user's request)

For every probe, always include in `error_body` (even on PASS, under `metadata.debug`):
- `request_url` (the exact URL called, secrets stripped)
- `http_status`
- `response_body_preview` (first 500 chars)
- `headers_used` (names only: `["Authorization","X-Connection-Api-Key"]`)

### C. Add a Twilio-specific diagnostic card on `/admin/provider-health`

New collapsible section "Twilio wiring detail" showing, for each Twilio check row:
- Full request URL used
- HTTP status
- Raw response body (JSON pretty-printed)
- Which secret names were read (`TWILIO_API_KEY`, `TWILIO_FROM_NUMBER`) — and whether the code also *expected* `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` (answer: no, gateway mode is used).

This replaces the ambiguous "FAIL 404" chip with the JSON body the user asked for.

### D. What we are NOT changing

- No new secrets requested. `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` are **not** needed — gateway mode is intentional.
- Kill switch stays OFF until the corrected probes all show PASS.
- No changes to `solicitation-send-sms`, phoneGuard, or the outreach queue.
- No new features, no SEO, no landing pages.

## Files touched

- `supabase/functions/provider-health-check/index.ts` — fix 3 probes, add debug metadata
- `src/pages/admin/PageAdminProviderHealth.tsx` — render new debug detail (request URL + raw body per check)

## Success criteria

After redeploy, `/admin/provider-health` shows:
- Twilio `auth`: **PASS 200** (or a real Twilio error JSON like `{code: 20003, ...}` if the key is actually wrong)
- Twilio `from_number`: **PASS 200** (unchanged)
- Resend `auth`: **PASS 200** or real Resend error body
- Lovable AI `auth`: **PASS 200** with a 1-token completion
- Every row has a "View raw response" toggle exposing URL + status + body

Only then does the user flip `OUTREACH_ENABLED = true` and send one real SMS to a real phone.
