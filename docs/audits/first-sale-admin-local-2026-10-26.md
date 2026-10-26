# First-sale admin P0 — local only

## Scope and source
- Initial verified HEAD: `266cb1f33167ba708e418f4247a76b281bca2be8`; `npm run verify:source` passed. Lovable manages commits; no fetch, merge, push or PR mutation was performed.
- PR #39 read through GitHub's public read-only API/diff: open, draft, unmerged; head `707a21266f8c7879a13648c4fe64e5f57d0b73af`, base `28ba13c7d8e0178f93654bd74b4a5123e1745802`. PR untouched. Its SELECT-only approach was reconciled against current source, not its stale base.
- Existing generated `public/llms-full.txt` and `public/sitemap.xml` changes were preserved, not edited by this task. Three-universe and cron safety code untouched.

## Verified defects and fixes
- FirstRevenueTracker already displayed unavailable revenue at current HEAD. No fabricated revenue arithmetic remained. Remaining defect: historical activations/plans were labelled as paid/350 activations, and missing data could imply a 48-hour failure. Labels now explicitly unverified; unavailable history is distinct from loading; no absent-sale claim from missing data.
- PanelRealStripeValidation still invoked mutating checkout/activation functions and inserted a diagnostic row. Replaced with three parallel SELECT-only count reads against existing admin journals: `unpro_payment_activation_audit`, `unpro_stripe_webhook_events`, `billing_checkout_sessions`.
- Accessible records never mean verified payment. Errors, thrown reads and missing/invalid counts fail closed. No INSERT/update/delete/upsert/RPC/edge invocation, no green payment certification. Existing RLS/privileges unchanged; RLS-filtered zero is only accessible traces, never proof of globally absent payments.
- No authoritative complete settled-LIVE/refund reconciliation source is wired into this tracker; collected and recurring revenue stay unavailable, with no estimate.

## Local evidence
- First run: 127 tests passed, one diagnostic suite failed to parse after extracting the PR hunk. Corrected missing trailing JSX and stray diff-header text; reran full focused selection.
- Final selection: **145 passed, 0 failed, 12 suites**: diagnostics (11), existing revenue truth, paid collection, presence resolver, webhook confirmation, isolated QA, payment returns, checkout guards, activation UI, webhook auth, tax parity, activation links.
- Additional bounded checks: **47 passed, 0 failed, 4 suites**: contractor auth handoff (3), direct-close contract (3), sender guard (23), legacy hard stop (18).
- Total final focused evidence: **192 passed, 0 failed, 16 suites**. A nonexistent fast-checkout test path in the invocation matched no file; no claimed coverage from it.
- `git diff --check` passed. Automatic harness latest entry at `2026-10-26T00:10:23Z`: `build OK`, replacing earlier syntax/typecheck failures. No standalone manual build/typecheck was run (harness owns these checks). No Deno code changed or Deno check run.

## Existing activation flow — source/local fixtures only
- No demonstrated blocking checkout defect found; checkout, webhook and entitlement code unchanged.
- Captured ref and query survive direct activation/login handoff; base one-time review states zero appointments. Tax fixture verifies 35000 + 1750 + 3491 = 40241 cents when applicable.
- Existing isolated QA executes real creation handlers and signed-HMAC webhook simulation with in-memory Postgres, not hosted APIs. It tests personal and invited successes, TEST exclusion from commercial rights, ownership/anonymous RLS, unpaid/free/wrong amount/currency/mode, webhook absence/bad signature, replay recovery, earliest 12-calendar-month expiry, refund and dispute revocation. URL success alone does not activate.
- Existing sender synthetic tests verify auth, human-reviewed CASL absence, suppression, OFF gates, unsubscribe and atomic claims without real provider calls. Legacy queue handler and both provider boundaries remain hard-stopped, even with a green gate. No complete invite→Clara→login→checkout mobile E2E or fresh hosted licence/phone/compliance verification was performed.

## Remaining gates and next step
- Hosted isolated authenticated Stripe TEST end-to-end QA remains separately authorized and unavailable in this turn; preview shares the production backend, so no hosted fixture writes/browser payment simulation attempted.
- Before any real activation: verify hosted auth/resume, Stripe configuration and applicable tax registrations, signed delivery/ledger/rights and revocation in isolated QA; obtain separate deployment/release authorization. Local fixtures cannot open the LIVE gate or establish a sale.
- No production DB reads/writes in this turn, no secrets accessed, no flags/cron/permissions changed, no checkout created remotely, no paid API, no real payment, no sending, no scheduling, no deployment/publication. Production state is not freshly attested.

## Changed files
- `src/components/admin/outreach/FirstRevenueTracker.tsx`
- `src/components/go-live/verification/PanelRealStripeValidation.tsx`
- `src/__tests__/stripeDiagnosticsReadOnly.test.tsx` (PR #39's existing proposed test path reused; no second diagnostic test file)
- `AGENTS.md`, `roadmap.md`, this report.

Commit SHA is supplied from the final Lovable-managed source revision in the closing response; no manual Git commit is made.