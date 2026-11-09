# Contractor plan, natural preferences and annual AI Presence — completion checklist

Public-safe continuation record (no customer data, tokens or provider IDs). Started 2026-11-08 from verified head `74953c488` (contains observed `7e2b18a33` and calendar fix `de8ee469e`; nothing was reset).

Legend: **Implemented** = in source · **Tested** = focused automated/browser check run this batch · **Deployed** = live server receipt this batch. The public frontend is NOT published by this batch.

## 1. Calendar
- [x] Implemented earlier (`de8ee469e` retained, not reapplied). SQL `commit_google_calendar_snapshot` already present; not re-run.
- [x] Deployed: `calendar-google-selection`, `calendar-freebusy-sync`, `booking-confirm-slot` (previous 404 on selection is now a 401 refusal when signed out; booking without a valid contractor returns 400).
- [ ] Not tested: real Google reconnect/selection (grants revoked; no customer calendar selected, no QA booking).

## 2. Natural conversation and canonical reuse
- [x] Implemented: `src/lib/contractorPreferenceInterpreter.ts` (FR/EN, dictation without commas, negations, `ni`, exceptions, radius/locality/travel time, exclusion priority, later corrections, single targeted clarification for missing centre/unit). Wired into the existing `applyIntakeAnswer` (Clara) and the intake work/territory steps; comma instruction removed; copy « Décrivez vos préférences dans vos mots. Clara s’occupe de les organiser. »; success shown only after the canonical matching-profile save; failure keeps the raw text and offers retry.
- [x] Implemented: matching-profile `services_wanted`→`preferred_work`, `services_refused`→`excluded_work`, territories→service areas (no more first territory→city or first service→trade); `territory_rules`, `services_refused_status` persisted with the existing profile answers; « aucune exclusion » distinct from unanswered; exclusions no longer block advancing.
- [x] Tested: 10 interpreter/intake unit tests incl. the synthetic Lorraine sentence; 390 px browser: organize → saved → chips; reload keeps values; failed save shows retry and keeps text.
- [x] Implemented (2026-11-08 continuation): `_shared/territoryRules.ts` — radius centres geocoded at matching-profile save through the existing Google Places connector (max 5/save, single locality hit in the province only; ambiguous / not found / unavailable keep the declared text and give no coverage; previously geocoded centres reused). `match-lead` applies declared exclusions first (always), then explicit service areas or a geocoded radius vs the homeowner city centre (inclusions only once preferences are confirmed). Travel time is never converted to distance; no coordinates → no coverage.
- [x] Implemented: three distinct indicators on the contractor setup card — profile completed, RBQ (verified only with status + verification date, declared ≠ verified, expired), calendar connected.
- [x] Tested: 12 territory/size tests + 4 indicator tests (synthetic). Not tested: a real geocoding call or a real lead match.
- [x] Superseded: declared subservices, languages, availability and first-name vs company carry-over are covered in the corrective batch below (Sizes and profile carry-over).

## 3. Commercial rule — 350 $ + taxes per year
- [x] Implemented: FR/EN copy (offer350, contractorOffer, homeFin3, Clara locale, fast checkout, heat-pump simulator, activation/claim/AIPP/founder cards, server `offerCopy.ts`) says « 350 $ + taxes par année », 12 months, renouvellement non automatique.
- [x] Implemented (owner-approved combined purchase): `annual_presence_decision` (SQL, service only) + `_shared/annualPresence.ts`. Quote-based checkout adds ONE one-time CAD 350 line to the plan session when no valid annual Presence exists (new or expired); valid Presence or verified historical right → plan only. Coupons apply to the plan product only; a pending open session is reused only with the same Presence decision; zero-total plan with Presence due returns `annual_presence_due_with_free_plan` (no charge created). Pre-rule affiliate proposals keep their original terms. Unproven bypasses (plan code / activation_status / generic promotion flags) removed.
- [x] Implemented: `stripe-webhook` verifies the combined line via Stripe line items (one-time, 35000 CAD, qty 1, no discount, tagged) before recording a 12-month `entry_activation_350_paid` ledger row (idempotent per session); TEST payments only for QA accounts; a mismatch or a second valid Presence notifies admins and grants nothing. Standalone 350 duplicate check now ignores expired/voided rows (manual renewal allowed).
- [x] Implemented (SQL, applied to the backend): historical-rights snapshot, `annual_presence_status` (latest valid paid period, not earliest), `contractor_plan_code()` uses it with its owner/admin guard, atomic overlap trigger refusing a second valid Presence (`annual_presence_still_valid`).
- [x] Tested: 14 synthetic tests (decision parsing, no bypass, pre-rule proposals, line item, session reuse, webhook line verification incl. discount/amount/quantity/unpaid/untagged, order of server decision before Stripe, renewal window) + plan page lines (500 $ + 350 $ → TPS 42,50 $, TVQ 84,79 $, total 977,29 $). No checkout, charge or webhook delivery was run (TEST or LIVE).
- [x] Deployed: see « Corrective batch 2 » below (official deploy receipt + boot + signed-out checks for checkout, webhook, booking, matching, invited checkout).
- Limitation (not a blocker for code): signed Stripe TEST end-to-end not run — TEST and LIVE payments are forbidden for this work; webhook behavior is proven by mocks only.

