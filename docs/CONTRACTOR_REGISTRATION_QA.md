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

### Activation resume regression — October 15

The completed matching-profile CTA previously always linked to pricing intake,
restoring its draft at the annual-goal question even when a proposal already existed.
It now checks server-owned quotes for the confirmed company (owner-scoped query),
then the canonical Clara reference for a guest quote, including after account creation.
An existing proposal resumes directly; confirmed paid quotes open `/pro`; the
free founder entitlement keeps its calendar destination. Another company, rejected
quotes and guest paid state cannot grant access. Missing quotes retain the existing
intake draft; lookup failures display retry without restarting. No payment state is changed.

Paid activation takes priority over newer unpaid estimates for the same owner/company.

Validation: eight service regressions and 21 actual-DOM CTA scenarios across
360, 390 and 1280 px, with mocked auth/data and external requests blocked.
The signed-in Isolation Solution Royal account was not impersonated or modified.

### Recalculated proposal regression — October 15

A newly calculated quote is unpaid even when the contractor already paid its
initial activation on another quote. The plan page now resolves the same owner's
paid activation before showing purchasing actions, using the canonical resume
service; lookup failures show retry rather than a fresh activation offer.
An activated company sees its recalculated monthly proposal, its declared
next-month capacity and a distinct monthly-plan CTA, with no second $350
activation or fallback. No subscription or payment state changes on calculation.

The explicit personalized view survives “more appointments”, “adjust my offer”,
quote recalculation, tier selection, authentication return and reload through a
`view=personalized` route hint. It changes presentation only, never entitlement or
server pricing. A new contractor's default first offer remains the $350 activation.

`scripts/audit/contractor_plan_revision_smoke.mjs` runs 63 actual-DOM checks across
360/390/1280 px: new contractor, previously paid activation with newer unpaid quote,
already-paid current quote and lookup failure. Both editable journeys change
next-month capacity from 4 to 30, submit through the real intake, display the
returned quote/price, preserve attribution and reload the personalized view.
Auth/data/pricing responses are fixtures; all external requests are blocked.
No real account, payment or notification is created or changed by these tests.

### Clara spoken qualification must advance — October 15

Unsupported callback promises are not human-task receipts. The active contractor
voice transcript replaces such closers with an immediate continuation, stops the
voice transport and resumes the existing in-chat qualification/proposal. The text
chat has the same recovery. The existing flow waits for pending voice summaries,
asks only its next missing field, and retains an already displayed proposal.
Without an embedded flow, the canonical pricing intake opens with saved identity,
existing draft corrections and same-conversation financial answers; save/navigation
failures leave a visible retry. No human follow-up is created or claimed.

Voice transcripts for monthly contract goals, next-month appointments and average
project values now enter the same flow memory as text. Only a single explicit
numeric value is accepted; ranges/abbreviations need clarification. No numeric
fallback is invented for an ambiguous voice answer. The proposal CTA now says
“Voir ma proposition”; it does not claim payment or activation. Voice prompt rules
also explicitly prohibit callback promises without a real confirmed request.

Validation: nine focused service/voice-bridge regressions, including canonical
transcript correction, conversation-bound financial reuse, corrections and save
failure. 27 real-DOM checks at 360/390/1280 px simulate spoken answers 3 contracts,
30 appointments and $3500, reach the real summary/proposal and assert one quote
computation. All network responses are fixtures; microphone/ElevenLabs, payment,
SMS and email are not exercised or sent. The existing navigation helper now
verifies both pathname and query, so a personalized-view handoff can succeed.

## Clara as a page companion (2026-10-15)

The global voice surface defaults to a compact, nonmodal dock on mobile and
desktop. Expanding its transcript, minimizing it or navigating does not stop or
restart the voice transport. Explicit pause, resume and close remain available.
The homepage keeps its existing inline voice slot; explicit fullscreen mode has
a minimize control. Only fullscreen mode applies the page blur.

One route observer publishes page/step, enabled visible CTA labels, subscription
blockers, focused annotated numeric fields and validation/hesitation state. The
existing live SDK receives contextual updates in the same session; the existing
text request also receives the snapshot. This does not inject user messages,
write form values or claim a payment/activation. Only allowlisted numeric intake
fields are shared; credentials, payment fields, contact inputs and query strings
are excluded. Values remain declared, never verified. The shared keyboard hook
keeps the focused page field clear of the dock without adding another scroll owner.

Validation: 36 real-DOM checks at 360, 390 and 1280 pixels use the actual dock,
observer, subscription paywall and keyboard hook. They cover page-link access,
route collapse, unchanged voice callbacks, numeric/focus/invalid context, secret
exclusion and keyboard overlap. Voice callbacks are simulated and all external
requests blocked. Seven focused unit/hook regressions include contextual updates
through the actual useLiveVoice hook with a mocked SDK. The full suite passes 1,146 tests (one integration test skipped); explicit app
TypeScript checking and Vite production build pass. New modules lint clean;
critical lint passes. The older voice files retain their existing lint findings
(the overlay's rule/message counts match its base revision).

Release gate: the protected voice-health contract requires voice_smoke_test()
before deployment. The production /admin/voice-health route redirected this
browser to /login. Local UI/SDK-fixture tests do not establish production audio
health; run the authenticated diagnostic before publishing this change.

### Premium conversation surface (2026-10-15 follow-up)

The public bundle was still index-QxgqUbzG.js at source 3566edc6; the compact
companion PR was not yet merged or published. This explains the unchanged
fullscreen capture; a local or PR-only fix is not a production release.

Conversation, composer, messages, examples and media now use the existing
midnight card tokens instead of mixing hardcoded white panels with a dark
header. Reflections are restrained, borders and shadows are consistent, and the
microphone has a subtle blue highlight. The compact dock uses the same material.

The new real-homepage visual smoke runs at 360, 390 and 1280 px, checks text and
suggestion contrast >=4.5, microphone visibility and overflow, and blocks all
external requests. It passes 21 checks; the companion smoke passes 36 checks.
The full unit suite passes 1,146 tests with one integration skip. Vite builds.

Earlier embedded smoke runs exposed a landscape long-draft composer overflow;
landscape keyboard textareas are now capped at 48px and scroll internally. The
manual-reading harness also tried to assign scrollTop during the library's
initial retained follow animation; it now exercises real wheel input and waits
for the user's scroll position before appending content. Production scrolling
continues to use the existing StickToBottom owner.

The authenticated production voice smoke gate above still applies. These checks
use mocked external services and do not establish live microphone/audio health.

### Authenticated voice diagnostic (2026-10-15)

Admin authentication completed. The real production voice smoke report at
12:23:40–12:23:46 UTC failed: microphone permission denied, MP3 response parsed
as text (`unexpected tts response shape`), and no orb on the admin diagnostic
page. Edge health and live voice credential checks passed. This is not an
all-green voice gate and does not authorize a deployment.

The SDK's FunctionsClient decodes unrecognized MIME types with response.text();
audio/mpeg is not in its binary MIME allowlist. Both diagnostic TTS callers now
use a shared authenticated raw-response helper and arrayBuffer(), retaining MP3
bytes, rejecting non-audio/HTTP errors and bounding requests at 15 seconds.
No voice IDs, model, microphone/VAD settings or production transport changed.
Three mocked regressions cover binary preservation and error responses. An
attempt to validate the helper against production from the isolated localhost
harness failed at fetch/network access, so that attempt does not verify live
playback. The denied microphone and missing admin-page orb checks remain intact;
the release gate is not weakened to hide these failures.
