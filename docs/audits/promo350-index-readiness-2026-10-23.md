# PROMO 350 — index absent, release hold

## Evidence and impact
- Audited source: `1f71f694f9c2a5f867c661b7c87b9c5e3d6ecec2`; `npm run verify:source` passed. Published revision not verified.
- Read-only hosted catalog: session-unique index exists and is valid/ready; `uq_entry350_single_promo_redemption` is absent. Aggregate queries: zero promo receipts and zero duplicate promo groups. Gate remains `gated=true`, score 30. No queue operations performed.
- Only source for the promo index is `docs/migrations-staged/20261023_entry350_single_promo_redemption.sql`. It is deliberately staged, not applied by normal migration history. Do not duplicate it into another migration directory or treat local SQL tests as hosted evidence.
- Checkout (`create-checkout-session/index.ts:278–304,493–537`) gates LIVE/PROMO separately, verifies native coupon restrictions, checks prior usage, applies exclusive taxes and keys Stripe idempotency by contract/mode/contractor. This cannot replace global database uniqueness for different contractors.
- Webhook (`stripe-webhook/index.ts:360–380,435–620`) validates the signed paid contract, writes the ledger first, then roles/status; promo-index conflict for another session alerts with the original session and acknowledges `duplicate_promo_redemption` without provisioning. Same-session conflict can resume interrupted provisioning. Missing hosted index leaves concurrent distinct sessions unprotected despite pre-checks.
- Minimal code correction: `checkoutGuards.ts` no longer treats every generic duplicate-key error as same-session proof; only the known session index qualifies. Unrelated unique violations now fail closed.
- Canonical rights: `drizzle/migrations/0023_entry_350_presence_entitlement.sql`, first matching LIVE event/receipt, 12 calendar months, refund/dispute exclusion. Local promo race assertions verify one QA account/role and one TEST receipt, not a commercial entitlement or LIVE sale.

## Prepared files — not executed remotely
1. Existing staged index SQL above: reuse byte-for-byte after separate approval.
2. `docs/migrations-staged/20261023_entry350_single_promo_redemption.preflight.sql`: read-only catalog/state and aggregate duplicate checks.
3. `docs/migrations-staged/20261023_entry350_single_promo_redemption.rollback.sql`: guarded rollback; only this exact valid index, zero promo receipts, short lock timeout, no data deletion. Requires independent confirmation of provider/worker quiescence. With any promo receipt retain the index and repair forward.

## Preflight / isolated QA / release order
1. Keep commercial payment/PROMO and outreach gates closed; preserve all legacy queued messages. Confirm exact target, environment, role/permissions and verified backup. Current audit does not establish backup integrity or provider configuration.
2. On the isolated QA target only, inventory index name/definition/state. Duplicate groups must be zero. If index name exists with a different definition or invalid state, STOP; `IF NOT EXISTS` is not validation. Never delete historic duplicates to make installation pass.
3. Quiesce promo session creation and webhook retries; inspect outstanding Stripe sessions. Apply the existing staged SQL through the authorized migration path **only after separate approval**. Small-table transaction/short lock timeouts; for a large live table plan a separately reviewed online operation, not a silent rewrite. Verify exact definition, uniqueness, valid/ready states immediately after installation.
4. Use synthetic QA accounts and Stripe TEST only: two distinct paid signed sessions same promo must produce one receipt/activation, other acknowledged/alerted with original session; same-session concurrent delivery and retry after role failure preserve first expiry and no second receipt. Test full-price 35000/40241, promo 115, missing/bad signature, mismatched mode/amount/ownership, unpaid/cancelled/expired sessions, UI-only success and revocation. No commercial counters, commissions or outreach from TEST.
5. Validate refund/dispute removes access without resetting one-use; reload/relogin and account isolation. Actual hosted signed TEST flow and production deployment parity remain unverified. Require catalog parity plus provider/tax/security evidence before any release. No LIVE coupon or charge is authorized by this document.
6. Rollback is never automatic: close PROMO first, quiesce all sessions/events, rerun preflight and verify exact index definition. If receipts exist, retain protection; forward repair only. The prepared rollback must reject absent/wrong index and any promo history.

## Local checks
- Focused tests cover PGlite index arbitration with stale reads for two real webhook-branch workers, exact original-session alert, same-session retry, zero LIVE receipts from TEST, signature rejection, 35000/40241 amounts, refund/dispute, 12-month expiry, ownership and UI/expired-session guards.
- No hosted checkout, webhook replay, migration, deployment, SMS/email, customer write or pending-message update was performed.