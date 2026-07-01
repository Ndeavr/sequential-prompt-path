
# Dispatch Bottleneck Audit + Auto-Repair

## What the data already tells us (238 leads audited)

```
Contact coverage
  total leads .................. 238
  has phone .................... 82  (34%)
  has email .................... 23  (10%)
  no phone AND no email ........ ~150

Lead pipeline
  new / none ................... 179  (never dispatched)
  contacted / contacted ........  56  (dispatch attempted)
  ready_for_contact / none .....   2
  qualified / booked ...........   1

Events written
  outreach_sms_events .......... 2   (1 delivered, 1 ping)
  outreach_email_events ........ 3   (0 delivered)
```

**Two independent collapses:**

1. **Contact-data collapse** — enrichment never populated `phone` / `email` on ~150 leads, so they are structurally undispatchable.
2. **Event-log collapse** — 56 leads are flagged `outreach_status = contacted` but only 5 provider events exist. Either dispatch worker short-circuited before calling Twilio/Resend, or provider calls happened without writing to `outreach_sms_events` / `outreach_email_events`. That's why the funnel dashboard shows 2 SMS / 3 emails — the funnel reads events, not lead status.

## Deliverable — 1 audit function + 1 repair function + 1 admin panel

### 1. `dispatch-bottleneck-audit` (new edge function, read-only)

Returns a single JSON envelope with 5 sections. No writes.

**A. Per-prospect breakdown** (paged, 500 rows/page):
`id, company_name, phone, email, lead_status, outreach_status, enrichment_status, validation_status, last_transition, blocked_reason, created_at`.

`blocked_reason` computed with this deterministic ladder (first match wins):
```
missing_phone_and_email → no phone/mobile AND no email
missing_phone           → no phone/mobile, has email
missing_email           → no email, has phone
invalid_phone           → phone_type in ('landline','voip','toll_free','invalid')
lookup_failed           → phone present, phone_type IS NULL, last_lookup_error IS NOT NULL
pending_validation      → phone present, phone_type IS NULL, no lookup error
waiting_approval        → lead_status='ready_for_contact', outreach_status='none'
dispatch_skipped        → outreach_status='contacted' AND no rows in outreach_sms_events/outreach_email_events for that lead
queue_error             → metadata_json->'last_dispatch_error' set
delivery_error          → has event with status in ('failed','undelivered','bounced')
delivered_no_response   → has delivered event, no click
none                    → everything else
```

**B. Choke-point ladder** (real counts across `contractor_leads` + provider event tables):
```
imported → validated → sms_eligible → email_eligible → queued
        → dispatched → delivered
```
Returns the first stage where volume drops >70% vs the previous stage.

**C. Twilio audit** — last 20 rows from `outreach_sms_events` joined on `contractor_leads`: `recipient, status, error_code, carrier, delivery_status, created_at`. Plus health verdict: `twilio_healthy` (creds valid via existing `twilio-auth-audit`), `queue_healthy` (any events in last 24h), `delivery_healthy` (delivered / dispatched ≥ 0.7 over last 24h).

**D. Resend audit** — last 20 rows from `outreach_email_events`: `recipient, status, rejection_reason, bounce_reason, delivery_status, created_at`. Plus health verdict: pulls `email_domain--check_email_domain_status` result (SPF/DKIM/DMARC), and `accepted_by_resend` = count with `provider_message_id NOT NULL`.

**E. Final output** — root cause string, offending table/function, `prospects_recoverable_now` (leads that will pass validation after re-enrichment or phone re-normalization), `prospects_needing_manual` (leads with no contact data at all), and an ordered `repair_sequence`.

### 2. `dispatch-bottleneck-repair` (new edge function, safe writes only, `dry_run` default `true`)

Never sends messages. Only mutates queue/validation/lock state. Returns before/after counts per action.

Actions (each independently toggleable via `?actions=…`):
```
retry_stuck_validation   — leads with phone present + phone_type null older than 15m
                            → clear last_lookup_error, mark for re-lookup by acq-phone-backfill
requeue_orphaned         — outreach_status='none' + validation_status='valid' older than 30m
                            → set outreach_status='ready', enqueue in acquisition-autopilot
restart_stalled_workers  — outreach_health_state rows where last_tick_at < now()-15m
                            → call outreach-repair-agent to re-arm the cron
clear_dead_queue_locks   — alex_outreach_queue rows locked > 10m
                            → release lock (locked_at=null, worker_id=null)
renormalize_phones       — leads where phone !~ E.164
                            → run through normalizeE164, update in place
reenrich_missing_contact — leads missing phone+email + has website_url or company_name
                            → enqueue in acq-enrich-contractor
```

Every action logs a row in a new `outreach_repair_actions` table: `run_id, action, dry_run, before_count, after_count, error, created_at`.

### 3. `/admin/dispatch-bottleneck` page

Three cards + one table:
- **Choke-point ladder** (stacked bars, first collapse highlighted amber).
- **Twilio health** + **Resend health** (green/amber/red pills with verdict).
- **Repair console** — checkbox per action, `Dry-run` toggle (default on), `Execute` button that calls `dispatch-bottleneck-repair`, shows before/after diff.
- **Prospect table** — paginated, filterable by `blocked_reason`, CSV export.

## Technical notes

- Reads only from `contractor_leads`, `outreach_sms_events`, `outreach_email_events`, `outreach_health_state`, `alex_outreach_queue`, `contractor_prospects` (for cross-ref).
- Uses existing `_shared/reliability.ts` (`withRetry`, `reportOutcome`) for repair actions per Production Reliability Framework.
- Reuses existing `twilio-auth-audit` and `email_domain--check_email_domain_status`.
- Does not touch matching, Stripe, or onboarding logic.
- Follows readability tokens (`.admin-theme` scope, no raw `text-gray-*`).

## Success

- Panel shows exact reason for each of the 238 leads.
- Choke-point ladder pinpoints the collapse stage in one glance.
- Repair console can be executed in dry-run and shows what would be recovered before any real change.
- After running the safe repairs, the "recoverable now" count in `revenue-path-audit` moves upward on next refresh — without a single message being sent.

## Files

New:
- `supabase/functions/dispatch-bottleneck-audit/index.ts`
- `supabase/functions/dispatch-bottleneck-repair/index.ts`
- `supabase/migrations/<ts>_outreach_repair_actions.sql` (new table + grants + RLS)
- `src/pages/admin/PageAdminDispatchBottleneck.tsx`
- Route in `src/app/router.tsx`: `/admin/dispatch-bottleneck`
