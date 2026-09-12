# Supabase migration safety handoff

_This repository is public. Detailed migration state must remain in a local untracked file at `.codex-private/MIGRATION_STATUS.md`._

## Public status

No remote-write status can be inferred from this file.

Before continuing a restore, migration, or production-data task, retrieve the latest authorized context from the active/resumed Codex conversation or the local private handoff file, then independently revalidate it.

The default state is:

`NO_REMOTE_WRITE`

until every required guard passes in the same authenticated session that will perform the operation.

## Required guards

- Confirm the exact destination project and environment.
- Confirm the source/legacy project cannot be modified by the operation.
- Confirm the expected target state and explain any existing objects.
- Verify backup integrity without exposing its contents.
- Verify the actual database role and required permissions.
- Keep outbound email, SMS, calls, queues, webhooks, and cron jobs disabled.
- Scan and neutralize credentials, API keys, tokens, and signed URLs in a sanitized working copy.
- Preserve the original backup unchanged and outside Git.
- Stop on the first target mismatch, permission failure, or unexpected SQL error.
- Never weaken a guard merely to make the restore run.
- Record only sanitized errors and counts.

## Unambiguous status markers

Use these markers in the private handoff and sanitized logs:

- `PREFLIGHT_PASSED_READONLY`
- `RESTORE_STARTED`
- `FINAL_SUCCESS`
- `FINAL_STOP_<REASON>`
- `NO_REMOTE_WRITE`

A successful connection, an audit, a prepared script, or a monitoring heartbeat is not evidence that restoration started.

## Private handoff template

Keep the following fields in `.codex-private/MIGRATION_STATUS.md`:

- timestamp and operator/session;
- authorized scope;
- non-secret source and destination identifiers;
- backup filename, size, and checksum;
- tool versions;
- verified target state;
- approved sanitization categories and affected counts;
- automation/cron quarantine state;
- last command stage and sanitized result;
- whether any remote write occurred;
- next safe action;
- approvals still required.

Never include passwords, connection strings, secret values, raw personal records, Auth hashes, or signed URLs.
