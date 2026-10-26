# Issue #47 — local fail-closed CRM containment

## Verified scope

- Source check passed against `lovable-sync` ancestor `5e22df255178`; Lovable manages revisions. No Git mutation, PR or issue operation performed.
- The previously staged patch did not protect the called handler. The existing `new_checkout` branch could insert a second token when the latest token was active. Expired/revoked latest tokens failed earlier instead.
- Required root/backend instructions and context/migration safety documents read. Existing generated public corpus/sitemap edits preserved.
- No usable atomic renewal RPC established in repository; hosted RPC inventory not queried.

## Applied locally

- Existing `crm-recovery-action`: after exact service/admin authorization, before prospect reads, compliance calls, dry-run processing, audit writes or token resolution, `new_checkout` refuses authenticated admin/manual intent with HTTP 423 `atomic_token_renewal_unavailable`; service/automation intent gets 403. Anonymous requests remain 401.
- Removed the handler's token generator and direct token INSERT. Other link actions reuse only a stored token for the exact prospect; missing token returns per-row failure `atomic_token_creation_unavailable` before any sender call. Existing failure audit behavior remains.
- No link revoked, extended, replaced or reassigned. Existing active-token resume behavior and attribution lookup preserved. No successful renewal claimed. The historical staged patch remains historical, not the test target.

## Writer/claim inventory and limits

- `crm-recovery-action` was a direct creator; now read-only token resolution.
- **Other direct creator:** `send-verified-batch/index.ts`, `ensureActivationLink`, inserts a freshly generated token with campaign/agent attribution. Unchanged in this surgical CRM task. This prevents any claim of database-wide uniqueness or safe release of the send path.
- `activation-claim/index.ts` reads exact/prefix tokens and separately updates `claimed_at`/`claimed_by`; that update is non-blocking and not serialized with renewal. Unchanged.
- SQL `activate_my_contractor_account` is an activation function, not a token-rotation RPC; no shared renewal lock established.
- `activation-token-resolve` reads tokens and updates open/click telemetry; `activation-goals`, `create-checkout-session`, `create-activation-checkout`, `second-touch-outreach` read token/prospect context. Their behavior and gates are unchanged.
- Token schema/index/policy migrations and generated types do not establish one active token per prospect in this source audit. No migration prepared/applied by this task.
- The guard is deliberately unconditional: opt-out, paid, activated, claimed, expired, revoked and missing-token fixtures all fail before eligibility reads. Tests do not establish hosted paid/suppression queries or a functioning renewal transaction.

## Focused verification

- `bunx vitest run src/test/crm-recovery-message.test.ts`: 46 passed, 0 failed, one suite. Actual active handler transpiled with synthetic database/auth/provider adapters; no staged patch injection.
- Two simultaneous admin calls both return 423 with zero mutations, gates or provider calls; admin automation and dry run cannot bypass.
- Exact prospect/token resume preserved without token mutation; missing-token email/resume actions fail without implicit creation; closed commercial gate prevents token resolution/provider calls.
- Existing canonical email offer assertions retained: CAD35000 base, applicable Quebec tax total CAD40241, zero default appointments. No payment code changed.
- `git diff --check` passed; automatic harness reports build OK. No standalone manual TypeScript/build or hosted/Deno runtime certification.

## Remaining blocker / next safe action

Working renewal requires an independently verified atomic contract shared by all token creators and claim/payment paths, exact prospect lock, immutable attribution, eligibility and replay handling. Authorize isolated verification separately before replacing this stop. Hosted deployment/QA and first-payment release remain separately gated; local mocks do not open them.

No hosted reads/writes, token issuance, SMS/email, Checkout/payment, paid API, migration, deployment, publication, flag/cron/queue change. PR #39 and issue #45 untouched; no fresh claim about their remote status. Existing links and historical queue preserved.