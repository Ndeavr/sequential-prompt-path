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
- CASL machine rechecks reuse enrich-official-website and append observations in official_site_crawl_runs.summary; they never mutate consent/signatures/eligibility, and any machine policy is disabled by default. Why: publication observations are not legal consent.
- CASL first-party reads only run through pinnedPublicFetch (socket pinned to the validated public IP via custom lookup); caslFirstParty.read() fails closed with unpinned_transport for any other fetch, because a before/after DNS resolve does not control the dialed IP (rebinding/TOCTOU). Why: a blocked feature is preferable to SSRF.

See `supabase/AGENTS.md` (live-infrastructure safety, outreach caps, QA payments, contractor publication, funnel and 350 $ entitlement rules).
- Outreach SMS health reads delivered/callback evidence from canonical `sms_events_v2`; idle history never triggers webhook recreation. Why: account reachability and inactivity do not establish delivery or configuration failure.
- SMS attribution reconciliation stays in the existing SID-keyed RPC with locked missing-only updates; staged SQL remains outside automatic migrations until explicitly authorized. Why: prevent mixed identities and unintended production backfills.
- Funnel audit click classification stays local to the existing report, preserves raw counters and resolves explicit non-QA entity links; payment success fails closed without signed LIVE entry-contract, activation and refund evidence. Why: internal traffic and checkout statuses are not commercial conversions.
- No-deploy outreach QA corrections may be staged as patches outside active edge directories and tested against reconstructed existing handlers; mocks never release hosted gates. Why: preserve explicit production authorization and avoid duplicate engines.
- Verified-prospect phone enrichment must refuse other-owner collisions and identity replacement, preserve the unique index and report failed writes explicitly; no-release corrections stay staged. Why: official publication does not authorize reassignment or make failed enrichment successful.
- First-party phone capture uses the existing canonical prospect anchor and capture helper, never signs consent; batch previews keep candidate counts separate from unverified provider readiness. Why: domain publication and tier C do not establish lawful or technically deliverable SMS.

## Source-of-truth discipline

- Treat [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md) as the public safety contract. Treat a local `.codex-private/MIGRATION_STATUS.md`, when present, as an unverified handoff log that must be revalidated before remote writes.
- Prefer verified code, DB metadata, provider receipts and test output over chat history.

<!-- LOVABLE:BEGIN -->
- Verify the runtime route/component and public asset revision before user-facing edits; require targeted real-DOM mobile smoke tests and clean harness build/type output. Why: inactive-source checks cannot prove usability.
- The shared keyboard hook owns visible height/offset and field visibility; existing StickToBottom owns Clara following. Why: competing document/message scrolling clips controls and overrides manual reading.
<!-- LOVABLE:END -->
- Scout/Radar captures without contact or homeowner requests stay in `scout_captures` (dedupe_status=review); person↔company hypotheses live in `scout_entity_links` (inferred/pending/verified, no licence field) and become prospects only via admin `promote_link` after https-sourced verification. Why: an employee is never the employer and Radar never sends or invents.
- External email always goes through `outreach-resend-send` as commercial: service-role only, gate + sender-domain proof (exact domain verified via /domains, or fresh owner-approved `RESEND_DOMAIN_PROOF`; 401 = unknown) + postal address + suppression (incl. `suppressed_emails`) + human-reviewed CASL + atomic `claim_outreach_email`; provider Idempotency-Key = claim key, success without provider id or network error = needs_review, never resent. Why: endpoint was callable without auth/consent and unknown provider states could double-send.
- CRM entry-activation emails reuse the server offer mirror for HTML and plain text, exact prospect-linked validated tokens and one recipient/campaign claim across recovery actions; delivered prospects are not re-invited. Why: avoid invented appointment entitlements, unsafe links and cross-action duplicate outreach.
- CRM token resolution is read-only; explicit renewal fails closed until an atomic contract coordinates every writer and claim. Why: independent token INSERTs cannot guarantee one active link per prospect.
- Public activation-profile resolution and claim both require the exact stored, unrevoked, unexpired token; never expand prefixes. Why: a prefix must neither disclose a complete bearer token nor render a profile that exact claim cannot accept.
- Claim/payment separation patches remain outside active Edge directories while deployment is forbidden; synthetic tests reconstruct the proposed handler without granting payment rights. Why: managed Edge edits auto-deploy and claim ownership is not Stripe evidence.
- `acquisition-discovery-cycle` requires service/admin auth for every call and is fail-closed on `recruitment_controls` (global_enabled AND autonomous_enqueue_enabled) via `_shared/recruitmentLocks.ts`, before any external call, run insert or import; trigger_source is derived from auth (`resolveTriggerSource`), never from the client body alone. Why: the 6h cron spent Google Places calls and queued prospects while recruitment locks were off, and runs were misrecorded as 'manual'.
- Cron HTTP diagnostics remain offline and correlate the exact pg_net request/response ID; enqueue or cron success never proves HTTP or business success. Why: SQL scheduling can succeed while the edge returns 401; credential/cron operations require separate owner approval.
- Admin Stripe trace diagnostics use SELECT-only counts from existing journals and never certify revenue; historical funnel counts remain explicitly unverified. Why: availability, TEST events and internal stages cannot establish settled, unreversed LIVE activation payments.
- `twilio-status-v2` accepts only form-encoded callbacks with a valid X-Twilio-Signature over the public URL (SUPABASE_URL/functions/v1/twilio-status-v2 + query) plus the callback token; updates only pre-existing SIDs monotonically, unknown SIDs are ignored without writes. Why: the query token alone could forge delivered receipts if the URL leaked.
