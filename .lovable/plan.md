## Goal
Move SMS from "fire and forget" to guaranteed delivery intelligence: every message tracked end-to-end, test numbers blocked at the edge, Twilio callbacks closing the loop, automatic retry on failure, and a clean admin cockpit. Unify the fragmented stack (`sms_events`, `sms_messages`, `acq_sms_logs`, ~10 send functions, 2 webhooks) behind a single send-and-track contract.

## Current state (audited)
- **Tables**: `sms_events` (lean — missing `lead_id`, `contractor_id`, `error_code`, `normalized_phone`), `sms_messages` (rich, has `message_sid`/status), `acq_sms_logs`, `evenements_sms`. No unified audit table.
- **Send paths** (10+ edge functions, none share a sender): `send-sms-prospect`, `acq-sms-send`, `agent-send-outreach`, `live-agent-outreach-send`, `sniper-queue-send`, `sms-prospect-send`, `launch-agent-checkout-sender`, `alex-reengage-send`, `approve-isr-sms`, `acq-followup-send`. Each calls Twilio directly with its own validation (or none).
- **Webhooks**: `twilio-status` (updates `sms_messages`) + `twilio-status-webhook` (updates `communication_logs`). Two callbacks, two tables — Twilio is configured to hit only one, so half the records never close.
- **Test-number leaks**: `5141234567` not found in DB; `+15145551234` only appears as input *placeholder* (safe). Suspect: user-entered prospect rows or seed scripts. Need a guard at send time regardless.
- **No retry engine**, **no normalization layer**, **no carrier/area-code breakdown**, **no contractor timeline view**.

## Plan

### PHASE 1 — Unified audit table `sms_events_v2`
Migration (one transaction, with GRANT + RLS + trigger):

Columns: `id`, `lead_id` (nullable FK → `contractor_leads`), `contractor_id` (nullable FK → `contractors`), `campaign_id`, `template_key`, `message_type` (`onboarding|reengagement|outreach|otp|founder|test|other`), `raw_phone`, `normalized_phone`, `country_code`, `area_code`, `carrier` (set by lookup), `from_number`, `message_preview` (first 160 chars), `body_hash`, `twilio_sid`, `status` (enum below), `error_code` (Twilio code), `error_message`, `attempt_number` (1..3), `next_retry_at`, `delivered_at`, `failed_at`, `webhook_received_at`, `created_at`, `updated_at`, `metadata jsonb`.

Status enum: `queued | sending | sent | delivered | undelivered | failed | invalid_phone | blocked | opted_out | retry_scheduled | contact_required`.

Indexes: `(status)`, `(twilio_sid) unique`, `(normalized_phone, created_at desc)`, `(contractor_id, created_at desc)`, `(lead_id)`, `(next_retry_at) where status='retry_scheduled'`.

RLS: `service_role` all; `authenticated` read only when `has_role(uid,'admin')`. Append-only (no DELETE policy).

Backfill: copy existing `sms_messages` + `sms_events` rows into `sms_events_v2` with best-effort field mapping; keep legacy tables read-only.

### PHASE 2 — Test-number guard + opt-out check (shared module)
New `supabase/functions/_shared/smsGuard.ts`:
- `BLOCKED_PATTERNS = [/^\+?1?514123 ?4567$/, /^\+?1?1234567890$/, /^\+?1?555\d{7}$/, /^\+?1?000/, /^\+?1?(\d)\1{9}$/]`
- `isBlocked(phone)`, `isOptedOut(phone)` (checks `outbound_suppressions` + new `sms_opt_outs`), `validateBeforeSend({ phone, lead_id, contractor_id })` returns `{ ok, normalized, reason }`.
- On block: insert `sms_events_v2` row with `status='invalid_phone'|'blocked'|'opted_out'`, push `admin_notifications` row, return early.
Codebase sweep: replace all direct Twilio calls in the 10 send functions to import a new `_shared/twilioSend.ts` (see Phase 4) which calls `validateBeforeSend` first.

### PHASE 3 — Phone normalization engine
New `supabase/functions/_shared/normalizePhone.ts`:
- Strip non-digits, infer country (default CA `+1`), validate length, build E.164.
- Reject if area code not in valid NANP set or starts with `0`/`1` per NANP rules.
- Returns `{ raw, normalized, area_code, country_code, valid }`.
Mirror as `src/lib/normalizePhone.ts` so the frontend can pre-validate at form entry.

### PHASE 4 — Single sender `_shared/twilioSend.ts`
One canonical function: `sendSms({ to, body, message_type, lead_id?, contractor_id?, campaign_id?, template_key, idempotency_key? })`.
Flow: normalize → guard → insert `sms_events_v2` (`queued`) → POST Twilio Messaging Service with `StatusCallback=https://<project>.functions.supabase.co/twilio-status-v2` → update row (`sending` + `twilio_sid`) → on Twilio 4xx/5xx update (`failed` + error_code) → return `{ event_id, status, twilio_sid }`.
Refactor all 10 send functions to use it. Delete duplicated Twilio fetch blocks.

