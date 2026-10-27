# Issue #56 — local-only prospect phone collision correction

## Proven cause

Inspected explicit commit `c47d5382d90377e4f844361085d0df6da6934763`; its enrichment handler SHA-256 is `9ab737602551e9e25ecf3c9d156beff26a69804815626a5d52e83a052bb4033c`. The handler assigns the first extracted phone to `verified_contractor_prospects` without checking another owner, logs a failed update and returns `ok:true`. Migration `20260715015702_17a8da65-bb00-4c10-a54d-5e6ea6139e51.sql` defines the exact unique index `verified_prospects_phone_uk` on non-null `phone_e164` in that table. This proves the failure category in isolation; the specific historical company pair was not queried remotely.

No local #56 correction was found at initial inspection. The background reviewer used a separate checkout and cannot establish whether an external GitHub agent is active. Concurrent source commits occurred during this pass; the staged-patch regression rejects changed handler contexts rather than silently applying to stale source.

## Proposed diff — not deployed

`issue-56-prospect-phone-collision.patch` modifies only the existing handler. It remains outside active Edge directories because those deploy automatically.

- Refuse a different existing phone rather than replace identity automatically.
- Check the exact candidate phone against other IDs in the same verified-prospect table; failed lookup stops the update.
- Keep the unique index authoritative for simultaneous competing assignments; every 23505 returns a sanitized generic uniqueness collision (not a falsely specific phone claim).
- Compare-and-set the previous phone, requiring exactly one updated row; concurrent changes fail closed.
- Return HTTP 409 / `ok:false` / `needs_review` for collisions, HTTP 503 for lookup/update errors. Do not return phone numbers or database error details in these failures.
- Crawl evidence written before the refused update remains independent. No merge, reassignment, consent approval, affiliate update, suppression change or sending. The separate `capture_phone_casl` branch is unchanged.

This is not a transaction over all enrichment fields, does not reconcile existing duplicates and does not grant commercial eligibility. Successful existing verification behavior is not redesigned.

## Validation

- First run: 12/13 passed; the synthetic adapter omitted the real Zod schema. Fixed only the adapter, then used the actual schema and valid synthetic UUID.
- Final focused run: **51/51 passed** across new issue-56 handler tests (9), existing admin handler tests (4), and phone-evidence/batch tests (38).
- Tests reconstruct the real handler with the staged diff, execute it with synthetic database responses and model the unique index plus a two-preflight concurrency barrier. No hosted database or external provider was called; real PostgreSQL concurrency remains unverified.
- `git diff --check`: passed. Automatic preview log: build OK at 2026-10-27 01:25:15 UTC. No manual build/typecheck.
- No active Edge edits, deployment, publication, remote database request/write, SMS/email, Stripe/OTP, queue, cron or gate action.

Separate release authorization and isolated hosted verification are required before this correction affects production. Ticket #56 remains open.