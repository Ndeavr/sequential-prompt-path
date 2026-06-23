# Revenue Truth Layer — Event-Driven Acquisition Pipeline

Replace the current "table-count guessing" with a single canonical event log (`acquisition_events`) fed by every send, webhook, click, signup, and payment. The dashboard then reads only from events (with raw tables as cross-check), and surfaces actionable webhook/credential health.

## 1. Canonical event table

New migration creating `public.acquisition_events`:

- `id uuid pk`
- `prospect_id uuid` (nullable, FK `contractor_prospects`)
- `contractor_id uuid` (nullable, FK `contractors`)
- `profile_id uuid` (nullable, FK `profiles`)
- `tracking_id text` (for `/r/:id` resolution)
- `channel text check in ('sms','email','manual','system','web','stripe')`
- `event_type text check in ('scraped','contacted','sent','delivered','opened','clicked','registered','onboarded','paid','active','failed','bounced','unsubscribed')`
- `provider text` (`twilio|resend|stripe|app`)
- `provider_event_id text` (unique-ish per provider for idempotency)
- `metadata jsonb default '{}'`
- `occurred_at timestamptz default now()`
- `created_at timestamptz default now()`

Indexes: `(event_type, occurred_at)`, `(prospect_id, event_type)`, `(contractor_id, event_type)`, `(provider, provider_event_id)` unique partial.

Plus `acquisition_tracking_links` (id text pk, prospect_id, contractor_id, destination_url, campaign, created_at, last_click_at, click_count).

GRANTs: `service_role ALL`; `authenticated SELECT` (admins read via has_role check at query time); no anon.
RLS: only `has_role('admin')` can SELECT/INSERT from client; service role bypasses for edge functions.

## 2. Backfill migration (one-shot)

Insert into `acquisition_events` from existing data:

- `contractor_prospects` → `scraped` (occurred_at = created_at)
- `contractor_leads` → `scraped` (dedup via tracking_id or prospect link)
- `contractor_outreach_logs` rows with status in (`sent`,`queued`,`sms_sent`,`email_sent`,`contacted`) → `sent` + `contacted`
- `contractor_outreach_logs` rows with status/event in (`delivered`,*_delivered) → `delivered`
- same for `opened`, `clicked`
- `profiles` (role=contractor or with utm/tracking) → `registered`
- `contractor_subscriptions` status active/trialing → `paid`
- `contractors` is_published/status active/visible → `active`

Idempotent via `(provider, provider_event_id)` or `(prospect_id, event_type, source_row_id)` unique.

## 3. Event writers (edge functions + hooks)

### 3a. Twilio webhook — `supabase/functions/twilio-status-events/index.ts` (verify_jwt=false, public)

POST endpoint Twilio hits. Validates `X-Twilio-Signature` with auth token. Maps:
- `queued|sent|sending` → `sent`
- `delivered` → `delivered`
- `failed|undelivered` → `failed` (capture `ErrorCode`)

Resolves `prospect_id` via `contractor_outreach_logs.provider_message_id = MessageSid`.

Configure URL in Twilio Console (admin instruction shown in dashboard).

### 3b. Resend webhook — `supabase/functions/resend-events/index.ts`

POST endpoint. Verify `svix-signature` if `RESEND_WEBHOOK_SECRET` is set. Map all `email.*` events to canonical types. Resolve prospect via `tags.tracking_id` (we set this in outbound sends).

### 3c. Stripe webhook — extend existing `launch-stripe-webhook`/`stripe-isr-webhook`

On `checkout.session.completed` and `invoice.payment_succeeded` → `paid` event (channel=`stripe`, provider_event_id=event.id). On contractor publish → `active` event (already-emitted from publish flow).

### 3d. Click tracker — `supabase/functions/r-redirect/index.ts` + route `/r/:trackingId`

Public GET. Looks up `acquisition_tracking_links`, writes `clicked` event, 302 to `destination_url`. Increments `click_count`, `last_click_at`.

### 3e. Outbound send wrappers

Patch existing sender code paths (Twilio sender, Resend sender, scraper completion, signup, onboarding-complete trigger) to call a shared `logAcquisitionEvent()` helper:
- `src/lib/acquisition/eventLogger.ts` (client)
- `supabase/functions/_shared/acquisitionEvents.ts` (server)

All outbound messages get URLs rewritten to `https://unpro.ca/r/{trackingId}` server-side before send.

## 4. Dashboard rewrite — read events as source of truth

Update `PageAdminAcquisitionFunnel.tsx`:

- Replace `acquisition-funnel-live` to compute counts from `acquisition_events` (distinct `coalesce(prospect_id, contractor_id, profile_id)` per stage).
- Raw table counts kept ONLY as a cross-check column next to each stage (e.g., `Delivered: 142 events / 329 sent rows`).
- `registered` = events `registered` OR profiles with `utm_source` set after first outreach.
- `paid` = events `paid` joined to `contractor_subscriptions` active.
- `active` = `contractors.is_published=true`.

