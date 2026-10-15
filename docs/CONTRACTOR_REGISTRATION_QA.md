# Contractor registration and profile QA

The canonical registration keeps a server-owned quote through checkout and creates/reuses the existing `contractors` record. Confirmed company identity is copied from that quote, never from checkout URL parameters. Existing owner corrections take priority; an email placeholder or empty field can be completed without replacing confirmed data. Quote ownership and contractor ownership are checked before identity writes. Prices, activation and eligibility remain server-controlled.

The existing profile editor and setup step share logo/portfolio controls. Uploads use `contractor-media` with an authenticated-user folder followed by the contractor ID. Media records use the real `public_url` column. Failed record writes remove the new storage object and show a retryable error. Refreshing media does not discard unfinished profile edits. Public logos use `object-contain`; portfolio images and the owner's description appear in the existing public profile.

Legal name and a ten-digit NEQ are editable. Declared identifiers are not verification evidence. RBQ declarations still use the existing compliance selector and backend gates; a number without a verified credential is explicitly marked as declared. The audit no longer calls a stored NEQ a verified registry result. No reviews, licence status, company media or eligibility scores are invented.

## Reproducible checks

- `node scripts/audit/contractor_profile_smoke.mjs`: actual editor, uploader, private preview and public React component at 360, 390 and 1280 pixels. Covers gallery order, logo fit, file validation, rejected media writes, cleanup, touch removal, draft preservation, legal identity persistence and declared RBQ/NEQ display.
- `node scripts/audit/contractor_checkout_smoke.mjs`: executes the actual Edge handler with fake adapters. Rejects unknown/foreign quotes before mutation, preserves owner edits, fails closed on a profile lookup error and checks confirmed company creation. It creates no Stripe session.
- `node scripts/audit/contractor_intake_smoke.mjs`: actual company search, confirmed identity and objective/capacity submission at the same three widths.
- `npm test` and `npm run lint:critical`; `npx tsc --noEmit -p tsconfig.app.json` checks the app itself; `npx vite build` validates production bundling.

All browser/backend test fixtures intercept external services. They do not create real accounts, payments, messages or public company records. Live schema, public media bucket and owner policies were checked read-only. Successful mocked checkout tests are not proof of a real payment or official registry verification.

## Follow-up from production-browser QA

Production assets and the real routes were tested with external APIs intercepted at all three widths. That review found a price/currency wrap, a phone-number wrap, duplicated punctuation in the company greeting, and an ambiguous editor RBQ status when a stored number lacked a declaration. The follow-up keeps currency/phone tokens together, normalizes greeting punctuation, and labels that number as declared without changing eligibility.

The same review found repeated role reads on profile mount. The shared `useAuth` query no longer invalidates all role observers whenever another consumer mounts. A known role has a one-second shared freshness window; unresolved roles remain immediately stale, explicit role invalidation still takes effect, and each user has a distinct cache key. `auth-role-query-sharing.test.tsx` checks shared mounts, explicit updates, user changes and failed reads.
