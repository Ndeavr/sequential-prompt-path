## Root cause

`supabase/functions/_shared/phoneValidation.ts::lookupPhone()` and `_shared/smsGuard.ts::lookupPhoneTypeCached()` both call Twilio Lookup v2 **directly** with `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`. Those secrets don't exist on this project — Twilio is wired through the Lovable connector gateway with `TWILIO_API_KEY` only (that's the fix we just landed for the send path). So:

- Every Lookup call short-circuits with `TWILIO_CREDENTIALS_MISSING` → `lookup_unavailable`.
- Legacy leads validated by an older code path are still stuck at `phone_validation_status = 'lookup_failed'` (71 in the screenshot).
- `Mobile = 0%` and `Valid SMS = 0` because nothing ever gets classified as `mobile` or promoted through the SMS eligibility filter.

Perfectly valid QC numbers (+1438/514/450/579/819/873) are being treated as unreachable — exactly what the user described.

## Fix (4 focused changes)

### 1. Route Twilio Lookup through the connector gateway
Rewrite `lookupPhone()` and `lookupPhoneTypeCached()` to call:

```
https://connector-gateway.lovable.dev/twilio-lookups/v2/PhoneNumbers/{e164}?Fields=line_type_intelligence
```

with headers `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key: ${TWILIO_API_KEY}`. Remove the SID/TOKEN fallback path (kept only as a last resort if both are set). Surface real `http_status` + response body preview on failure so `/admin/outreach-errors` shows the actual reason, not `lookup_unavailable`.

If the gateway confirms Lookups isn't wired for this connector, keep the graceful `lookup_unavailable` return — never downgrade to `invalid_phone`.

### 2. Never block outreach on a lookup miss for valid QC numbers
In `_shared/leadValidation.ts` the `lookup_unavailable` branch already promotes to `valid` (tentative). Extend the same treatment to the legacy `lookup_failed` bucket:

- If `classifyPhone(raw)` returns `pending_validation` (i.e. E.164-valid + QC area code) and Lookup errors, persist status `lookup_unavailable` (single canonical bucket) with `tentative_send = true`, `contact_method = 'mobile_sms'` when no other blocker.
- Drop the `phoneStatus === 'lookup_failed' → needs_review` branch — it's the false-negative the user called out.
- Add `"lookup_unavailable"` to `SMS_ALLOWED_STATUSES` so downstream queue builders stop filtering these leads out.

### 3. Backfill the 71 stuck leads
New edge function `outreach-relookup-stuck-phones` (run once from `/admin/outreach-errors` and cron every 6h):

- Selects `contractor_leads` where `phone_validation_status IN ('lookup_failed','pending_validation')` OR (`phone_validation_status = 'lookup_unavailable'` AND `phone_lookup_at < now() - 24h`).
- Re-runs `validateAndPersistLeadPhone()` through the new gateway path in batches of 100.
- Returns counts: `rechecked / promoted_to_valid / still_unavailable / real_invalid`.

### 4. Expose the metrics the user asked for
On `/admin/outreach-errors` (and mirror on `ValidationDebugPanel`):

- **E164 Valid** — `phone_e164 IS NOT NULL AND phone_validation_status <> 'invalid_phone'`
- **Lookup Success** — `phone_type IN ('mobile','landline','voip')`
- **Lookup Failed / Unavailable** — `phone_validation_status = 'lookup_unavailable'` (single label, "Lookup unavailable")
- **Eligible for SMS** — `phone_type = 'mobile' OR (phone_validation_status = 'lookup_unavailable' AND phone_area_code IN QC set AND NOT sms_disabled AND NOT do_not_contact)`

Plus a manual **"Re-run lookup on stuck phones"** button that calls `outreach-relookup-stuck-phones` and shows the returned counters.

## Explicitly out of scope

- Kill switch stays OFF. This plan does not flip `OUTREACH_ENABLED` — we hand back to the user with clean metrics so they can decide.
- No changes to the send path, phone guard blocked-pattern list, or SMS templates.
- No new SEO/landing/onboarding work.

## Files touched

- Edit `supabase/functions/_shared/phoneValidation.ts` (gateway lookup + `SMS_ALLOWED_STATUSES`)
- Edit `supabase/functions/_shared/smsGuard.ts` (gateway lookup in `lookupPhoneTypeCached`)
- Edit `supabase/functions/_shared/leadValidation.ts` (fold `lookup_failed` into `lookup_unavailable`)
- New `supabase/functions/outreach-relookup-stuck-phones/index.ts` + cron
- Edit `src/pages/admin/PageAdminOutreachErrors.tsx` (4 new metric cards + re-lookup button)
- Edit `src/components/admin/ValidationDebugPanel.tsx` (rename "Lookup échoué" → "Lookup indisponible" with combined count)

## Success criteria

- `/admin/provider-health` Twilio Lookup probe returns 200 via the gateway.
- Running the backfill turns most of the 71 `lookup_failed` rows into either `valid_mobile` or `lookup_unavailable` (sendable, tentative).
- **Eligible for SMS** count > 0 on `/admin/outreach-errors`.
- One real SMS attempt to a promoted lead reaches `sent` at Twilio.