### PHASE 5 — Unified Twilio callback `twilio-status-v2`
New edge function with `verify_jwt = false`. Validates `X-Twilio-Signature` HMAC against `TWILIO_AUTH_TOKEN`. Parses form body, updates the matching `sms_events_v2` row by `twilio_sid`: status mapping, `delivered_at`/`failed_at`, `error_code`, `error_message`, `webhook_received_at`. Deprecate `twilio-status` and `twilio-status-webhook` (keep them as thin shims that also write to `sms_events_v2` for legacy traffic). Update Twilio Messaging Service status callback URL to the new function.

### PHASE 6 — Autonomous retry engine
New table `sms_retry_queue` (event_id, attempt, scheduled_at, status). Edge function `sms-retry-scheduler` (cron every 5 min) picks rows where `status in ('failed','undelivered')` and `attempt_number < 3`, schedules retry at +15min / +24h / +72h. On 3rd failure: `status='contact_required'` + `admin_notifications` insert + Slack/email alert to ops.
pg_cron entry inserted via insert tool (not migration — contains URL/anon key).

### PHASE 7 — Admin SMS Health cockpit
New route `/admin/sms-health` + page `PageSmsHealth.tsx`:
- KPI strip: Delivered / Failed / Undelivered / Queued / Invalid — for Today, 24h, 7d, 30d. Success rate %.
- Top failure reasons grid: groups by `error_code` (30003 Unreachable, 30004 Blocked, 30005 Unknown destination, 21610 Unsubscribed, 21614 Invalid 'To'), with human FR labels from a static dict.
- "Why SMS fail" breakdown panels: by area code, by carrier (from `twilio-lookup-phone` enrichment), by trade, by city, by campaign.
- Live event stream (last 100, polls every 10s via lightweight RPC).
- Anomaly badge: if any group's failure rate > 2× rolling avg → red flag.
SQL view `v_sms_health_24h` etc. powers the KPIs with security_invoker.

### PHASE 8 — Contractor Communication Timeline
On contractor profile page: new `<ContractorCommsTimeline contractorId={...} />`.
Queries `sms_events_v2` + existing `email_send_log` + `pro_landing_views` + `contractor_activation_events` + `pricing_checkout_sessions`, merges by timestamp into a single vertical timeline:
- ✓ SMS sent → Delivered (with carrier) → Link clicked → Landing viewed → Onboarding started → Checkout opened → Activated.
- Each entry shows time + status + Twilio SID on hover.
Expose RPC `get_contractor_comms_timeline(contractor_id uuid)` (security_invoker) so Alex can call it: "Votre invitation UNPRO a bien été reçue hier à 14h32."

### PHASE 9 — Carrier enrichment
After every successful send, enqueue a one-shot `twilio-lookup-phone` call for the normalized number (cached 30 days in new `phone_carrier_cache` table). Backfill `sms_events_v2.carrier` so Phase 7 grouping works.

### PHASE 10 — Verification
- Unit: `normalizePhone.test.ts` (8 input variants → E.164), `smsGuard.test.ts` (test numbers blocked, valid passes).
- Integration: `curl_edge_functions` POST to refactored `send-sms-prospect` with `+15141234567` → expect 200 with `status='invalid_phone'`, no Twilio call, admin_notifications row created.
- Webhook: simulate Twilio callback (`MessageStatus=delivered&MessageSid=...`) → row transitions to `delivered`, `webhook_received_at` set.
- Retry: insert a `failed` row dated 16min ago → run scheduler manually → confirm `retry_scheduled` row created and second send attempted.
- UI: load `/admin/sms-health`, screenshot via Playwright, confirm KPI numbers match a `read_query` cross-check.

## Files / artifacts
**Migrations** (1): create `sms_events_v2`, `sms_opt_outs`, `sms_retry_queue`, `phone_carrier_cache`, views, RPCs, GRANT/RLS/triggers.
**Shared edge modules** (3): `_shared/normalizePhone.ts`, `_shared/smsGuard.ts`, `_shared/twilioSend.ts`.
**New edge functions** (2): `twilio-status-v2`, `sms-retry-scheduler`.
**Refactored edge functions** (10): all listed senders now route through `twilioSend`.
**Frontend**: `src/lib/normalizePhone.ts`, `src/pages/admin/PageSmsHealth.tsx`, route registration, `src/components/contractor/ContractorCommsTimeline.tsx`.
**pg_cron** (via insert tool): 5-min schedule hitting `sms-retry-scheduler`.

## Non-goals
- No change to email pipeline.
- No new Alex behavior beyond reading the timeline RPC.
- No change to checkout/payment flows.

## Out-of-band
- Twilio Console: update Messaging Service status-callback URL to `twilio-status-v2` once deployed. Enable SMS Pumping Protection + Geo Permissions (CA only). I'll spell out the exact 3 clicks for you after Phase 5 ships.

## Success criteria (mirrors your brief)
✓ 100% visibility on every SMS (single table + closed-loop webhook)
✓ Test numbers blocked at send time, never reach Twilio
✓ Real-time status from Twilio, not polling
✓ Failed messages auto-categorized by error code + carrier
✓ Retry engine never blocks a campaign batch
✓ Contractor timeline traceable, Alex-readable
✓ Admin sees per-campaign / per-carrier / per-area-code failure heatmap
