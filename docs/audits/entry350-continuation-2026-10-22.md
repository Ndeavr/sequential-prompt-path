# Entry350 — targeted continuation, 22 October 2026

## Source and scope

- Initial HEAD: `f4722afed1043c82f26ee8237cbf284fd2241866`; source verification exit 0. The user's earlier SHA was not current editor HEAD.
- Code/test revision verified after patch: `a68847e89b96e28c3e0db51253bf693070f2e4c4`; final documentation revision may differ.
- Preserved homepage, PR #28, outreach stop, campaigns, database and secrets. No deployment, publication, provider request, payment or remote event.

## Proven defect and bounded repair

The existing entry350 branch called Stripe Checkout creation without a request idempotency key. Two identical pre-payment calls created two payable sessions in the isolated adapter. Regression first failed with two distinct session IDs: **exit 1**.

The same branch now hashes its complete server-built Checkout contract, scoped to contractor and TEST/LIVE mode, and supplies that key to Stripe. Identical retries reuse one session under Stripe's key contract. Changed redirects, quotes or attribution intentionally produce different keys; this is NOT a universal one-session-per-contractor lock. Provider retention, true parallel provider behavior and expired-session recovery remain unverified. Existing paid-event and already-active guards remain intact.

Files: `supabase/functions/create-checkout-session/index.ts`, `src/test/support/entry350Qa.ts`, `src/test/entry-350-qa-isolation.test.ts`, root architecture rule, roadmap and this report.

Rejected false diagnosis: `planReturnUrl()` already appends `{CHECKOUT_SESSION_ID}` and removes stale IDs. No speculative return-URL patch was made.

## Checks actually performed

- Before patch: 72 existing tests passed, exit 0.
- Reproduction: one new retry test failed, exit 1; no provider network.
- After patch: **105/105 tests in 11 files, exit 0**. Includes entry350 SQL/session isolation, tax parity, signed local webhook, refund/dispute, expiry, return guards, auth handoff, homepage/Clara transition and backlog hard stop.
- `git diff --check`: exit 0. Automatic compilation log: `build OK`, 19:46:50 UTC. No manual build exit code claimed.
- Standalone typecheck: **not executed**; sandbox forbids manual project typechecks, and automatic standalone type output is unavailable. No claim that this verification is closed.
- Browser first attempt: exit 1 (expected French heading, browser selected English; captured intake before loading completed). Retried with French locale and loading delay: exit 0, no page errors, 390px screenshots inspected. Homepage title/greeting/composer visible. Landing CTA preserves `LORRAINE-UNPRO` and reaches qualification step 1. All external requests intercepted; video/provider lookup not verified. Earlier 360/430/1280/device/voice checks were not rerun.

## Journey evidence and blockers

1. Landing → qualification: real local router and DOM checked through step 1 only. Auth handoff and Checkout return are unit-tested, not a full browser payment journey.
2. Clara → contractor: existing transition tests passed and current destinations inspected; real AI/voice qualification, authenticated Checkout and UI confirmation/reload NOT exercised.

The two-account local SQL/HMAC harness exercises personalized and invited payment handlers through signed simulated delivery, canonical 12-month resolver and retries. These are two backend circuits, NOT proof of both requested frontend journeys. Synthetic `livemode=true` fixtures are confined to an ephemeral database to test the LIVE-only entitlement rule; no LIVE Stripe activity occurred. TEST events on non-QA accounts do not grant production rights.

Tax fixtures: base 35000 cents, TPS 1750, TVQ 3491, total 40241. Actual registration/legal applicability and hosted release settings were not reread or changed. No appointment volume invented.

First real activation remains blocked by absent safe full-stack isolated hosted QA and release authorization. Existing fail-closed LIVE release gate remains in code; remote gate/Stripe TEST endpoint configuration was not freshly audited this turn. Next action: provide an isolated QA environment with current Auth/RLS/router and correct TEST webhook destination, then run both user journeys through confirmation/reload before requesting release approval.

**Implemented:** identical-request provider idempotency. **Tested:** isolated regressions and bounded mobile UI. **Not verified:** hosted E2E, standalone types, physical keyboard, live AI/voice. **Published/deployed:** no. **Revenue/payment/sends:** zero this turn.