# Legacy agent queue — proposed reversible quarantine

Status: **proposal only; no remote UPDATE/DELETE, send, cron activation or deployment authorized.**

## Existing paths
- `agent-send-outreach/index.ts`: only direct table consumer; primary SMS, primary email and email fallback. Existing quota read/update is not an atomic message claim.
- `agent-generate-message/index.ts`: generating → draft/quarantined; unique non-null idempotency key protects generation only. Open-row read errors now fail closed.
- `agent-activation-dispatch/index.ts`: legacy pending creator; suspended before Checkout creation and insertion.
- `agent-pipeline-test` and `/admin` invoke these endpoints, not an alternative table consumer.
- `send-verified-batch` uses a different prospect cohort; it is not an agent queue reconciler.

## Implemented locally
An unconditional incident stop returns HTTP 423 before selection or mutation. Both final provider functions independently throw the same incident reason. No UI flag, metadata, founder override, fresh retry or green global score releases it. The shared commercial SMS sender now checks both existing switches.

This is **not** a completed one-message dispatch protocol: all sends from this queue are stopped. No new atomic send RPC or database migration is installed. Removing the stop is unsafe until both channels have verified transaction-scoped recipient/campaign/window claims, exact destination/body/campaign validation, CASL and suppression revalidation, durable replay protection and a provider-failure circuit breaker.

## Founder approval required before database quarantine
1. Capture a consistent, access-controlled snapshot of the exact proposed IDs and full rows, plus row count and checksum. Do not export PII into this public repository.
2. Dry-run the exact ID set, original statuses, retry fields and attribution; verify no fresh jobs or unrelated tables are included. Obtain explicit approval for that exact set.
3. In a bounded transaction, revalidate original versions and change only approved message statuses to existing `quarantined`, preserving body, ownership, timestamps, retries and priorities; record incident metadata without replacing existing metadata. Roll back on any mismatch.
4. Verify count/checksum and unchanged campaigns, attribution and provider receipts. Keep the server stop and cron posture unchanged.
5. Restoration restores snapshot fields for approved IDs only, with compare-and-swap checks; **never** directly restores an auto-dispatchable queue. Fresh, individually reviewed drafts must use the subsequently tested atomic claim protocol, not replay old pending rows.

## Read-only report query (no identifiers or content exposed)
```sql
SELECT channel, variant,
       coalesce(metadata->>'source', 'unrecorded') AS source,
       coalesce(metadata->>'campaign_id', metadata->>'campaign', 'unrecorded') AS campaign,
       count(*) AS rows,
       count(*) FILTER (WHERE idempotency_key IS NULL) AS missing_key,
       min(created_at) AS oldest, max(created_at) AS newest,
       count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS recent,
       count(*) FILTER (WHERE attempts > 0) AS retries
FROM public.agent_outreach_messages
WHERE status = 'pending'
GROUP BY 1, 2, 3, 4;
```

## QA limits
Provider-free tests execute actual handlers and both final emission boundaries, including a 5,698-row fixture, two concurrent workers, stale retries, missing CASL, unknown line types and a future green gate. They prove zero calls and zero DB mutations, not legal send eligibility or a live atomic dispatch. Provider-error fixture is unreachable by design; it is not a tested live failure-recovery workflow.