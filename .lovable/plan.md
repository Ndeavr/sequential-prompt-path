# Fix — /activer/:slug "Edge Function returned non-2xx"

## Root cause

The landing page `/activer/t-73...` calls `sms-sprint-checkout`, which does:

```
select ... from sms_sprint_prospects where tracking_slug = :slug
if !prospect → throw "prospect_not_found" → HTTP 400
```

`sms_sprint_prospects` is currently **empty** (0 rows). No scrape has been run, and the test SMS the user tapped points at a slug that was never persisted. The frontend surfaces the raw supabase.functions.invoke error string: *"Edge Function returned a non-2xx status code"*. This is the recurring failure.

Even after scraping runs, this is fragile: any expired/mistyped slug produces the same ugly error, and the landing page happily shows the CTA even when `prospect` is null.

## Fix (3 parts)

### 1. `PageActivationSprint.tsx` — no CTA without a valid prospect
- If `prospect` is null after load, render a clean fallback state:
  - Title: "Ce lien d'activation n'est plus valide."
  - Sub: "Contactez-nous pour recevoir un nouveau lien Fondateur."
  - Secondary CTA → `mailto:` / `/entrepreneur`.
- Hide the email input + "Activer pour 1$" button entirely when no prospect.
- Map the `activate()` error to a friendly FR string (`"Lien expiré. Contactez-nous pour un nouveau lien."`) instead of the raw invoke message.

### 2. `sms-sprint-checkout` edge function — return 200 + error field
- Stop throwing on `prospect_not_found` / `missing_slug`. Return `{ ok: false, error: "prospect_not_found" }` with **HTTP 200** so `supabase.functions.invoke` doesn't reject with the generic non-2xx message.
- Only real 500s (Stripe failure, DB failure) return non-2xx.
- Frontend checks `data.ok === false` and shows the friendly copy above.

### 3. Seed one working test prospect
Insert a single row into `sms_sprint_prospects` so the user can smoke-test the full flow end-to-end without waiting for a scrape:
- `tracking_slug = 'test-founder'`
- `company_name = 'Test Founder'`, `city = 'Montréal'`, `category = 'toiture'`
- `variant = 'A'`, `activation_status = 'sent'`
- Landing URL: `https://unpro.ca/activer/test-founder`

## Files touched

- `src/pages/PageActivationSprint.tsx` — null-prospect fallback + friendly error mapping
- `supabase/functions/sms-sprint-checkout/index.ts` — return 200 with error field for known validation failures
- New migration — insert `test-founder` seed row (idempotent `on conflict do nothing`)

## Out of scope

- No changes to scrape/send/track/followup functions.
- No schema changes beyond the seed insert.
- No design/copy changes to the successful landing state.