## 4. Personalized plan route
- [x] Implemented: `PlanGoalAdjuster` (revenue or profit goal, horizon, basket, conversion, margin required for profit, capacity in RDV/month, slider + numeric input capped at capacity, capacity gap with explicit adjust actions, versioned server recompute, stale responses ignored, checkout disabled while the quote differs). Intake `objectiveToPayload`/`qualitativePayload` no longer use `Math.max(capacity, next)`; project capacity kept separately. Exact included appointments from the server contract only; taxes to the cent; unconditional claims removed; affiliate/promotional quotes are not recomputed.
- [x] Tested: model tests (120 000 $ / 3 000 $ / 25 % → 40 contracts, 160 RDV, 14/month; 20 RDV/month → 5 contracts, 15 000 $/month; 500 $ → 574,88 $; 350 $ → 402,41 $), component test (stale response ignored), 390 px browser with a simulated quote (no row written).

## 5. Project sizes
- [x] Implemented: optional small/medium/large mix (sought/accepted/refused, entrepreneur's own basket/share/conversion), weighted economics, no universal ranges shown; stored as declared `project_size_mix` in the quote payload.
- [x] Implemented: per-size appointment share, basket and conversion, optional declared min/max; economics Σ(w·b·c) / Σ(w·c); every active size validated, 100 % total required, explicit « Ramener à 100 % » normalization; mix in the quote signature.
- [x] Implemented: `match-lead` reads the declared `project_size_mix` (provenance declared) of the contractor's latest quote — homeowner budget entirely inside a refused declared range → excluded; overlapping a sought size → small bonus; no declared ranges → neutral (no universal ranges).
- [x] Tested: model 13, component 3, matching 5 tests.

## 6. Presence fallback and registration date
- [x] Implemented: fallback card with approved title, body, CTA « Commencer ma Présence IA — 350 $/an », benefits; no ranking/Google/ChatGPT promise.
- [x] Implemented: `contractors.unpro_registered_at` set by trigger at the real registration event going forward; 0 existing rows backfilled (no import/profile/payment date inferred). Shown only when present: dashboard and public profile `/entrepreneur/:slug` (« Inscrit sur UNPRO depuis le [date] » / “On UNPRO since [date]”, America/Toronto) via `get_contractor_public_registration` (published profiles only). Read-only count 2026-11-08: 0/45 contractors have a date, so nothing is displayed yet.

## 7. Website-to-dossier / ISR
- [x] Preserved; existing workspace test (9) passes; type check clean. No further change.

## Checks run this batch
- Continuation 2026-11-08: Vitest 46 focused tests (presence 14, goal model 13, adjuster 3, territory/size 12, indicators 4) pass; `tsgo -p tsconfig.app.json` 0 errors; `deno check` clean on stripe-webhook, create-checkout-session, match-lead, matching-profile.
- Vitest: 6 new/updated focused files (40 tests) + 28 related existing files (255 tests, 1 obsolete assertion updated).
- Type check (`tsgo -p tsconfig.app.json`): 0 errors. ESLint on changed files: 0 errors (warnings only).
- Browser (Playwright, 390 px, intercepted network): intake natural answer, failure/retry, reload; plan page goal controls, taxes, Presence line, fallback.

## Corrective batch 2026-11-08 (after 1ef7a8c1f)
Legend: Source = in repository · Tested = synthetic/mock or local DB · Deployed = official receipt checked.

### Duplicate charges (before payment, not after)
- [x] Source: migration 0044 (APPLIED to the backend during this batch — production schema change; its section A `UPDATE contractor_historical_presence_rights` DID rewrite historical-right metadata rows (provenance / review status). No payment, Stripe object, customer or contractor was created): `contractor_checkout_reservations` + `reserve_contractor_checkout` / `settle_contractor_checkout` (service only; anon/authenticated refused, checked). Advisory lock per contractor + Stripe mode, one active `reserved|open` row (unique index), Presence purchases refused while a paid Presence < 12 months awaits confirmation or a valid Presence exists, `paid` never reopened, stale session-less row superseded after 2 min.
- [x] Source: `_shared/checkoutReservation.ts` used by `create-checkout-session` for entry 350, combined Presence + plan and plan-only, hosted and embedded: same request → same session (or same Stripe idempotency key on retry); different quote / decision / hosted↔embedded / standalone↔combined → old session expired at Stripe BEFORE a new one; already paid → refused; unreadable state → refused; session created but not recorded → expired immediately, never returned. Customer, coupon and session creation all carry reservation-derived idempotency keys. `stripe-webhook` marks the reservation paid (signed `checkout.session.completed` / `async_payment_succeeded`, paid only) or expired.
- [x] Tested: 15 orchestrator tests (double click, embedded reuse, quote/mode/kind switch, paid old session, attach failure, DB down, 10 parallel tabs → 1 payable session, retry key, unreadable Stripe state, source order checks).
- [x] Tested (real Postgres 16, throwaway local DB, migration section loaded verbatim): 20 concurrent calls with two different quotes → 10 `create` (same row) + 10 `busy`, exactly 1 active row; attach/verify same vs different; TEST lane separate; webhook paid on a superseded session wins and cannot be closed; Presence paid < 12 months refused, renewal after 13 months allowed; valid Presence refuses Presence but not plan-only; stale reservation superseded.
- [x] Superseded by 0045: session-less rows are no longer replaced after 2 min (see below).
- [x] Superseded (batch 3): `create-activation-checkout` is public and LIVE-reachable (signed-out LIVE probe reaches the identity gate), so it is now inside the reservation — see « Invited checkout » below. The earlier « standalone duplicate check » did not exist.

### Historical rights
- [x] Source (0044, applied): active subscriptions count as historical only if created before the rule, with a Stripe subscription id and a matching processed webhook; frozen snapshot rights count only when `review_status = confirmed` for the same Stripe mode. Unproven rows are not revoked and not charged: checkout is blocked (`historical_right_review_required`) until an admin review (`review_historical_presence_right`, ≥ 20-char reason). Read-only state: 6 LIVE rows `unproven_activation_status` pending review, 4 QA rows TEST-only.
- [x] Tested: decision parsing (blocked → no line, no grant, display unknown) and SQL text assertions.
- [x] Superseded: see batch 2 evidence classes — only 2 rows need a human decision; nothing confirmed or rejected automatically.

### Territory (address, not city centre)
- [x] Source: `territoryVerdict` uses only property coordinates or a single address-level geocode result; city centroid never establishes radius coverage. Exclusions first (city, neighbourhood, excluded radius); an excluded radius that cannot be verified makes the contractor not served. Same rules in `match-lead` and in `booking-confirm-slot` before the booking RPC (`bookingTerritoryDecision`); no travel time converted to distance.
- [x] Tested: boundary fixtures 29.8 km covered / 30.3 km not, centroid refused, neighbourhood exclusion, excluded radius, ambiguous geocode, booking parity (8 new tests).

### Sizes and profile carry-over
- [x] Source: no per-domain size configuration exists (`appointment_values` and `project_sizes` are global), so sizes stay the contractor's editable hypotheses. Declared mix copied by `compute-pricing-quote` to the canonical matching profile (`answers.project_size_mix`, owner only, response `size_mix_persisted`); `match-lead` reads the profile first, latest quote only as fallback. Σ(w·b·c) unchanged.
- [x] Source: intake summary shows saved languages, availability, declared services/refusals from the matching profile (nothing inferred from the trade, no ISR/CVAC/asphalt additions); first name never taken from the company name.
- [x] Tested: 4 carry-over tests + 1 size persistence test; 36 existing intake/plan tests pass.

### Deployment
- [x] Deployed: superseded by batch 2 below (`compute-pricing-quote` not redeployed in batch 2; its deployed version was not re-verified).
- Limitation: signed Stripe TEST end-to-end not run (TEST and LIVE payments forbidden); mocks only.
- Checks: Vitest 57 focused + 36 existing intake/plan tests pass; `deno check` clean on create-checkout-session, stripe-webhook, match-lead, compute-pricing-quote; booking-confirm-slot has one pre-existing type error (`getGoogleAccessToken` client type, identical at 1ef7a8c1f). Preview build OK. Frontend not published.

## Corrective batch 2 2026-11-08 (after eb40417fa)

### Reservation never released on uncertainty
- [x] Source: `expireUndeliverable` releases only when Stripe CONFIRMS `expired` without payment; expire error → re-read; open / complete / paid / unreadable → reservation kept blocking with the session id recorded for reconciliation. Unknown Stripe status → refused (never treated as expired).
- [x] Source: create-checkout-session no longer releases on any 4xx: `releaseIfNotCreated` releases only a never-used reservation AND proven non-creation (400 invalid request / 401 / 403); 409, 429, idempotency errors, 5xx, network → kept, same request retries the same key. Unrecorded session message distinguishes « aucun paiement ouvert » (expiry confirmed) from « ne payez pas deux fois » (pending reconciliation).
- [x] Source + APPLIED: migration 0045 (production schema change: function definitions only, no row written). `reserve_contractor_checkout`: a session-less reservation is never replaced on a short timeout; same request → same idempotency key at any time; other request → busy (`reconciliation_pending`) until `session_expires_at + 10 min`, then superseded. Live definition read back.
- [x] Tested: 24 orchestrator tests (9 new: expiry network failure, unreadable session, paid during cleanup, concurrent retry with transient attach failure, crash before attach + 40 min retry, unknown status, Stripe error classes / release rules, SQL + source assertions). Throwaway Postgres harness on the exact 0045 text: create/retry=true with the same key at 40 min, other request busy `reconciliation_pending`, replaced only after expiry + 10 min; previous concurrency/paid/Presence cases still pass.

### Invited checkout (`create-activation-checkout`)
- [x] Source: identity resolved server-side before any Stripe call (`_shared/invitedIdentity.ts`): exact `verified_prospect_tokens` token (unrevoked, unexpired, no prefix) → `verified_contractor_prospects`, or exact `prospects.landing_token`. Slug / email / client fields never establish identity → 401 `verified_identity_required` with `/entrepreneurs` (sign-in or canonical profile), « Aucun paiement n'a été créé ».
- [x] Source: an existing contractor is linked only by the prospect's explicit `contractor_id` or ONE contractor matching the webhook's phone → email order; ambiguity → 409 `identity_ambiguous`, nothing created. Linked contractor: same `annual_presence_decision` and same `reserve_contractor_checkout` lock as the personal circuit (no double Presence across circuits); valid Presence → 409 `annual_presence_still_valid`; pending historical right → `historical_right_review_required`.
- [x] Source + APPLIED: migration 0046 (production schema change: function definitions + reservation-table subject columns/CHECK; no payment, customer or right row written). `reserve_prospect_checkout` (service only) — one active payable session per canonical prospect + Stripe mode, same rules as contractor reservations (same request = same idempotency key; other request busy until expiry is confirmed; paid never reopened).
- [x] Source: stable Stripe idempotency key from the reservation, session attached before return, billing record upsert; record failure → session expired at Stripe; reservation released only on confirmed expiry, otherwise kept for reconciliation.
- [x] Source: Stripe wording now « 350 $ CA par année + taxes », 12 months, « renouvellement manuel, jamais automatique », no appointment included or guaranteed; « paiement unique / aucun abonnement » removed.
- [x] Tested (mocks only, no Stripe): 11 new tests — slug-only / unknown / expired / revoked tokens refused before Stripe, token prefix refused, ambiguous contractor refused, identical retries → one session, other request → old session expired first, paid session blocks, reservation failure → no Stripe, record failure → expired + released, valid Presence refused, contractor lock shared, wording. Existing QA-isolation / tax-parity / privacy suites updated to a verified invite token.
- [x] Deployed 2026-11-09 ~00:38 UTC (official deploy tool, submitted source SHA-256 `d4780137…`). Signed-out LIVE and TEST probes return 401 `verified_identity_required` (a response only the new version emits); no Stripe object, no row.

### Neighbourhood exclusions on the address
- [x] Source: booking and matching request `addressComponents` from the address geocode (`ADDRESS_FIELD_MASK`) and keep the address hierarchy (`areas`); the client cannot declare a neighbourhood. Without a known hierarchy, any locality exclusion makes the result uncertain → booking refused (`territory_unverified`), matcher excludes. Booking type error fixed.
- [x] Tested: 5 new tests with Places-shaped synthetic payloads (excluded neighbourhood refused in booking and matching, other neighbourhood admitted, city only / no components / non-address result never admitted, property neighbourhood applied without geocode).

### Historical rights — evidence, no decision
- [x] Source + APPLIED (0046): evidence and review are per Stripe mode. Payments/webhooks are classified LIVE vs TEST from the signed event (`livemode`, or the signed payload's `livemode` for older rows where the column is empty); unknown mode never counts as proof. `review_historical_presence_right(contractor, mode, decision, reason ≥ 20)` — admin acting as themselves; the older mode-less version is no longer callable by users.
- [x] Source: real admin path `/admin/presence-historique` (admin-protected): per-row mode, evidence class, counts, link to the contractor file, Confirm / Refuse with a written reason. The QA-name flag is shown as a hint only and never enables a decision. 1 component test.
- Evidence state (6 pending LIVE rows, references sent privately, not here): 1 signed LIVE payment of CA$1.00 under the retired 7-day offer (not the 350 offer); 5 with no LIVE payment (1 published, 4 unpublished; 4 carry a QA-name hint). Nothing confirmed, rejected or revoked; no charge.
- Impact: a pending row blocks a NEW Presence checkout for that contractor only; it does not change current plan, features or publication. It does not block frontend publication.

### Deployment (official receipt)
- [x] Deployed 2026-11-08 ~22:07 UTC via the official deploy tool: create-checkout-session `16bb7698…`, stripe-webhook `fc03b54c…`, booking-confirm-slot `23674de6…`, match-lead `4c154b7e…`, create-activation-checkout `a3d67e32…` (submitted source SHA-256). Boot logged after deploy.
- [x] Signed-out checks (no session, no booking): checkout 401, match-lead 401, booking 400 `invalid_contractor_id`, invited checkout 409 `quote_requires_separate_checkout` (pre-Stripe guard), webhook 400 `Missing signature`.
- [x] Deployed 2026-11-09 ~00:38–00:40 UTC: compute-pricing-quote `ee18e4c9…`, matching-profile `87149b9a…` (submitted source SHA-256; boot logged after deploy). matching-profile had never bundled with its website-analysis import (it imported another function's folder); the first-party reader moved to `_shared/` with re-exports at the old path (same module identity; 97 CASL/first-party tests pass). No version-number endpoint exists for these functions: proof = receipt + boot; their signed-out 400 responses are not version-specific.
- Limitations (not tests to run): real/TEST payment and webhook delivery (forbidden), Google reconnect/selection (user-dependent).
- Checks: batch 2 — Vitest 17 files / 197 tests. Batch 3 — payment suites 6 files / 112 tests, CASL/first-party 6 files / 97 tests, admin review 1 test; app typecheck clean; `deno check` clean on create-activation-checkout, create-checkout-session, compute-pricing-quote, matching-profile, enrich-official-website.
