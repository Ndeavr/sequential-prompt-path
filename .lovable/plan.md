# Launch War Room — Execution Engine Fix

## Root cause (confirmed via DB inspection)

`launch-commander` is ticking every minute as designed. But the scout fails 100% of ticks with:

```
column outbound_companies.primary_trade does not exist
```

`outbound_companies` exposes `trade` and `specialty`, not `primary_trade`. Result:
- 1007 commander ticks logged, 0 `launch_leads` inserted, all pipeline stages at 0.
- The War Room screen renders the empty pipeline + a generic "Evaluating tasks and constraints ahead" assistant bubble while the engine quietly fails.
- Secrets are fine (GEMINI, GOOGLE_PLACES, RESEND, TWILIO, STRIPE all present), so no env blocker — only this broken query plus the lack of a Google Places fallback when the existing `outbound_companies` pool runs dry.

## Phase A — Stop the silent failure (P0, ships pipeline movement in <60s)

### A1. Fix scout column references — `supabase/functions/launch-agent-scout/index.ts`
- SELECT `id, company_name, city, trade, specialty, phone, email, contractor_id` (drop `primary_trade`).
- Use `(c.trade ?? c.specialty ?? "")` for the trade match and for the inserted `trade` field.
- Widen the filter: if both trade AND city match → priority bucket; otherwise still accept up to half the batch from QC pool (`region ILIKE 'QC'` or city in PRIORITY_CITIES) so the pool isn't entirely discarded.

### A2. Google Places fallback when the pool is dry
- When pool-side candidates < `batch / 2`, call Google Places Text Search (`GOOGLE_PLACES_API_KEY`, already configured) for `<trade> <city>` across PRIORITY_TRADES × PRIORITY_CITIES (round-robin, one (trade, city) per invocation, persisted in `launch_mode_state.scout_cursor`).
- Upsert results into `outbound_companies` (existing table), then dedupe + insert into `launch_leads` as `DISCOVERED`.
- On Google API failure → return BLOCKED with the exact provider error in `message`.

### A3. Surface BLOCKED reasons on every agent
Every launch-agent-* edge function already calls `reportOutcome` + `logLaunchEvent`. Patch the commander so a non-2xx sub-invocation:
- Logs a dedicated `launch_pipeline_events` row with `success=false`, `agent=<sub>`, `event="blocked"`, `message=<first 240 chars of body>` (instead of only nesting it in payload).
- Mirrors the latest blocker into a new row in `launch_mode_state` columns: `last_blocker_agent`, `last_blocker_reason`, `last_blocker_at` (migration).

## Phase B — Hard state machine + stage deadlines (PHASES 1-2 from spec)

Migration adds to `launch_leads`:
- `current_stage_started_at TIMESTAMPTZ`, `current_stage_heartbeat_at TIMESTAMPTZ`, `current_stage_timeout_seconds INT`, `block_reason TEXT`, `retry_count INT DEFAULT 0`.

New SQL function `mark_stale_leads_blocked()` runs at the top of every commander tick:
- Any lead whose `current_stage_started_at + timeout_seconds < now()` → status `BLOCKED`, `block_reason = 'stage_timeout:' || prior_status`.
- Caps: discovery 60s, enrichment 120s, scoring 60s, messaging 60s, sending 60s.

Each agent updates `current_stage_started_at` + `current_stage_timeout_seconds` when it picks up a lead.

## Phase C — War Room operator surface (PHASES 3, 4, 5, 8 from spec)

`src/pages/admin/AdminLaunchWarRoom.tsx`:
1. **Secrets readiness card** — small fetch to a new edge function `launch-readiness` that returns `{ GEMINI_API_KEY, RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, GOOGLE_PLACES_API_KEY, STRIPE_SECRET_KEY }` each as `✅` / `❌` (boolean from `Deno.env.get(...)` presence; never expose values). Disable the Start button if any of the launch-critical ones are missing.
2. **Current Objective panel** — Objective / Stage / Trade / City / Current Lead / Last successful action / Next action — pulled from `launch_mode_state` + most-recent successful event.
3. **Live Event Stream** — replace the 50-event timeline with a real-time stream (existing supabase realtime channel on `launch_pipeline_events`), color-coded: green = success, red = blocked/failed, gray = info. Failed rows render `agent + event + message` prominently with a copy-error button.
4. **Discovery Diagnostics card** — shows last scout run's `{ found, rejected: { no_phone, no_email, outside_territory, duplicate, other } }` (the scout writes this breakdown into the event payload going forward).
5. **Active Blocker banner** — if `launch_mode_state.last_blocker_*` set and newer than 90s, render a red dismissible banner at the top with the exact reason.
6. Remove the floating "Evaluating tasks and constraints ahead" bubble on this route (it's the Alex assistant — guard it off on `/admin/*`).

## Phase D — Fake-success prevention + auto-recovery (PHASES 7, 9 from spec)

- `launch-commander` final response now sets a tick outcome:
  - `achieved` only if `(discovered_this_tick + messaged_this_tick + reply_classified_this_tick) > 0` OR pipeline already has movement (any lead progressed status).
  - Otherwise `partial` with `block_reason = 'no_actionable_work'` and surface in the banner.
- Agent retry: when `reportOutcome` returns failed, increment `retry_count` on the lead. After 3 → status `FAILED`, log full error to `launch_pipeline_events.message`.

## Phase E — First Paying Contractor mode (PHASE 6 from spec)

Already partially implemented (priority trades/cities baked into scout). Additions:
- `launch_mode_state` gets `daily_email_cap INT DEFAULT 25`, `daily_sms_cap INT DEFAULT 50`. Outreach agent enforces caps against count of today's `MESSAGED` events.
- When `launch_mode_state.first_customer_contractor_id` is set → War Room renders the existing "🎉 First Contractor Acquired" card (already coded), and the commander stops further outreach (already coded).

## Out of scope
- No change to existing reliability framework, founder mode, or `launch_followup_engine`.
- No Twilio number provisioning — uses existing `TWILIO_MESSAGING_SERVICE_SID`.
- No Stripe product changes.

## Validation
1. Deploy migrations + edge functions.
2. Open `/admin/launch-war-room`. Within ~60s: scout inserts ≥10 leads from the existing 106-row pool, enricher + visibility tick, event stream shows green rows.
3. Manually wipe outbound_companies → next tick triggers Google Places fallback, leads keep flowing.
4. Set `GEMINI_API_KEY` to garbage value in a staging copy → War Room shows red ❌ on Gemini, Start button disabled, scoring rows show BLOCKED with the exact provider error.
5. Confirm no event row remains "successful" while every sub-agent failed.
