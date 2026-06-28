## Why a plan is needed

I can't read the value of `TWILIO_MESSAGING_SERVICE_SID` directly — secret values are encrypted and never exposed to me, and the Twilio connector gateway only proxies `/2010-04-01/Accounts/{SID}/…`, not the Messaging API (`messaging.twilio.com/v1`) where Messaging Services live. So I can't answer "which MG…" definitively from chat alone. I need to add one tiny read-only edge function that fetches the Service details from Twilio's Messaging API using the existing `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` secrets, then report the result back to you.

## What gets built

### 1. New edge function `twilio-messaging-service-info` (`verify_jwt = false`, admin-gated)

One read-only call. Reads `TWILIO_MESSAGING_SERVICE_SID` from env and `GET`s:

```
https://messaging.twilio.com/v1/Services/{MG_SID}
```

with HTTP Basic Auth (`TWILIO_ACCOUNT_SID:TWILIO_AUTH_TOKEN`).

Returns:

```json
{
  "messaging_service_sid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "friendly_name": "...",
  "inbound_request_url": "...",          // currently configured in Twilio
  "inbound_method": "POST",
  "status_callback": "...",
  "expected_inbound_url": "https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/twilio-inbound",
  "expected_status_callback": "https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/twilio-status-v2",
  "matches_expected_inbound": true|false,
  "twilio_console_url": "https://console.twilio.com/us1/develop/sms/services/{MG_SID}/integration"
}
```

Also lists the phone numbers attached to the service via `GET /v1/Services/{MG_SID}/PhoneNumbers` so we can confirm `+14503286776` is bound to it.

### 2. Surface the result

Add a one-shot "Reveal Messaging Service" button at the top of `TwilioDiagnosticPanel.tsx` (already mounted in `/admin/revenue-intelligence`) that invokes the new function and prints the JSON. No other UI changes.

### 3. Register the function

`supabase/config.toml` → `[functions.twilio-messaging-service-info] verify_jwt = false`.

## What you'll get back (the actual answer to your question)

After this ships and you click the button once, the panel will show:

- **Messaging Service SID** — the real `MG…` value from the secret.
- **Service name** — Twilio "FriendlyName".
- **Exact inbound webhook URL required** — `https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/twilio-inbound` (already the value the E2E audit expects).
- **Exact Twilio page where it must be configured** — Twilio Console → **Messaging → Services → {service name} → Integration → "Incoming Messages" → Send a webhook → Request URL** (direct link returned in the JSON).

## Files

- `supabase/functions/twilio-messaging-service-info/index.ts` (new)
- `supabase/config.toml` (register function, `verify_jwt = false`)
- `src/components/admin/TwilioDiagnosticPanel.tsx` (add button + JSON viewer)

## Done when

Clicking "Reveal Messaging Service" returns the live MG SID, friendly name, currently configured inbound URL, and a clear PASS/FAIL on whether it matches `…/functions/v1/twilio-inbound`, plus the deep-link to the exact Twilio Console page to fix it.
