## Prove the revenue gate: $1 payment → contractor activation → visible in matching

Objective: verify (with database evidence) that a paid contractor is immediately activated and returned by the matching engine. No new features — only a read-only end-to-end trace + one minimal safety patch if a gap is found.

### Phase A — Read-only audit (no code changes)
1. Trace `stripe-webhook/index.ts`: confirm every `checkout.session.completed` branch sets contractor `status='active'` (or equivalent flag consumed by matching) and inserts an `acquisition_events` row `event_type='paid'` then `'active'`.
2. Trace `match-waiting-demand` invocation from the same webhook branches: confirm it runs with the new `contractor_id`.
3. Trace the search/matching query used by homeowners (identify the exact SQL / view / RPC). Confirm the visibility predicate matches the flag(s) set in step 1 (e.g. `status='active' AND published=true AND plan_active=true`).
4. Run SQL against production data on the last 30 days: for every `contractors.status='active'` row, does it appear in the matching query for its `city × category`? Report gaps.

### Phase B — Live $1 E2E test (build mode)
Preconditions I need from you:
- Confirm `STRIPE_TEST_SECRET_KEY` + `STRIPE_TEST_WEBHOOK_SECRET` are set (else BLOCKED).
- A test contractor row (I'll seed one with a real category + city, no real contact info).

Steps executed:
1. Create Stripe test checkout session for the seed contractor with `unit_amount=100` (via existing `create-checkout-session` with a $1 override quote).
2. Complete the checkout using Stripe test card `4242 4242 4242 4242` (headless via Playwright).
3. Poll `stripe-webhook` execution: capture the exact row transitions in `contractors`, `contractor_subscriptions`, `acquisition_events`.
4. Immediately query the live matching endpoint/RPC with the contractor's `city × category` and assert the contractor is returned in `top_3_matches`.
5. Return a per-step PASS/FAIL table with row IDs, timestamps, before/after.

### Phase C — Only if Phase B reveals a gap
Ship the minimal patch that closes it (e.g. missing `published=true` set on activation, missing invalidation, missing plan flag). One targeted edit — no scope creep.

### Deliverable
A single report:
```
Stripe session       : cs_test_...
Contractor id        : ...
Before status        : ...
After status         : ...
Webhook events fired : [checkout.session.completed, ...]
Matching visible     : YES / NO
Gap identified       : none | <exact SQL/logic mismatch>
Patch applied        : none | <file:line diff summary>
```

### Out of scope (deliberately deferred)
- Resend domain verification (separate track — you must add & verify `mail.unpro.ca` in the connected Resend account; I can prep the DNS instructions but cannot verify inside Lovable).
- Deleting `ADMIN_EMAIL_ALLOWLIST*` secrets (safe to delete anytime — audit confirmed 0 revenue-path references).
- Real prospect SMS/email sends (blocked by Resend domain + Twilio real-mobile testing).

### Open question
Do you want me to seed a synthetic test contractor for Phase B, or use a specific existing contractor row (give me the id)?
