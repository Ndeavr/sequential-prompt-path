# UNPRO GOLD — implementation and release boundary

## State
Source implementation only. No hosted migration, configuration update, payment, number assignment, deployment, outreach or publication was performed.
Read-only production inspection found no GOLD membership table. The pilot public profile matched the exact slug, business name and official domain, but its activation was not ready and public verification was pending. No payment was inferred. No customer identifier is stored here.

## Implementation
- `migration.sql`: three tables with grants/RLS, immutable membership/audit, a transaction advisory lock and bounded 1–1000 allocation. Number 1 is held only for a server-configured, identity-verified pilot; ordinary allocation uses unassigned 2–1000. Rows including refunded numbers are never deleted or reused.
- Uses existing signed webhook event + entry-payment ledger + verified contractor activation, not a redirect, client amount or admin award button. Triggers cover payment completion, delayed verification, replay and refund/dispute. No Edge Function changes or duplicate worker.
- Public membership table contains only contractor reference, number, status and dates. Anon reads active publicly verified memberships only; owner/admin read their permitted states. Private payment-ledger references stay in the admin-only audit. Client writes and allocation RPC are denied.
- Real availability excludes all assigned numbers, including refunds, and the unassigned pilot reservation. Draft/uninstalled state returns no numeric claim.
- GOLD badge and Since tag share the existing public summary and phone preview. Since uses only canonical `unpro_registered_at`, Toronto month/year, never imported `created_at`.
- Existing dashboard, checkout review and admin detail use GoldPanel; admin history is read-only. Active members can download an HTML certificate linked to current profile status and copy a profile-linked iframe badge. Refund hides the active badge; the issued certificate remains historical and points to current status.
- Existing CAD350 + taxes / 12-month Presence / disclosed appointment entitlement, Stripe prices, licence badges and Clara ranking remain unchanged.

## Benefits not released
Early access, a separate founder showcase, feature consultation and strict-equality matching priority remain disabled configuration, not public promises. Ranking is deliberately unchanged until canonical equality can be validated. Renewal-equivalent protection (36 months) and referrals remain unpublished configuration without commercial terms. GOLD is not the 120-month AI Presence offer.

## Checks actually run
- 17 focused Vitest tests passed: PostgreSQL allocation/replay, TEST denial, delayed verification, refund/no reuse, immutability, duplicate paid sessions, unpaid/currency denial, draft counter, public column grants/RLS/owner/admin, limit 1000, number/date functions, existing profile regressions.
- An initial SQL alias ambiguity was caught and corrected, then the same tests passed.
- PGlite runs real staged PostgreSQL SQL but serializes queries: competing Promise calls are covered; independent-session PostgreSQL lock contention remains unverified.
- Intercepted real public route at 390px FR and 1280px EN: badge, real-date fixture, no horizontal overflow; embeddable mode rendered.
- Isolated phone fixture at 390px FR/EN: badge and edit handoff to `/pro/profile`, no page errors; certificate control invoked. Initial harness preamble failures were corrected without application changes. A real signed-in contractor, certificate download contents and clipboard readback were not verified.
- Automatic preview build log: build OK. No manual build/typecheck or broad suite.

## Next safe action / blockers
Complete target/backup-integrity preflight, then apply this exact SQL via the migration tool. Revalidate the exact pilot identity privately and configure its ID server-side before switching GOLD config from draft to active; do not backfill or manually assign a number. Verify independent-session concurrency and hosted public/owner/admin RLS in an isolated environment before release. No LIVE payment is authorized as a test. Until installation, UI shows unavailable membership/availability instead of fabricated GOLD or counts.
