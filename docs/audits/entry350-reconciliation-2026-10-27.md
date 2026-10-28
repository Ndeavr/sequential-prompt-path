# UNPRO — Safe source reconciliation and entry-350 checkout review

## Source ancestry (2026-10-27/28)
- Lovable source commit at initial inspection was `2a8adf9c3764c9e718f8b89a0f3740704b797cbf`.
- Verified active integration branch is `lovable-sync`, and at the later check both `main` and `lovable-sync` identified `2ffb26d7c904911eeb8b786b2d838761293c7245`.
- The initial Lovable commit is an ancestor of the verified GitHub source. There was no divergent codebase to overwrite or force-merge.
- Safety branch `audit/entry350-safe-reconciliation-20261027` forks the current synchronized source. All changes remain review-only until merged and explicitly released.

## Checkout improvement
The existing `Entry350FastCheckout` awaited an optional remote analytics call **after receiving a valid server-issued Checkout URL** and **before redirecting**. Delayed telemetry could strand a paying customer. Bound the optional wait to 500 ms. Payment URL still comes from the server; no client payment success is generated. Add regression coverage for slow/failing telemetry and closed LIVE gate.

## Existing protections preserved
- One-time CA$350 baseline + applicable taxes. Server is authoritative for amounts, ownership, eligibility, and effective appointment entitlement shown before payment.
- Auth/login returns, referral attribution, provider idempotency, signed webhook, 12-calendar-month presence, revocation, and strict TEST/LIVE separation are not modified.
- LIVE gate `ENTRY350_LIVE_CHECKOUT_RELEASED` must remain closed until approved release.
- No change to consent, SMS/email dispatch, user records, database, live Stripe configuration or deployment.

## Verification and outstanding gates
- GitHub critical-path CI (full Vitest, TS typecheck, targeted lint, Vite build) on the initial isolated patch: **passed**. Check current PR head again after subsequent commits.
- Isolated PGlite/HMAC test suite already covers canonical backend scenarios but is not a hosted full-stack QA environment.
- Before authorizing first live sale: verify both synthetic account journeys, production-origin authentication/resume, TEST checkout and real signed TEST webhook in a truly isolated environment, account ownership/RLS, Stripe tax rate settings, refund/dispute, and explicit founder approval.
- Live production billing history was inspected only through read-only tools, without customer-level details stored in this public repository. The first commercial CA$350 activation remains **not verified**.

No production data writes, campaigns, billing operations, flags, publishing or deployment were performed by this review.
