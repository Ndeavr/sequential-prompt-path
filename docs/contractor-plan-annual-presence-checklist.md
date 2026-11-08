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
- [ ] Remaining: trade-specific declared subservice display; languages/availability/first-name vs company carry-over.

## 3. Commercial rule — 350 $ + taxes per year
- [x] Implemented: FR/EN copy (offer350, contractorOffer, homeFin3, Clara locale, fast checkout, heat-pump simulator, activation/claim/AIPP/founder cards, server `offerCopy.ts`) says « 350 $ + taxes par année », 12 months, renouvellement non automatique.
- [x] Implemented (owner-approved combined purchase): `annual_presence_decision` (SQL, service only) + `_shared/annualPresence.ts`. Quote-based checkout adds ONE one-time CAD 350 line to the plan session when no valid annual Presence exists (new or expired); valid Presence or verified historical right → plan only. Coupons apply to the plan product only; a pending open session is reused only with the same Presence decision; zero-total plan with Presence due returns `annual_presence_due_with_free_plan` (no charge created). Pre-rule affiliate proposals keep their original terms. Unproven bypasses (plan code / activation_status / generic promotion flags) removed.
- [x] Implemented: `stripe-webhook` verifies the combined line via Stripe line items (one-time, 35000 CAD, qty 1, no discount, tagged) before recording a 12-month `entry_activation_350_paid` ledger row (idempotent per session); TEST payments only for QA accounts; a mismatch or a second valid Presence notifies admins and grants nothing. Standalone 350 duplicate check now ignores expired/voided rows (manual renewal allowed).
- [x] Implemented (SQL, applied to the backend): historical-rights snapshot, `annual_presence_status` (latest valid paid period, not earliest), `contractor_plan_code()` uses it with its owner/admin guard, atomic overlap trigger refusing a second valid Presence (`annual_presence_still_valid`).
- [x] Tested: 14 synthetic tests (decision parsing, no bypass, pre-rule proposals, line item, session reuse, webhook line verification incl. discount/amount/quantity/unpaid/untagged, order of server decision before Stripe, renewal window) + plan page lines (500 $ + 350 $ → TPS 42,50 $, TVQ 84,79 $, total 977,29 $). No checkout, charge or webhook delivery was run (TEST or LIVE).
- [ ] Deployed: NOT verified. Edited active functions (`create-checkout-session`, `stripe-webhook`, `match-lead`, `matching-profile`) may be auto-deployed by Lovable; no deployment receipt was checked.
- [ ] Blocker: signed Stripe TEST end-to-end of the combined session (TEST webhook destination/secret still unconfirmed).

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
- [x] Implemented: `contractors.unpro_registered_at` set by trigger at the real registration event going forward; 0 existing rows backfilled (no import/profile/payment date inferred). Shown only when present (« Inscrit à UNPRO le … »).

## 7. Website-to-dossier / ISR
- [x] Preserved; existing workspace test (9) passes; type check clean. No further change.

## Checks run this batch
- Continuation 2026-11-08: Vitest 46 focused tests (presence 14, goal model 13, adjuster 3, territory/size 12, indicators 4) pass; `tsgo -p tsconfig.app.json` 0 errors; `deno check` clean on stripe-webhook, create-checkout-session, match-lead, matching-profile.
- Vitest: 6 new/updated focused files (40 tests) + 28 related existing files (255 tests, 1 obsolete assertion updated).
- Type check (`tsgo -p tsconfig.app.json`): 0 errors. ESLint on changed files: 0 errors (warnings only).
- Browser (Playwright, 390 px, intercepted network): intake natural answer, failure/retry, reload; plan page goal controls, taxes, Presence line, fallback.
