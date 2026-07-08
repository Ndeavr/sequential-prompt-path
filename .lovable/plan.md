## What's happening

You're getting the "UNPRO Live Email Health Check" email twice every 15 min because two cron jobs are firing the same live-test path.

- `supabase/functions/email-health-selfheal/index.ts` — header comment says "runs full health probe + live send… every 15 min" — invokes `email-live-test` which produces the exact subject "UNPRO Live Email Health Check".
- `email-live-test` is also scheduled directly by a second cron entry hitting the same */15 slot.

Both jobs land on `:00 / :15 / :30 / :45`, so at every quarter-hour two identical emails arrive (matches your 18:45 / 18:45 pair in the screenshot).

## Fix

Two changes, both in a single migration:

1. **Unschedule the duplicates.** Drop every cron job whose command references `email-live-test` or `email-health-selfheal` (idempotent `cron.unschedule(...)` loop over `cron.job` filtered by `command ILIKE '%email-live-test%' OR command ILIKE '%email-health-selfheal%'`).
2. **Reschedule a single hourly probe** — one job named `email-live-health-hourly` running `0 * * * *` (once/hour on the hour) calling `email-health-selfheal`. Keeps monitoring alive, drops volume from 96/day to 24/day, guarantees no dupes.

Also flip the header comment in `email-health-selfheal/index.ts` from "every 15 min" → "every hour" so future readers don't reintroduce the 15-min cadence.

## Out of scope

- No change to `email-daily-selftest` (different subject, runs daily — leave it).
- No change to the send pipeline, `email-live-test` payload, or the admin Email Health page.
- No change to any other cron job (autopilot, followup, watchdog, log retention).

## Success

- After the migration, `SELECT jobname, schedule FROM cron.job WHERE command ILIKE '%email-live%' OR command ILIKE '%selfheal%'` returns exactly one row on `0 * * * *`.
- Your inbox gets one "UNPRO Live Email Health Check" per hour, never two.
