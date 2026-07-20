## Autonomous Onboarding Orchestrator

Goal: move every contractor from **SCRAPED → LIVE** without manual steps, with self-healing retries, timestamped state history, and admin observability.

---

### 1. Data model (migration)

**`contractor_onboarding_states`** — one row per contractor, current state + metrics.
- `contractor_id` (FK), `state` (enum), `previous_state`, `confidence_score`, `readiness_score`, `next_action_at`, `retry_count`, `blocked_reason`, `stuck_since`, `activated_at`, `live_at`, timestamps.

**`contractor_onboarding_events`** — append-only timeline.
- `contractor_id`, `state`, `actor` (`system`|`user`|`admin`|`affiliate`), `duration_ms`, `retry_count`, `error`, `metadata`, `created_at`.

**Enum `onboarding_state`**: `SCRAPED, VALIDATING, CONTACTABLE, NEEDS_REVIEW, INVITED, LANDED, REGISTERING, OTP_VERIFIED, PAYMENT_COMPLETE, ACTIVATED, PROFILE_ENRICHMENT, VERIFIED, RECOMMENDATION_ELIGIBLE, LIVE, STUCK`.

RLS: authenticated read own; admin all; service_role all. GRANTs per project rule.

State machine defined in `src/lib/reliability/onboardingStateMachine.ts` (reuses `createStateMachine`).

---

### 2. Edge functions

- **`onboarding-orchestrator`** — cron every **10 min**. Scans contractors, dispatches each to the correct handler by state, writes timeline event + `reportOutcome`.
- **`onboarding-validate`** — SCRAPED → VALIDATING → CONTACTABLE / NEEDS_REVIEW. Normalizes name/phone (E.164)/email, dedupe (NEQ/phone/name), geocode, infer categories, queue RBQ/NEQ, fetch Google profile, compute `confidence_score`.
- **`onboarding-invite`** — CONTACTABLE → INVITED. Sends SMS + email via existing providers, records message IDs, retries transient failures with `withRetry`.
- **`onboarding-enrich`** — ACTIVATED → PROFILE_ENRICHMENT → VERIFIED. Background gather RBQ, NEQ, website, socials, Google reviews, hours, service areas, logo, photos. Flags uncertain data instead of blocking.
- **`onboarding-readiness`** — VERIFIED → RECOMMENDATION_ELIGIBLE / LIVE. Computes coverage + trust + completeness + demand match → `readiness_score` + gap list.
- **`onboarding-self-heal`** — hourly. Detects rows `stuck_since > threshold` per state (invitation undelivered, OTP >24 h, payment initiated incomplete, enrichment failed, verification timeout). Attempts recovery; on final failure, creates admin task or triggers affiliate assignment (reuse `affiliate_assignments`).

Existing wired handlers:
- Landing / registration / OTP / payment paths call a shared client helper `advanceOnboarding(contractorId, toState, metadata)` — no new frontend flows, only event hooks. Registration form save-per-field already exists → we just emit `REGISTERING` progress.

pg_cron:
- `*/10 * * * *` → `onboarding-orchestrator`
- `0 * * * *` → `onboarding-self-heal`

---

### 3. Frontend

- `src/features/onboardingOrchestrator/` — types, `advanceOnboarding` client helper, `useContractorTimeline(contractorId)` hook.
- `TimelineCard` — vertical checklist per the spec (✓ Scraped … ✓ Live) with timestamp, duration, actor, retry count, error. Uses tokens (dark scope, `.text-readable*`).
- Admin page `/admin/onboarding-orchestrator`:
  - Global funnel counts per state.
  - Table of contractors filterable by state / stuck / needs_review.
  - Drawer with full `contractor_onboarding_events` timeline.
  - Actions: force retry, mark reviewed, escalate to affiliate.
- Add link in `src/admin/adminToolsRegistry.ts`.
- Existing War Room lead card gets a compact `OnboardingState` badge.

---

### 4. Reliability contract

Every handler:
- Uses `withRetry` for external calls.
- Calls `reportOutcome` with canonical `FailureCode` / `BlockReason` on every terminal path.
- Uses state machine `assertTransition` — never silent moves.
- Writes an event row for every transition (start + terminal).

---

### 5. Success criteria

- Contractor progresses without human input in the happy path.
- No row ever sits in an undefined state — `STUCK` is explicit with `blocked_reason`.
- `/admin/onboarding-orchestrator` shows every step with timestamp, actor, duration, retry, error.
- Self-heal recovers transient failures before creating admin tasks.
- Affiliate escalation only after automated retries exhausted.

---

### Technical notes

- Reuse existing tables where possible: `contractor_leads`, `contractor_activation_funnel`, `contractor_activation_events`, `contractor_funnel_events`, `contractor_followup_queue`, `affiliate_assignments`. Do not duplicate — new tables only store **orchestration state + append-only timeline**.
- Registration OTP + payment flows already exist; orchestrator subscribes via triggers on `contractor_activation_funnel` / Stripe webhooks (edge already fires `stripe_payment_success`).
- Trigger `after_insert` on `contractor_leads` seeds a row in `contractor_onboarding_states` with `state='SCRAPED'`.
- All timestamps `timestamptz` UTC; UI renders via `formatQcDateTime` (America/Toronto).