# Targeted funnel indicator truth — code only

## Confirmed defect and impact

The current `computeRealPipeline` selected neither campaign nor fixture metadata.
`11_clicked` took the maximum of SMS rows with `clicked_at` and tracking links
with positive counters: neither total clicks nor unique humans. Tracking counters
are lifetime counters, not clicks within the report window.

Read-only aggregate inspection confirmed 51 links / 29 raw clicks; 17 internal
clicks. `outreach_messages` has 8 links resolving to existing prospects, 12
clicks on 4 links, no observed entity fixture markers. The 19 email links have
9 internal clicks and cannot establish commercial email conversion. These
historical aggregates do not prove human visits or fresh SMS delivery.

`16_payment_succeeded` previously accepted `paid OR complete`. The exposed
billing/webhook columns cannot corroborate a signed LIVE one-time entry350
payment, its 35000 CAD subtotal, activation ledger, and absence of refunds.
Read-only billing inspection found 17 rows and zero old-status candidates:
the payment defect is latent, not evidence of a newly removed real sale.

## Minimal diff

- Existing report selects campaign/metadata and actual entity marker fields;
  `category` corrected to the actual `category_slug` column so entity resolution
  does not silently return an empty result after a failed query.
- Report-local pure classifier excludes E2E/admin_test/smoke/repair/fixtures,
  simulations, explicit bots and QA entities, unresolved or conflicting links.
  No attribution is created. Missing human/bot evidence remains `not_verified`.
- `11_clicked` counts commercial **linked clicked links**, not humans. Additive
  `tracking_metrics` separates raw links/clicks, attributed commercial clicks,
  clicked links and exclusions; explicitly lifetime scope.
- `16_payment_succeeded` is 0 with `verification_status=not_verified` and an
  explicit missing-evidence reason. Raw status candidates remain separate.
  No billing status, UI success, TEST session, subscription, refund or discounted
  payment is promoted to a sale. No new revenue engine or webhook changes.
- Critical classification query failures return an explicit error, not a false
  verified zero. Other historical funnel stages remain outside this targeted fix;
  their raw counts must not be interpreted as verified sales or eligibility.

## Verification and boundaries

`bunx vitest run src/test/funnel-audit-indicator-truth.test.ts
src/test/sms-event-attribution-staged.test.ts
src/test/acq-e2e-real-honesty.test.ts`: **45/45 passed** (22 targeted).
`git diff --check`: passed. Full CI and hosted corrected endpoint not verified.
Automatic compilation status is checked separately; no manual app build.

No remote writes, migrations, provider calls, Checkout/payment, sending, queue
activation, switch changes or deployment/publication. Existing Stripe/SMS/PROMO
fixes and concurrent generated public assets remain untouched. Production still
uses the previous function until a separately authorized deployment.

Source baseline: `a24d4b692aeed918f190eb799763b7765a72ae0f`; source verification
passed. The final change revision is managed by Lovable and must be read after
the change is committed; no invented final commit or release proof.