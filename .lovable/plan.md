## Problem

`/admin/revenue-intelligence` shows "Entonnoir — 0 entrepreneurs" because the funnel reads `acquisition_funnel_state` (0 rows) instead of the live operational tables (227 prospects, 335 outreach logs, 39 profiles, 238 leads, 22 contractors).

## Fix

### 1. Edge function: `acquisition-funnel-live` (new)
Computes funnel from raw sources and returns counts + provenance:
```
scraped    = max(contractor_prospects, contractor_leads, contractors)
contacted  = contractor_outreach_logs where status in ('sent','queued','contacted','sms_sent','email_sent')
delivered  = contractor_outreach_logs where status in ('delivered','sms_delivered','email_delivered')
opened     = contractor_outreach_logs where event_type in ('opened','email_opened')
clicked    = contractor_outreach_logs where event_type in ('clicked','link_clicked','cta_clicked')
registered = max(profiles since first outreach, contractors where user_id not null)
onboarded  = contractors where onboarding_status in ('completed','complete','onboarded')
paid       = contractor_subscriptions where status in ('active','trialing')
active     = contractors where status in ('active','visible','published')
```
Response: `{ counts, sources: { scraped: { value, table }, ... }, mode: 'live'|'state' }`.

### 2. Edge function: `sync-acquisition-funnel-state` (new)
Rebuilds `acquisition_funnel_state` by iterating contractors + leads + prospects, assigning `current_stage` from outreach / subscription / contractor status, upserting on `contractor_id`. Idempotent.

### 3. Cron (insert tool, not migration)
`select cron.schedule('sync-acquisition-funnel-state-hourly','0 * * * *', $$ net.http_post(...sync-acquisition-funnel-state...) $$)`.

### 4. Dashboard (`PageAdminAcquisitionFunnel.tsx`)
- Replace `loadFunnel` to call `acquisition-funnel-live` first. If `acquisition_funnel_state` has 0 rows, set `mode='fallback'`.
- Show amber warning banner: *"Table d'état du funnel vide — calcul en direct à partir des logs opérationnels. Sync en cours."*
- Auto-invoke `sync-acquisition-funnel-state` once when fallback is detected.
- Under each stage row, render small caption: `{count} from {source_table}` (e.g. `227 from contractor_prospects`).
- Stage label `total` recomputed from `scraped` (top of funnel), not sum of stages.

### 5. Triggers (out of scope for now — documented hook points)
The sync function is reusable; the user can wire it from scraper / outreach / Stripe webhooks later by calling the same endpoint. Plan flags the integration points but does not modify those edge functions in this pass.

## Files

- **NEW** `supabase/functions/acquisition-funnel-live/index.ts`
- **NEW** `supabase/functions/sync-acquisition-funnel-state/index.ts`
- **EDIT** `supabase/config.toml` — register both with `verify_jwt = false`
- **EDIT** `src/pages/admin/PageAdminAcquisitionFunnel.tsx` — new loader, fallback banner, per-stage source caption, auto-sync trigger
- **INSERT (cron)** hourly call to `sync-acquisition-funnel-state`

## Out of scope
- Editing scraper / outreach / Stripe webhook edge functions to call the sync (will be done in a follow-up pass).
- Schema changes to `acquisition_funnel_state` (existing columns are sufficient).
