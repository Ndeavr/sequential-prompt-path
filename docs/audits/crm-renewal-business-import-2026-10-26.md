# Bounded CRM renewal / business import

Starting HEAD `6711d773a6e29b81711d19bc4703831a36e99288`; source verification passed, tree initially clean. Git is harness-managed: no fetch/merge/commit/PR operation. Required context and backend safety documents read. PR #39 untouched, not queried. No hosted reads/writes, provider calls, sends, Checkout/payment, migration, deployment, flags/cron/queue changes.

## Findings

- **#3 confirmed in source:** latest expiry/revocation rejects before `new_checkout`; direct INSERT lacks exact-prospect atomic rotation and a unique active-token constraint. No suitable renewal RPC found in repository; hosted inventory not queried. **Active CRM unchanged.**
- **#2 confirmed in source:** browser health test sends user JWT to service-only sender; daily self-test uses service credentials but defaults to an external personal recipient. Unless that recipient equals configured founderEmail, sender treats it as commercial and canonical gates/CASL block it. No hosted reproduction; no bypass or false green added.
- **#6 reproduced and fixed locally:** three synthetic failures demonstrated missing establishment mode on details, missing name/phone/site fields and cache collision between address/business mode. Business selection now preserves mode; server requests minimal business fields and separates cache keys. Address fields/ownership/origins/quotas unchanged. Connector already intentionally omits legacy collection types from New API primary-type filters; no protocol or rating/review-field expansion.
- **#9 not reproduced:** event and registered homeowner listener already exist; unchanged.
- **#10 not reproduced:** word boundaries/lawn exceptions already exist; 32 applicability and 4 role/RBQ tests pass; unchanged.

## Minimum blocked renewal plan — not implemented

`crm-renewal-fail-closed.patch` is an **unapplied** patch to the existing handler. It refuses `new_checkout` before mutations: explicit authenticated admin/manual requests return 423 with a French blocker; service/background requests return 403. This is a staged stop, not a working renewal feature.

1. Verify hosted RPC inventory read-only under separate authorization. If none exists, stage the minimum transactional RPC migration **outside automatic migration paths**; obtain separate approval before application.
2. Reuse `new_checkout` with explicit authenticated admin renewal intent, one exact UUID prospect, expected old-token identity and stable idempotency key. Actor must derive from JWT/roles, not body/source.
3. Lock exact prospect and all its tokens in one transaction. Establish canonical claim/paid/activated, opted-out/do_not_contact and suppression sources first; query errors or ambiguous state refuse renewal. Claimed/paid/activated/suppressed/currently active links cannot be replaced. Revocation requires an understood non-security reason; never override fraud or opt-out revocation.
4. Coordinate **all token writers and claim/payment paths** with the same serialization. A renewal-only lock cannot protect concurrent legacy INSERTs. Preserve verified campaign/affiliate/source attribution, not arbitrary request metadata.
5. Atomically supersede old eligible token, generate secure new token with exactly 30-day expiry, persist stable retry result and audit using existing storage. Audit failure rolls back. Same request returns recorded outcome; distinct concurrent requests cannot produce parallel valid tokens. Confirm existing resolver rejects old link. Do not add raw tokens to diagnostic logs.
6. Only after that RPC is proven, replace direct renewal INSERT with its call and update existing CRM French statuses for renewed/already-active/claimed/paid/suppressed/conflict; no false success. Renewal never creates Checkout/payment/rights or sends invitations. Any later invitation still passes canonical CASL, suppression and kill switches.
7. Test actual isolated transaction: expired/revoked/active/claimed/paid/activated/refusal/suppression, unauthorized/service/background/wrong identity, read/audit errors, retries and races with other writers and claims. No hosted release from mocks alone.

## Verification and limits

- Before business fix: 3 failures / 4 passes in existing address suite.
- After: **99/99** across six targeted suites: four-issues-address, p0-address-security, crm-recovery-message, rbq-applicability, four-issues-role-resume, outreach-resend-send-guard.
- Existing CRM suite extended, no duplicate test file. Staged tests reconstruct actual handler; prove unconditional refusal, zero writes/sends and concurrent refusal, **not working renewal or eligibility reads**. Paid/suppressed fixture labels do not establish hosted eligibility queries.
- Synthetic business UI typing/selection/details callback and intercepted endpoint contracts passed; no provider calls.
- `git diff --check` passed; harness `build OK` at 01:06:11 UTC. No separate manual TypeScript/build, mobile browser or hosted E2E run.

## Blockers

Renewal requires verified atomic RPC coordinating writers/claims; deliberately not repaired unsafely. Email health needs an authorized server internal-QA path and exact recipient validation, with genuine provider evidence; sender authorization/gates were not weakened. Hosted QA requires separately authorized isolated Auth/RLS/Edge and Stripe TEST setup. First payment requires that QA to prove signed paid CAD35000 subtotal + applicable tax, ownership, idempotency, 12-month rights/revocation and zero default appointments, followed by separate owner release authorization. Current hosted credential/gate status is unverified.