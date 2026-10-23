# UNPRO repository instructions

Applies repo-wide.

<!-- LOVABLE:BEGIN -->
- Clara uses one bounded audience-history selector over canonical messages; role switches suspend workflows without rotating sessions. Why: preserve follow-ups without audience leakage.
- Public addresses reuse guest ownership and the existing quota RPC, explicit origins and minimal fields. Why: no open Google proxy.
- Active extraction calls share a server-only model selector and preserve endpoint/caps/modalities. Why: no silent price or protocol regression.
<!-- LOVABLE:END -->

## Canonical source and branch hygiene

- The production project is `ba1eabf3-fd1c-40fe-9856-3812a70f9869` in repository `Ndeavr/sequential-prompt-path`. Its active Lovable integration branch is `lovable-sync`.
- Before editing, fetch `origin/lovable-sync`, inspect the project's current commit and run `npm run verify:source`. Start feature branches from the verified active commit, never from a stale default branch.
- `main` is a fast-forward-only mirror of verified `lovable-sync` (never force-push or restore legacy trees); target PRs to `lovable-sync`, preserving concurrent Lovable edits.
- `lovable-sync-*` branches are historical snapshots; retire feature branches only after merge. A commit or inactive-source test is not proof of release: verify the deployed revision.

## Start every task with the durable context

1. Read [docs/UNPRO_CONTEXT.md](docs/UNPRO_CONTEXT.md).
2. If the task touches Supabase, data, Auth, Storage, cron jobs, secrets, deployment, or restoration, read [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md), then read `.codex-private/MIGRATION_STATUS.md` if that local untracked file exists.
3. Consult [docs/architecture.md](docs/architecture.md) and the linked architecture documents before changing a core model or domain boundary.
4. Inspect the current branch, working tree, and relevant recent changes. Preserve concurrent Lovable and user edits.

Current instructions and verified live state override these documents. Sensitive operational details go only in untracked `.codex-private/`.

## Communication and autonomy

- Use the language of the user's current message; default to concise Canadian French for UNPRO product copy.
- Lead with the result, current state, or blocker. Distinguish verified facts from assumptions.
- Never say that something is live, deployed, restored, delivered, or successful without direct evidence.
- Complete safe, reversible work end to end and minimize interruptions.
- Ask only for credentials, destructive/irreversible remote actions, an uncertain remote target, or a business choice that cannot be inferred.
- Never ask users to paste secrets, private URLs, dumps or customer data into chat.
- When blocked, preserve completed work, state the single blocker clearly, and give one exact next action.

## Product and architecture invariants

- UNPRO recommends one best contractor, or a tightly justified top three, rather than selling a shared lead to many contractors.
- `auth.users` is the identity source; `profiles` is the application profile layer.
- Business entities (contractors etc.) stay separate from profiles, linked by explicit IDs.
- Roles belong in `user_roles`, not in `profiles`.
- Property and document data are private by default. Public pages use deliberately public-safe views.
- Storage buckets are private by default; use short-lived signed access when required.
- Matching and eligibility truth lives in the backend. UI scores must not invent or override backend eligibility.
- Database migrations are the canonical schema source. Do not hand-edit generated Supabase types as a schema change.
- Do not create a parallel implementation when a canonical flow, table, edge function, or component already exists.

## Contractor eligibility and trust

- A required RBQ licence that is suspended, revoked, invalid, expired, or not verifiably active is a hard exclusion from homeowner recommendations.
- Compliance gates override reviews, awards, paid plans, reputation, and commercial pressure.
- Keep Contractor Risk Score separate from contractor quality/compatibility scoring.
- Never solicit high-risk contractors; self-applicants get enhanced verification.
- Isolated review accusations are not proof; prefer verifiable regulatory, licence, insurance and public-record signals.

## Engineering workflow

- Stack: React 18, Vite, TypeScript, Tailwind, shadcn/ui, Supabase/Postgres/Edge Functions, Vitest, and Playwright.
- Search before editing. Reuse established utilities and design tokens.
- Prefer small, reviewable changes with explicit error propagation and fail-closed behavior for critical queries.
- Add or update tests for behavior changes and regressions.
- Run focused tests while iterating; before handoff run the relevant subset of `npm test`, `npm run typecheck`, `npm run lint:critical`, `npm run build`.
- Report every check actually run and its result; never hide failures.
- Do not modify generated sitemap or corpus files manually when a repository script generates them.

## Remote data and backend rules

See `supabase/AGENTS.md` (live-infrastructure safety, outreach caps, QA payments, contractor publication, funnel and 350 $ entitlement rules).
- Outreach SMS health reads delivered/callback evidence from canonical `sms_events_v2`; idle history never triggers webhook recreation. Why: account reachability and inactivity do not establish delivery or configuration failure.
- SMS attribution reconciliation stays in the existing SID-keyed RPC with locked missing-only updates; staged SQL remains outside automatic migrations until explicitly authorized. Why: prevent mixed identities and unintended production backfills.

## Source-of-truth discipline

- Treat [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md) as the public safety contract. Treat a local `.codex-private/MIGRATION_STATUS.md`, when present, as an unverified handoff log that must be revalidated before remote writes.
- Prefer verified code, DB metadata, provider receipts and test output over chat history.

<!-- LOVABLE:BEGIN -->
- Verify the runtime route/component and public asset revision before user-facing edits; require targeted real-DOM mobile smoke tests and clean harness build/type output. Why: inactive-source checks cannot prove usability.
- The shared keyboard hook owns visible height/offset and field visibility; existing StickToBottom owns Clara following. Why: competing document/message scrolling clips controls and overrides manual reading.
<!-- LOVABLE:END -->
