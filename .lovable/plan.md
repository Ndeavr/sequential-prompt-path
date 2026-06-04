
# Fix Autonomous Activation Engine — Revenue First

Goal: turn the pipeline from `sent=0, paid=0` into `Lead → SMS → Reply → Stripe → Activation` with zero manual steps. The current block is the SMS quota lock + a missing Activation Agent. Everything below targets that.

---

## Wave 1 — Unblock SEND (highest ROI, ship first)

### 1.1 Quota system (replace "998 blocages / quota atteint")
New table `outreach_quota_state` (singleton row per channel):
- `channel` (`sms` | `email` | `activation`)
- `daily_limit`, `used_today`, `last_reset_at`, `next_reset_at`
- `founder_override boolean default false`

New edge function `get-outreach-quota-status` → returns the exact JSON the user specified (limit / used / remaining / reset / founder_override) for all 3 channels in one call.

### 1.2 `outreach_delivery_logs` table
Columns: `lead_id`, `channel`, `status` (`sent|failed|blocked`), `block_reason`, `quota_name`, `quota_value`, `quota_used`, `provider_message_id`, `provider_response jsonb`, `error_code`, `phone_raw`, `phone_normalized`, `attempt`, `created_at`.

Block reason enum:
`SMS_QUOTA_REACHED`, `EMAIL_QUOTA_REACHED`, `INVALID_PHONE`, `TWILIO_ERROR`, `RESEND_ERROR`, `OPT_OUT`, `DUPLICATE_CONTACT`, `NO_MESSAGE_GENERATED`, `MISSING_SECRET`.

### 1.3 Queue states on `outreach_queue` (or `agent_outreach_messages`)
Add/normalize: `status` (`PENDING|READY|SENDING|SENT|FAILED|BLOCKED`), `attempts int default 0`, `last_attempt_at`, `next_attempt_at`.

### 1.4 Rewrite `agent-send-outreach`
- Single transaction per message: load → check quota → check dedupe → send → log to `outreach_delivery_logs` → update queue row + quota counter.
- Quota counter increments **only on real `sent`** (not on `blocked` or `failed`).
- If SMS blocked/failed and `email` is present → automatic fallback to email (and log both attempts).
- Auto-retry on Twilio `429 / 500 / timeout`: schedule `next_attempt_at` at +5m, +30m, +2h (max 3 attempts), then mark `FAILED`.
- `founder_override=true` bypasses quota checks entirely.

### 1.5 Founder mode + reset buttons (admin only)
`PageAutonomousEngine` additions:
- Toggle **Founder Mode** (admin-gated, calls edge fn to set `founder_override`).
- Buttons: **Reset SMS Quota**, **Reset Email Quota**, **Reset Activation Quota**, **Reset All** → call `reset-outreach-quotas` edge fn with channel param.
- **Send Test SMS to my number** + **Send Test Email** + **Run Full Pipeline Test** (Lead → Enrich → Score → SMS → Checkout, returns diagnostic JSON with raw provider response).

### 1.6 Daily cron
Schedule `reset-outreach-quotas` via `pg_cron` at `0 0 * * *` (resets `used_today`, sets `last_reset_at`/`next_reset_at`).

---

## Wave 2 — Activation Engine V2

### 2.1 Reply ingestion
Twilio inbound SMS webhook → `twilio-inbound-sms` edge fn → writes to `outreach_replies` and triggers Activation Agent.

### 2.2 `activation-agent` edge fn
Flow:
1. Classify reply intent via Lovable AI (`interested | not_interested | question | stop`).
2. If interested → pick plan from existing `contractor_plan_definitions` based on AIPP score + objective.
3. Call existing `create-contractor-checkout` with `prefill` (email/phone/business_name) → get Stripe URL.
4. Send checkout URL via SMS (or email fallback), log to `outreach_delivery_logs`.
5. Persist state in new `activation_sessions` table (`lead_id`, `reply_id`, `intent`, `plan_code`, `checkout_url`, `checkout_session_id`, `status`, timestamps).

### 2.3 Stripe webhook hardening
Extend existing Stripe webhook handler: on `checkout.session.completed` for a contractor checkout →
- update `contractor_prospects` → create/upgrade `contractors` row
- create `contractor_subscriptions`
- assign plan, set `profile_status = active`
- enqueue `aipp-real-scan` for fresh score
- emit `system_events` row `contractor_activated`

### 2.4 Conversion funnel statuses
Add `pipeline_status` enum to leads/prospects:
`Discovered → Enriched → Scored → Messaged → Delivered → Opened → Replied → Qualified → CheckoutSent → Paid → Activated`.
Update each step (send engine, webhook handlers, activation agent) to advance the status.

---

## Wave 3 — Revenue Dashboard

New tab on `PageAutonomousEngine` (or new `/admin/revenue`):
- KPI row: **Revenue Today**, **Revenue MTD**, **Activated Contractors**, **Pending Payments (checkout sent, not paid)**, **Checkout Links Sent**, **Conversion Rate (paid / replied)**.
- Funnel widget: counts at each of the 11 pipeline statuses.
- Live tail of `outreach_delivery_logs` + `activation_sessions`.
- Backed by new edge fn `get-revenue-dashboard`.

---

## Technical notes

- All new tables: `GRANT` to `authenticated` + `service_role`, RLS `has_role('admin')` for read, service_role for write.
- All edge fns use existing CORS + Lovable AI Gateway pattern; deno-compatible `esm.sh/@supabase/supabase-js@2.49.1`.
- Quota check is a single SQL function `public.check_and_consume_quota(channel, count)` (security definer) used by send engine — atomic, no race.
- Reuse existing `create-contractor-checkout` and Stripe webhook — do not duplicate.
- Founder Mode is per-environment, persisted in `outreach_quota_state.founder_override`; no env var.

---

## Success criteria

After deploy, running the **Full Pipeline Test** on 1 lead returns:
```
sent: 1, failed: 0, provider_message_id: "SM…"
checkout_url: "https://checkout.stripe.com/…"
```
And `blocked=0, sent>0` appears in the dashboard. Once a real reply arrives, activation runs end-to-end without admin input.

---

## Decisions needed before build

1. **Scope** — Ship all 3 waves in one go, or only Wave 1 (unblock send) first so you can validate revenue flow before building the dashboard?
2. **SMS quota default** — keep 50/day or raise (you'll likely hit it again instantly with 238 leads queued)?
3. **Email fallback** — auto-send via Resend if SMS blocked, or only when SMS hard-fails (invalid phone)?
4. **Reply ingestion** — confirm Twilio inbound webhook is already pointed at the project, or do I need to add the webhook URL to your Twilio console as part of this work?
