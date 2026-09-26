# UNPRO repository instructions

These instructions apply to the entire repository.

## Start every task with the durable context

1. Read [docs/UNPRO_CONTEXT.md](docs/UNPRO_CONTEXT.md).
2. If the task touches Supabase, data, Auth, Storage, cron jobs, secrets, deployment, or restoration, read [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md), then read `.codex-private/MIGRATION_STATUS.md` if that local untracked file exists.
3. Consult [docs/architecture.md](docs/architecture.md) and the linked architecture documents before changing a core model or domain boundary.
4. Inspect the current branch, working tree, and relevant recent changes. Preserve concurrent Lovable and user edits.

The user's current instruction and verified live state override these documents. Keep public documentation free of sensitive operational details; store those only in `.codex-private/`, which must remain untracked.

## Communication and autonomy

- Use the language of the user's current message; default to concise Canadian French for UNPRO product copy.
- Lead with the result, current state, or blocker. Distinguish verified facts from assumptions.
- Never say that something is live, deployed, restored, delivered, or successful without direct evidence.
- Complete safe, reversible work end to end and minimize interruptions.
- Ask the user only when credentials must be entered, a destructive or irreversible remote action is required, the exact remote target is uncertain, or a material business choice cannot be inferred safely.
- Never ask the user to paste a password, API key, access token, private URL, database dump, or personal customer data into chat.
- When blocked, preserve completed work, state the single blocker clearly, and give one exact next action.

## Product and architecture invariants

- UNPRO recommends one best contractor, or a tightly justified top three, rather than selling a shared lead to many contractors.
- `auth.users` is the identity source; `profiles` is the application profile layer.
- Keep contractors and other professional/business entities separate from profiles and link them through explicit IDs.
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
- Do not proactively solicit high-risk contractors. If they apply themselves, route them to enhanced verification and risk-based supervision.
- Isolated accusations in reviews are not proof. Prefer verifiable regulatory, insurance, licence, public-record, consistency, and UNPRO-history signals.

## Engineering workflow

- Stack: React 18, Vite, TypeScript, Tailwind, shadcn/ui, Supabase/Postgres/Edge Functions, Vitest, and Playwright.
- Search before editing. Reuse established utilities and design tokens.
- Prefer small, reviewable changes with explicit error propagation and fail-closed behavior for critical queries.
- Add or update tests for behavior changes and regressions.
- During iteration, run focused tests. Before handoff, run the relevant subset of:
  - `npm test`
  - `npm run typecheck`
  - `npm run lint:critical`
  - `npm run build`
- Report every check actually run and its result. Do not hide failures behind empty arrays, fallback success states, or vague summaries.
- Do not modify generated sitemap or corpus files manually when a repository script generates them.

## Remote data and migration safety

Treat every Supabase project as live infrastructure.

- Diagnostic requests are read-only unless the user explicitly asks for a change.
- Before any remote database write, verify the exact project identity, environment, connection host, target emptiness/expected state, authorization, rollback path, and backup integrity.
- Never restore into, modify, or test writes against the legacy/source project.
- Never bypass or weaken a target guard merely to make a migration proceed.
- Stop on the first unexpected SQL or access error. A failed guard means no write.
- Keep outbound email, SMS, calls, webhooks, cron jobs, queues, and other automations disabled during restoration and validation.
- Do not print, commit, or preserve plaintext secrets, signed access tokens, API keys, credentials, or personal data in logs.
- Do not read or display `.env` values unless the specific task requires one named value and the user authorized that access.
- A sanitized restoration copy may preserve Auth password hashes when explicitly approved, but must remove plaintext credentials and other operational secrets.
- After a migration milestone, update the local `.codex-private/MIGRATION_STATUS.md` with sanitized evidence, counts, checks, and the next safe action. Keep the public migration document generic and never include secrets.

## Source-of-truth discipline

- Treat [docs/UNPRO_CONTEXT.md](docs/UNPRO_CONTEXT.md) as durable product context, not as proof of current runtime state.
- Treat [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md) as the public safety contract. Treat a local `.codex-private/MIGRATION_STATUS.md`, when present, as an unverified handoff log that must be revalidated before remote writes.
- Prefer verified code, database metadata, provider delivery receipts, deployment status, and test output over historical chat claims.

- Prospect import (`import-contractors`) never overwrites an existing prospect: dedupe by google_place_id → E.164 → email → domain → name+city, admin/service only, `auto_send` defaults to false. Why: re-imports were resetting contacted prospects and could trigger sends.

- Contractor public state = generated column `contractors.public_status` (unpublished / published_pending_verification / verified_active = verified + admin_verified); Clara recommendations require verified_active; publishing auto-syncs `contractor_public_pages` via trigger. Why: publish right after payment without implying verification.
