# Growth Engine — Live Monitor & Truth Audit

Goal: stop reporting "success" when nothing was actually sent. Make the real state of every agent visible in one place, with a hard rule: `sms_sent = 0 AND email_sent = 0 → BLOCKED`.

## 1. New tables (migration)

**`growth_agent_logs`** — one row per agent execution
- `agent_name`, `job_id`, `status` (`running|success|partial|blocked|failed`)
- `input_count`, `processed_count`, `generated_count`, `sent_count`, `failed_count`
- `error_message`, `payload jsonb`, `started_at`, `completed_at`
- RLS: admin read, service_role write

**`outbound_messages`** — one row per real outbound attempt
- `contractor_id`, `channel` (`sms|email`), `recipient`, `message_body`
- `status` enum: `queued | generated | waiting_approval | approved | sending | sent | delivered | failed | blocked | replied | booked | activated`
- `provider_message_id`, `error_message`
- `sent_at`, `delivered_at`, `replied_at`
- RLS: admin read, service_role write
- Indexes on `(status, created_at)`, `(contractor_id)`

Backfill: wire existing `growth-outreach-agent`, `growth-expansion-agent`, `growth-task-dispatcher` to write to both tables. No more silent "completed" — they must record `sent_count` from the real Twilio/email response or mark `blocked`.

## 2. Instrumentation changes to existing edge functions

- `growth-expansion-agent`: insert `growth_agent_logs` row at start (`running`), update with counts at end. If Google Maps key missing → `blocked` with root cause.
- `growth-outreach-agent`: for every recipient, create `outbound_messages` row in `generated` → flip to `waiting_approval` (default) or `sending`. Only mark `sent` after Twilio/email provider returns a `provider_message_id`. On failure → `failed` + `error_message`. Update `growth_agent_logs.sent_count` from actual sent rows.
- `growth-task-dispatcher`: log every dispatch + result.

## 3. New edge function: `growth-health-check`
Returns JSON `{ component, status: WORKING|BLOCKED|PARTIAL, root_cause, affected, fix }[]` for:
1. Supabase connection (select 1)
2. Required edge functions deployed (probe each)
3. Twilio creds (`fetch_secrets` + verify_credentials gateway call)
4. Email provider creds (Lovable email domain status)
5. Gemini / Lovable AI key present
6. Quota limits (read `activation_quotas` + outbound caps)
7. RLS / GRANTs on the 4 growth tables + new 2
8. Cron jobs present (`pg_cron.job` for dispatcher + outreach)
9. Webhook delivery (last 24h `outbound_messages.delivered_at` ratio)
10. Contractors available (`contractors where status='active'` count)
11. Message templates available (Visibilité IA sequences active)

## 4. New page: `/admin/growth-live-monitor`

Sections (live, 10s refresh):
- **Status banner**: green only if `sent_count_today > 0`; otherwise red `BLOCKED — 0 messages sent`.
- **Agents running now**: from `growth_agent_logs where completed_at is null`.
- **Today's counters**: contractors contacted, SMS sent, emails sent, replies, bookings, activations, failures, blocked, waiting approval, quota remaining.
- **Last run per agent**: name, started_at, duration, status, counts.
- **Recent outbound messages** table (last 50) with status pill + error.
- **Health check panel**: button `Run Growth Engine Health Check` → calls `growth-health-check`, renders per-component WORKING/BLOCKED/PARTIAL with root cause + fix + Retry button.
- **Blocked jobs** list with one-click retry (calls dispatcher with job_id).

Route added to `src/app/router.tsx` under admin guard.

## 5. Truth rules (enforced in code, not just UI)
- Agent functions never write `status='success'` unless `sent_count > 0` OR the agent had legitimately zero work (input_count=0 → `idle`, not success).
- Cron summary view `v_growth_engine_today` exposes `is_production_live` boolean: `(sms_sent_today + email_sent_today) > 0`.
- Monitor reads that view; the banner is driven by it.

## Files to touch
- migration: tables, view, GRANTs, RLS
- `supabase/functions/growth-expansion-agent/index.ts`
- `supabase/functions/growth-outreach-agent/index.ts`
- `supabase/functions/growth-task-dispatcher/index.ts`
- `supabase/functions/growth-health-check/index.ts` (new)
- `src/pages/admin/AdminGrowthLiveMonitor.tsx` (new)
- `src/app/router.tsx`

## Questions before I build
1. **Outreach default state** — keep `waiting_approval` (nothing goes out without admin click) or flip default to `auto-approve` so SMS actually ship today? You said "Contactés = 0 means not in production" — I read that as: switch to auto-approve with quotas. Confirm?
2. **Twilio**: I don't see a Twilio connection linked. Health check will report it BLOCKED. Do you want me to also surface a "Connect Twilio" CTA on the monitor, or assume you'll link it separately?
