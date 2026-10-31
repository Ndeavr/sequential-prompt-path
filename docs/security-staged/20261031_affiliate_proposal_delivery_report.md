# Affiliate proposals — hosted delivery

## Applied
- Migration `drizzle/migrations/0032_affiliate_proposal_guarded_drafts.sql`: nullable bearer column, assignment-checked draft/read RPC, exact-token context resolver, trigger rejecting direct client writes to the new draft version.
- Existing RLS policies, grants to third parties, historic rows and legacy resolver definition unchanged. No old candidate policy replacement applied.
- Existing `compute-pricing-quote` and `create-checkout-session` deployed successfully. Proposal context is server-resolved; affiliate-owner client creation refused; quote/prospect binding prevents checkout relabeling. No raw bearer saved in quote payload or public proposal payload. Existing pricing, taxes and payment evidence remain authoritative.
- Deployment source hashes: compute `c101a12ae79ac082d1a6442f214697319aa1f7879441d989d468b826278108bf`; checkout `f48a48ad180fda1df8df9322cd7e50fe1a357b41d7d96d211ec19b7b48f46fd1`.

## Preflight and integrity
- Current verified source at start: `bf511bf1a5de2d7000809b35b0353ad8f9b38668`; verify:source passed. No Git reset, merge or source restoration.
- Connected target identity checked against the project safety contract. Proposal count before/after release: zero.
- SQL definitions, ACL and policy snapshot saved privately and re-read byte-for-byte before application. Post-release original resolver SHA-256 stayed `b28277cc963b8c31156f132e5625d780bd06918ee5f90aef6527c822a1b300dd`.
- Local original Edge sources saved with distinct filenames and checksums. Hosted original Edge source retrieval was not exposed; these backups certify local pre-edit source only, not byte-identical prior hosted deployment.
- Reversal can revoke the two new RPC execution grants and restore the two saved Edge sources; leave nullable column and saved rows intact. No rollback executed. Any reversal requires a fresh live-state check.

## Checks actually run
- 29 affiliate SQL/offer/math tests passed: save/reload, same ID, client attribution, other affiliate/anonymous refusal, expiry, ignored payment inputs, blocked direct paid-state update, malformed fields.
- 65 server/payment regressions passed: five actual-handler synthetic attribution guards, checkout guards, commissions and isolated SQL/webhook/QA contracts. No provider requests.
- `deno check` both touched handlers passed.
- Preview harness latest log: build OK. No manual frontend build/typecheck.
- Hosted HTTP: anonymous draft call 401 permission denial (RPC present, not missing); malformed context token 400 `invalid_token`; quote malformed proposal 403 `invalid_proposal`; checkout anonymous 401.
- Real browser 390px, no interception or forged session: expired/invalid link shows actionable error, no page errors or document overflow; screenshot `/tmp/browser/affiliate-hosted/invalid-link.png`.

## Limits, not claimed success
- Hosted authenticated save/reload and inter-affiliate negative test have not run. Existing requester has no authorized QA session. The available read tool is SELECT-only/restricted; DML tool explicitly disallows authenticated RPC execution; migration tool accepts DDL, not test transactions/data seeding. No user session forged, unrelated account borrowed, or synthetic Auth rows inserted directly.
- Existing `e2e-create-test-contractor` is unauthenticated and creates confirmed production Auth users. It was not used as a QA bypass; no new test engine or permission widening was introduced.
- Next concrete validation: an authorized affiliate signs into preview, opens an assigned company, saves and refreshes the proposal; a separate authorized QA affiliate is needed for hosted cross-account denial. This validation does not require opening contact/payment gates.
- Stripe TEST checkout and paid/webhook confirmation unverified; no LIVE checkout, payment, SMS/email or frontend publication.

The frontend no longer depends on absent RPCs. Hosted save success is not certified solely from isolated tests or deployment.