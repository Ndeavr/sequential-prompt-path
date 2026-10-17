# Bounded contractor checkout repair

## Scope
Existing personalized contractor plan, existing create-checkout-session and signed stripe-webhook only. No new routes, tables, infrastructure, pricing or permission changes. No remote data writes, test charges, campaign, notifications or deployment.

## Before / after
- Before: a ledger insert followed by a failed role update left subsequent deliveries in already_processed, skipping profile and quote completion. After: same-session deliveries repeat idempotent role/profile/quote writes without inserting another receipt or changing its original expiry.
- Before: reconciliation treated an activation receipt as completed activation. After: a same-session receipt continues through verified Stripe replay; a different session still reports duplicate_payment.
- Before: a success query parameter emitted payment_completed from the browser before confirmation. After: only server payment evidence owns that event; cancellation telemetry remains.
- Before: missing webhook signing-secret configuration allowed arbitrary JSON to reach the handler. After: non-internal requests fail with 503 before database access.
- Lookup errors in the entry branch now stop before activation rather than being treated as absence.

## Verification
- 58 Vitest tests passed across eight focused files, including execution of the actual webhook branch with memory adapters and an injected role-write failure.
- 13 existing checkout-handler checks passed; all providers mocked.
- Real router/plan component on localhost at 360, 390 and 1280 px: offer visible, unmatched success return does not claim payment or emit payment_completed, cancellation retains referral. All non-local requests intercepted; no page errors. Screenshots inspected.
- Automatic compilation log: build OK. No manual build/typecheck performed. No authenticated full lifecycle or real Stripe delivery tested.

## Release blockers
- Canonical contractor_plan_code reads subscriptions only; the included Presence IA period is held in the activation ledger and is not consumed by that resolver. Repairing access semantics requires a separately scoped change to the existing authorization function, not a parallel entitlement system.
- Invited entry_pack_350 handler is distinct from entry_activation_350. Its complete TEST isolation, error propagation, fulfillment and access must be validated before declaring the whole contractor circuit release-safe.
- No production publication or function deployment requested by this repair: the release condition is not satisfied.
- Outreach gate remains closed; simulated QA is not a legitimate operational/compliance pass.