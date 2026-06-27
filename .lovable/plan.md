## Twilio Live Authentication Audit

Build a fresh, no-cache diagnostic that hits the real Twilio API and pinpoints the failing secret.

### 1. New edge function: `twilio-auth-audit` (verify_jwt = false, admin-gated)
For each of the three auth modes present in secrets, perform a real authenticated GET against Twilio:

- **Mode A — Account SID + Auth Token** (the failing path):
  `GET https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}.json`
  Basic auth: `TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN`
- **Mode B — API Key + Auth Token** via connector gateway (`TWILIO_API_KEY` exists as a connector key) — call `/2010-04-01/Accounts.json` through `connector-gateway.lovable.dev/twilio` to confirm whether the gateway-backed credential still works.
- **Mode C — Phone number lookup**:
  `GET /2010-04-01/Accounts/{SID}/IncomingPhoneNumbers.json?PhoneNumber={TWILIO_PHONE_NUMBER}` and same for `TWILIO_FROM_NUMBER` (+14503286776).
- **Mode D — Messaging Service & Verify Service**:
  `GET https://messaging.twilio.com/v1/Services/{TWILIO_MESSAGING_SERVICE_SID}`
  `GET https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SERVICE_SID}`

For every call, return raw `{ status, twilio_code, twilio_message, body_excerpt, latency_ms }`. No caching, no DB reads — each request is freshly issued.

### 2. Verdict block
Compute and return a structured verdict naming the exact failing secret:

```
{
  account_sid: { present, format_ok, valid: bool, error_code, error_message },
  auth_token:  { present, length, valid: bool },   // valid = Mode A returns 200
  phone_number:{ present, e164_ok, exists_in_account: bool, sid, capabilities },
  from_number: { ... same ... },
  messaging_service: { present, valid, friendly_name },
  verify_service: { present, valid, friendly_name },
  api_key_connector: { present, gateway_valid },
  failing_secret: "TWILIO_AUTH_TOKEN" | "TWILIO_ACCOUNT_SID" | "TWILIO_PHONE_NUMBER" | null,
  next_action: human-readable repair instruction
}
```

Decision logic:
- Mode A → 401 with code 20003 ⇒ `failing_secret = TWILIO_AUTH_TOKEN` (or SID if account not found → code 20404).
- Mode A → 200 but phone lookup returns empty array ⇒ `failing_secret = TWILIO_PHONE_NUMBER`.
- Mode A → 200 + number found ⇒ `failing_secret = null`, system is healthy; investigate elsewhere.

### 3. Admin UI hook
Add a **"Run Live Auth Audit"** button + result panel inside the existing `TwilioDiagnosticPanel.tsx` (under `/admin/revenue-intelligence`). Shows the verdict block above with green/red rows per secret and a copy-paste repair recommendation. No reliance on the existing cached `twilio-diagnostics` output.

### 4. Repair guidance surfaced in UI
If `failing_secret = TWILIO_AUTH_TOKEN`, the panel shows a one-click "Update TWILIO_AUTH_TOKEN" CTA explaining where to find the current Auth Token in Twilio Console → Account → API keys & tokens, then triggers the secrets update form.

### Files
- `supabase/functions/twilio-auth-audit/index.ts` (new)
- `supabase/config.toml` (register `verify_jwt = false`)
- `src/components/admin/TwilioDiagnosticPanel.tsx` (add Live Audit section)

### Done when
- Calling `twilio-auth-audit` returns a real Twilio HTTP status for each secret
- The exact failing secret name is identified deterministically
- Admin panel surfaces the verdict and a direct repair CTA
