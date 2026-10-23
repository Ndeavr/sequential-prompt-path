# Bounded commercial launch readiness

## Source and changes
- Starting editor HEAD: `282a8b717fa2ee0abc9d7f46cd3d5cd88fb72567`; last observed revision before final rendering patch: `b0694abc3c0be06dbf8bae5f06ea4d147b508bf1`. Final platform revision must be read separately.
- No branch merge/fetch/push, remote mutation, Stripe coupon, charge, campaign, publication or release-setting change requested.
- package-lock.json regenerated using npm, root Stripe 17.7.0 and package added. Existing package versions unchanged; only root existing package entry changed semantically. Platform serialization/reordering enlarges the textual diff; no hand-written integrity.
- Canonical Clara parser accepts CHOICE and CHOIX; persisted rendering shares it and restores final-message choices.
- create-checkout-session: explicit event callback type, created identity select matches existing identity lookup shape.
- stripe-webhook: PromiseLike rejection callback; remove redundant token properties already supplied by canonical attribution spread, preserving effective runtime values.
- Existing local QA harness updated to inject actual webhookAuth helpers, not bypass signature checks.
- AGENTS.md, roadmap.md, existing choice tests updated; this report added.

## Checks actually run
- npm install --package-lock-only --ignore-scripts: exit 0. Semantic comparison: zero existing version changes, new node_modules/stripe 17.7.0.
- npm ci --ignore-scripts in clean temporary package directory: exit 0, 965 packages. Lifecycle scripts intentionally not executed.
- Deno check checkout and webhook: initially six errors; after fixes exit 0.
- Six focused Vitest files: initially 16 failures (missing auth helper in test adapter plus parallel PGlite timeout); adapter repaired, sequential execution with 30s per test; final observed 53/53 pass, exit 0. No assertions weakened. These are local synthetic SQL/HMAC checks, not commercial hosted QA.
- Harness compilation latest observed 09:13:56 UTC: build OK. Manual frontend build/typecheck not executed under sandbox restrictions; standalone typecheck and latest GitHub CI remain unverified.
- Intercepted 390x844 browser final rerun: persisted marker hidden and Durabilité button visible, short review CAD40241, missing identity rejected, declared identity retained, login return stored with ref/UTM; exit 0, zero page errors and zero actual checkout requests. Screenshots inspected. Auth/login/payment hosted not exercised. Final two frontend test files rerun: 15/15 pass, exit 0 (subset of 53, not additional tests).
- LIVE Stripe endpoint read-only: enabled canonical webhook targets this commercial backend, configured for completed/async-success/refund/dispute; API version 2018-02-28. Enabled endpoint is not proof of valid deployed signature handling or receipt provisioning.
- Existing security results are stale: database scanner 83 error and 222 warning findings. Not a clean security result; no policies modified.

## Canonical purchase and release checklist
1. Base Clara activation → /entrepreneurs/activation-350?activate=1 → declared/owned company → login with saved return → entryActivation:true without quoteId. Monthly intake remains explicit appointments option only.
2. Verify current synchronized CI, standalone frontend typecheck, fresh security scan and current commercial deployed functions/schema. No old draft PR merge as substitute.
3. Owner confirms actual GST/QST registration and LIVE Stripe tax objects: exclusive 5% and 9.975%, CAD35000 + 1750 + 3491 = 40241. Exact LIVE tax objects/account capability and secret configuration not verified in this pass.
4. Verify commercial hosted auth return, success/cancel/reload and signed event readback, one ledger, 12 calendar months via canonical resolver, duplicate/pending protection, refund/dispute revocation and cross-account permissions. Sandbox proof does not establish these on commercial backend.
5. Verify paid profile stays private/pending verification, zero included appointments, licence eligibility separate. Keep suppression/opt-outs and outreach closed; no outbound smoke sends.
6. Only after all conditions: controlled source/function release and frontend publish, then separately authorized LIVE base checkout release. PROMO LIVE remains disabled/unprovisioned. No real charges performed by this audit.

- Final validation revision observed: `87662c91636e767d909942ca32809e2a4902eaa8`; harness build OK at 09:18:21 UTC, diff check exit 0. This evidence-only report update follows that revision.

**Decision: STOP before publish or LIVE gate. No first commercial sale established.**