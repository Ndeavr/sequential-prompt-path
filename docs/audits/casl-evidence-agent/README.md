# Bounded pending-only first-party capture

## State
Implementation is staged outside active Edge directories. No deployment, production migration, evidence capture, schedule, or commercial action occurred.

The verified source checkout includes the current canonical revision. Existing observer, pinned TLS transport, categories, suppression checks, capture helper and human review are unchanged.

## Pipeline
- Proposed internal service-only action in the existing enrichment endpoint; the individual admin action remains unchanged.
- One private service-only ledger anchored to `contractor_prospects`; not the incompatible crawl-run FK or historical message queue.
- Atomic single-flight control lease; unique prospect/domain/phone; bounded discovery cursor; SKIP LOCKED claims.
- Hard 2 attempts/run and 20/day America/Toronto, including failed/crashed attempts; one retry after 24 hours.
- Exact canonical capture helper, with its evidence insertion routed to a lease-fenced atomic persistence transaction. Captured evidence and completed job are persisted together. No human signature or contact state is written.
- Source, quote, hash and observation date preserved. Unknown phone type stays unknown; known non-SMS types are excluded. Human consent is never inferred.
- Existing review screen receives ordinary canonical evidence rows automatically once released; no redesign required. Preview is bounded, read-only and makes no site requests.
- Proposed schedule is disabled. Existing Vault credential name exists, but usable credential authorization is not verified; no secret read or exposed.

## Verification
- 104 targeted Vitest tests passed across worker, existing capture, first-party observation and existing handler suites; new worker rerun 29/29.
- Staged worker Deno check passed.
- Real isolated PostgreSQL migration succeeded. SQL QA passed caps, repeated-claim cap, duplicate run lock, service-only grants, lease fencing, pending-only INSERT and 24-hour cooldown.
- Additional proposed-handler authentication tests are reported separately after execution.
- These are isolated checks, not production CI or hosted capture proof. Current production has zero company-website phone evidence; outreach/recruitment flags false and historical pending count unchanged.

## Release blocker
Repository safety contract requires independently verified backup integrity before any remote write. No verified backup/snapshot evidence is available in this task. Do not weaken this guard or automatically deploy the proposed module. Confirm a current recoverable Cloud backup, then apply the exact staged migration and deploy only the existing endpoint. Verify the private Vault credential matches that endpoint's service authorization without displaying its value; run one bounded real pending-only capture and inspect the exact row before activating the pilot schedule.

## Remaining hosted acceptance
Real PostgreSQL multi-connection crash/race QA beyond serialized fixtures, full original production trigger execution, fresh source revalidation at release, provider-free hosted pilot row readback and schedule trace remain unverified. No issue is closed on isolated tests.

## Rollback
Pause the new ledger control, unschedule only the new pilot job, restore only the previous enrichment endpoint revision. Preserve captured pending evidence, signatures and ledger audit history; no delete/reset of prospects or queues. The additive migration does not change existing schema objects.