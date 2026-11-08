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
- [ ] Remaining: geocoding of rule centres (stored `geocode_status: pending`); matcher/homeowner address filter reading `territory_rules`; trade-specific declared subservice display; languages/availability/first-name vs company carry-over; separate profile-completion / verified-licence / calendar indicators.

## 3. Commercial rule — 350 $ + taxes per year
- [x] Implemented: FR/EN copy (offer350, contractorOffer, homeFin3, Clara locale, fast checkout, heat-pump simulator, activation/claim/AIPP/founder cards, server `offerCopy.ts`) says « 350 $ + taxes par année », 12 months, renouvellement non automatique.
- [x] Implemented + Deployed: `create-checkout-session` refuses a quote-based appointment-plan checkout with `annual_presence_required` unless `_shared/annualPresence.ts` finds a valid annual Presence (`contractor_plan_code() = presence`), an active historical subscription, a historical activation or a server-validated promotion. No second 350 is ever added.
- [x] Tested: decision unit tests + static order check (gate before Stripe session). No checkout or charge was run.
- [ ] Business decision needed: automatic annual renewal and a single combined checkout (Presence + plan) require webhook/entitlement recognition of a combined session and a signed Stripe TEST end-to-end run (TEST webhook destination still unconfirmed). Until then Presence is paid first, separately, with manual renewal.
- [ ] Note: `contractor_plan_code()` counts the earliest paid 350 for 12 months; a renewal after expiry is not yet recognized — part of the same decision.

## 4. Personalized plan route
- [x] Implemented: `PlanGoalAdjuster` (revenue or profit goal, horizon, basket, conversion, margin required for profit, capacity in RDV/month, slider + numeric input capped at capacity, capacity gap with explicit adjust actions, versioned server recompute, stale responses ignored, checkout disabled while the quote differs). Intake `objectiveToPayload`/`qualitativePayload` no longer use `Math.max(capacity, next)`; project capacity kept separately. Exact included appointments from the server contract only; taxes to the cent; unconditional claims removed; affiliate/promotional quotes are not recomputed.
- [x] Tested: model tests (120 000 $ / 3 000 $ / 25 % → 40 contracts, 160 RDV, 14/month; 20 RDV/month → 5 contracts, 15 000 $/month; 500 $ → 574,88 $; 350 $ → 402,41 $), component test (stale response ignored), 390 px browser with a simulated quote (no row written).

## 5. Project sizes
- [x] Implemented: optional small/medium/large mix (sought/accepted/refused, entrepreneur's own basket/share/conversion), weighted economics, no universal ranges shown; stored as declared `project_size_mix` in the quote payload.
- [ ] Remaining: link the mix to homeowner qualification/matching.

## 6. Presence fallback and registration date
- [x] Implemented: fallback card with approved title, body, CTA « Commencer ma Présence IA — 350 $/an », benefits; no ranking/Google/ChatGPT promise.
- [ ] Blocked: no canonical BUSINESS registration date exists (`contractors.created_at` can be an import date). « Inscrit sur UNPRO depuis le … » stays omitted until a canonical field/event is decided.

## 7. Website-to-dossier / ISR
- [x] Preserved; existing workspace test (9) passes; type check clean. No further change.

## Checks run this batch
- Vitest: 6 new/updated focused files (40 tests) + 28 related existing files (255 tests, 1 obsolete assertion updated).
- Type check (`tsgo -p tsconfig.app.json`): 0 errors. ESLint on changed files: 0 errors (warnings only).
- Browser (Playwright, 390 px, intercepted network): intake natural answer, failure/retry, reload; plan page goal controls, taxes, Presence line, fallback.
