# UNPRO — Git reconciliation and first CA$350 activation gate (2026-10-27)

## Scope and provenance
Read-only Lovable project `ba1eabf3-fd1c-40fe-9856-3812a70f9869`, GitHub `Ndeavr/sequential-prompt-path`, Lovable-linked production database (SELECT-only), and the connected `unpro.ca` Stripe LIVE account (GET-only). No Lovable AI message/credits, deploy, publish, schema change, production write, customer contact or payment creation.

- Lovable current revision at inspection: `2a8adf9c3764c9e718f8b89a0f3740704b797cbf`.
- GitHub compare `2a8adf9...main`: `main` is **54 commits ahead, zero behind**, with the Lovable revision as merge base. No divergent histories, no force-push, reset or file overwrite required.
- Safety branch `audit/entry350-safe-reconciliation-20261027` created from current `main`. Only the two checkout files and this audit were changed on that branch. Default `main`, the Lovable editor and production were not modified.

## Authoritative payment evidence — read only
- Lovable production DB: `public.contractor_activation_ledger` contains **one** `entry_activation_350_paid` record, created 2026-10-12, with **no `metadata.livemode=true`**. Historical test activity is not first commercial revenue.
- Canonical `public.stripe_webhook_events`: **14** processed `checkout.session.completed` events marked `livemode=false`, most recent 2026-10-12. Four later `livemode=true` `customer.subscription.updated` events do not certify a CA$350 entry purchase. Old `livemode=null` records are not proof either.
- `public.unpro_payment_activation_audit` and `public.unpro_stripe_webhook_events` had **zero accessible rows** at inspection; those reporting journals alone are not authoritative proof of all account revenue.
- `public.billing_checkout_sessions`: **17** old CAD `open/unpaid` rows, most recent 2026-09-16; none recorded `amount_total=40241`. Their status is not evidence of a paid activation.
- Connected Stripe `unpro.ca` **LIVE** API GET `/v1/payment_intents?limit=100`: returned **91** intents, `has_more=false`; **no successful 35000/40241-cent** PaymentIntent. The visible successes were historic 100-cent intents. Do not infer every possible legacy cash receipt or refund from PaymentIntent metadata alone. **First genuine 350-dollar activation not verified.**

## Specific revenue-flow issue and isolated fix
- Existing `src/components/entrepreneur/Entry350FastCheckout.tsx` waited unboundedly for `logFunnelEvent()` to finish *after* a valid server-generated Stripe URL was received and *before* calling `redirectToCheckout()`. The logger performs remote Auth/database operations. A hung or slow analytics call could keep a real buyer from checkout.
- Isolated branch fix: race that best-effort analytics operation against a **500-ms maximum wait**, then navigate regardless. Server-generated URL, subscription-free CA$350 amount, tax logic, attribution, and webhook-only activation remain unchanged.
- Regression contract added to `src/test/contractor-paid-attribution.test.ts`. GitHub read-back confirms exact changes and `main...branch` shows only scoped files. **New automated test/build execution is not attested.** Existing historic reports of local tests do not count as tests of this patch.
- Limit: navigation may interrupt pending client-side telemetry; checkout creation remains server-side and no checkout-start event can ever constitute collected revenue.

## Remaining first-revenue release gates
1. Reproduce the complete existing direct and invited contractor journeys with **two synthetic identities** in a truly isolated QA stack: Clara/landing -> contractor auth/resume -> server checkout creation -> test Stripe signed webhook -> ledger -> 12-calendar-month presence -> refresh/cancel/refund/dispute.
2. Check ownership and RLS (cross-account, expired token, invalid RBQ, failed tax or unavailable provider), idempotent payment retries, commission attribution, and that a return URL by itself cannot activate.
3. Validate actual Stripe LIVE configuration, GST/QST collection and registration applicability. Known amount contract when applicable: CA$350.00 + GST $17.50 + QST $34.91 = CA$402.41. The backend's default LIVE gate `ENTRY350_LIVE_CHECKOUT_RELEASED` is fail-closed; its current deployed secret value **was not readable or confirmed**.
4. Run targeted Vitest/typecheck/build and mobile browser E2E on the branch, with CI results recorded. Remote Supabase management connector denied access; the Lovable preview shares a production backend and is not isolated QA.
5. Only after verified gates and explicit owner release approval, deploy vetted code and allow a legitimate customer to purchase. Confirm first commercial activation using **successful LIVE Stripe payment + signed webhook + durable ledger + entitlement**, then proceed to the second.

**Current status:** codebase ancestry RECONCILED/VERIFIED, patch STAGED on isolated GitHub branch, source read-back VERIFIED, tests NOT RERUN, hosted E2E BLOCKED, publication/release OFF, real first CA$350 sale NOT VERIFIED.
