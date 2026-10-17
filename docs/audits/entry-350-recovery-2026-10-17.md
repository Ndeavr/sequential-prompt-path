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

## Follow-up — strict paid collection gate (2026-10-17 20:48 UTC)
- Source verification passed: working HEAD includes c3cd28a9c6ff; current webhook is 86,755 bytes before this repair. No branch restoration or migration recreation.
- Proven defect: invited entry accepted `no_payment_required`; personalized entry lacked mode and collected-total checks. Both entry circuits now share an early guard before paid telemetry, provisioning, roles, subscription writes or paid flags. Legacy free offers keep their existing semantics.
- Require paid, payment mode, CAD, 35,000-cent subtotal and collected total covering the existing creation contract and signed tax detail. Personalized: GST 1,750 + QST 3,491 = 40,241 cents minimum. Invited: existing handler configures no taxes, minimum 35,000 cents; tax policy/price not changed. Neither entry creation config enables coupons/promotion codes; subscription coupon handling is a separate branch.
- Ignored entry events return before the generic final `processed/success` write, preserving rejection evidence.
- Changed: `_shared/checkoutGuards.ts`, `stripe-webhook/index.ts`, `entry-350-paid-collection.test.ts`, `entry-350-recovery.test.ts`, `entry-activation-350.test.tsx`, `supabase/AGENTS.md`, this report and roadmap. No creation-handler, price, SQL migration, grant or RLS changes.
- 72/72 Vitest tests across seven files passed; includes 21 collection regressions, complete actual handler execution for rejected events with mocked Stripe verification/DB, 12 isolated Postgres resolver tests, partial activation replay, expiry, refund and ownership. Existing checkout smoke: 13/13 mocked checks. One source-slicing assertion initially failed after the earlier guard moved the first offer marker; anchored to the actual branch and reran successfully.
- Automatic build log: build OK at 20:48:45 UTC. No manual build/typecheck. Real signed delivery and authenticated production E2E are NOT proven by these tests.
- Stripe authenticated read at 20:48 UTC independently confirms LIVE endpoint enabled, API 2018-02-28, all eight required events. No Stripe changes. This confirms subscription configuration, not webhook delivery health or secret/key validity. Legacy payloads missing subtotal/total fail closed; no new real LIVE receipt generated.
- Production read-only metadata confirms migrated canonical resolver present, owner/admin subscription/entitlement reads, admin-only receipt reads, anon denied EXECUTE, authenticated/service EXECUTE allowed. No actual owner/other-owner authenticated requests performed; isolated SQL uses simulated identities, not full production RLS.
- RELEASE BLOCKED: preview is signed out; preview and published app share production data, with no authorized isolated authenticated QA backend available. True-stack activation cannot be exercised using fabricated LIVE receipts or production paid writes. No deployment, publication, charge, email/SMS or prospect contact.
- Exact next safe action: authorize an isolated QA copy of the current backend/code with dedicated owner and second-owner accounts, outbound disabled, for authenticated no-charge Stripe fixture and RLS/entitlement E2E. This environment is not created by this repair.