Each stage shows source explicitly ("from acquisition_events" vs "from contractor_outreach_logs").

## 5. Health panel (new section above funnel)

Edge function `acquisition-health-check` returns:

```
{
  twilio: { credentials: true, webhook_last_event_at: "...", status: "ok|stale|missing" },
  resend: { ... },
  stripe: { ... },
  redirect_tracker: { last_click_at, status }
}
```

Computed by:
- credentials present → check secrets via fetch_secrets
- webhook last event → `select max(occurred_at) from acquisition_events where provider='twilio' and event_type in ('delivered','failed','sent')`
- "stale" if no event in 24h while sends > 0 in same window
- "missing" if sends > 0 but ZERO webhook events ever

UI: `<HealthCard>` per provider with green/amber/red and an actionable message ("Twilio: 329 SMS sent, 0 delivery webhooks received → configure status callback URL `https://...functions.../twilio-status-events`").

## 6. Actionable findings

Replace generic findings in `acquisition_findings` with deterministic checks computed by `acquisition-pipeline-audit`:

- "SMS sent but no delivery webhook received" — count(sent) > 0 AND count(delivered) = 0
- "Resend webhook missing" — count(email sent) > 0 AND no resend events
- "Tracking links not using /r/" — outreach_logs.message_body NOT LIKE '%/r/%'
- "Profiles created without attribution" — profiles with no matching `registered` event
- "Stripe paid but contractor not activated" — `paid` event exists, contractor.is_published=false
- "Onboarded count 0 but Registered 39" — registered events > 0 AND onboarded events = 0

## 7. Admin test panel — `PageAdminAcquisitionTests.tsx` (new route `/admin/acquisition/tests`)

Buttons calling new edge functions:
- `test-send-sms` (sends to admin phone, logs sent event, awaits delivered webhook ≤30s)
- `test-send-email` (Resend → admin email)
- `test-generate-tracking-link` (returns `/r/{id}`)
- `test-simulate-click` (POSTs to redirect endpoint server-side)
- `test-stripe-webhook` (constructs signed test event, posts to webhook)

Each shows pass/fail and the resulting `acquisition_events` rows.

## 8. Secrets needed

Confirm/request via `add_secret` if missing:
- `TWILIO_AUTH_TOKEN` (already present via existing twilio fns — verify)
- `RESEND_WEBHOOK_SECRET` (svix signing secret from Resend dashboard)
- `STRIPE_WEBHOOK_SECRET` (already present)
- `ADMIN_TEST_PHONE`, `ADMIN_TEST_EMAIL` (for test panel)

## 9. Files

**New**
- `supabase/migrations/<ts>_acquisition_events.sql` (table + indexes + RLS + GRANTs + backfill)
- `supabase/functions/twilio-status-events/index.ts`
- `supabase/functions/resend-events/index.ts`
- `supabase/functions/r-redirect/index.ts`
- `supabase/functions/acquisition-health-check/index.ts`
- `supabase/functions/test-send-sms/index.ts`
- `supabase/functions/test-send-email/index.ts`
- `supabase/functions/test-generate-tracking-link/index.ts`
- `supabase/functions/test-simulate-click/index.ts`
- `supabase/functions/test-stripe-webhook/index.ts`
- `supabase/functions/_shared/acquisitionEvents.ts`
- `src/lib/acquisition/eventLogger.ts`
- `src/pages/admin/PageAdminAcquisitionTests.tsx`
- `src/components/admin/AcquisitionHealthPanel.tsx`

**Edited**
- `supabase/config.toml` (verify_jwt=false for the 4 webhook/redirect fns)
- `supabase/functions/acquisition-funnel-live/index.ts` (read from events)
- `supabase/functions/acquisition-pipeline-audit/index.ts` (new actionable rules)
- `src/pages/admin/PageAdminAcquisitionFunnel.tsx` (event-source labels, dual counts, health panel)
- `src/app/router.tsx` (add `/r/:id` client redirect fallback + admin tests route)
- existing Twilio/Resend sender functions (rewrite URLs to `/r/{id}`, log `sent` event, store `provider_message_id`)
- `contractor_outreach_logs` writer paths (add `tracking_id`)

**Out of scope (do later)**
- Cron-based reconciliation jobs (events are now real-time)
- UI redesign of the funnel cards
- Replacing `acquisition_funnel_state` table (becomes a derived materialization on top of events in phase 2)

## 10. Success checks

After deploy + backfill + webhook URLs configured:
- `select event_type, count(*) from acquisition_events group by 1` shows non-zero across `scraped,sent,delivered,clicked,registered,paid,active`
- Dashboard "Delivered" no longer = 0 when Twilio webhook fires
- Health panel goes green for each provider with last event timestamp
- Findings show specific root causes, not "0 leaks detected"
- Test panel: send SMS → see `sent` then `delivered` event within 30s
