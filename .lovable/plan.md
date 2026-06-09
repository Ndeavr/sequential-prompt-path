## Diagnosis (live evidence from production DB)

The launch pipeline has been running every minute for 24h but has produced **zero leads, zero outreach, zero payments**. Concrete proof:

```
launch_leads:                                          0 rows
launch_pipeline_events (24h, success=true):            0
launch_pipeline_events (24h, success=false):           4324
   ├─ launch-commander (orchestrator no-ops)           1440
   ├─ launch-agent-scout (blocked)                     2879
   └─ other agents (never reached)                       5
outbound_companies (the scout's source pool):
   ├─ total rows                                       106
   ├─ in target cities (Laval/Montreal/Terrebonne/…)    78
   └─ with phone OR email                                0   ← funnel killer
Google Places API:  REQUEST_DENIED — key has referrer restriction
```

So today the system shows "running" but is structurally incapable of producing a paying customer. The fix is two parts: (A) **enforce truth** (no agent reports success without business proof), and (B) **unblock the actual bottlenecks** (pool contactability + Google Places key + activation funnel proofs).

---

## Part A — Production Enforcement (no fake success)

### A1. Canonical success contract for every agent
Add `supabase/functions/_shared/launchEnforcement.ts`:
- `assertBusinessProof(stage, proof)` — throws `BlockReason` if proof missing.
- Helper `transitionLead(leadId, fromState, toState, proofPayload)` — writes `launch_pipeline_events(success=true)` + updates `launch_leads.lead_status` in a single transaction. If proof is missing or DB write fails → writes `success=false` + `block_reason` + bumps `launch_leads.failure_code`. Never silently passes.

Hard rules baked in:
- `DISCOVERED` requires: `company_name AND city AND trade AND (phone OR email)`.
- `ENRICHED` requires: `aipp_score` row written + `contractors.id` resolved or created.
- `OUTREACH_SENT` requires: provider 2xx response stored in `payload.provider_response_id`.
- `OUTREACH_DELIVERED` requires: Twilio/Resend webhook event row.
- `OUTREACH_OPENED` requires: open-pixel hit or click event.
- `ACTIVATION_VIEWED` requires: row in `landing_visits` matched by `slug + lead_id`.
- `CHECKOUT_STARTED` requires: `stripe_checkout_sessions.id` + Stripe session id stored.
- `PAYMENT_COMPLETED` requires: `stripe-webhook` event received with `event.type='checkout.session.completed'`.
- `PROFILE_ACTIVATED` requires: `contractors.status='active' AND subscription_status='paid' AND profile_visible=true`.

Refactor each of these to use the helper:
`launch-agent-scout`, `launch-agent-enrich`, `launch-agent-visibility`, `launch-agent-outreach`, `launch-agent-delivery-monitor`, `launch-agent-reply-detector`, `launch-agent-sales-closer`, `launch-agent-activation`, `launch-agent-payment-monitor`, `launch-commander`, `launch-followup-engine`.

### A2. Commander stops reporting OK on no-op
`launch-commander` currently logs an empty success event every minute even when no agent advanced anything. Change it to:
- Sum agent-level proofs in the run.
- If `leads_advanced = 0`, log `success=false`, `event='no_advance'`, `message=<dominant blocker reason from agent results>`.
- Write `launch_mode_state.last_blocker_*` from the dominant blocker.

---

## Part B — Unblock the real bottlenecks

### B1. Make the contractor pool contactable
- Add `launch-agent-enrich-contact` edge function that, for `outbound_companies` rows with a `google_place_id` or website but no phone/email, calls Google Places Details (server-only key) + Firecrawl `scrape` on the company website for `tel:` / `mailto:` / footer contact. Writes back `phone, email`.
- Run it inline at the top of `launch-agent-scout` when `pool_with_contact < batch`.

### B2. Replace the broken Google Places key
- `GOOGLE_PLACES_API_KEY` currently has referrer restrictions (browser key). The scout needs a **server-only, unrestricted** key.
- Add a new secret `GOOGLE_PLACES_SERVER_KEY` via the secrets tool. Scout + enrich-contact will prefer it and fall back to `GOOGLE_PLACES_API_KEY`.
- If both fail, scout falls back to Firecrawl `search` ("entreprise toiture Laval Québec") for backup discovery.

### B3. Outreach proof + provider responses
- `launch-agent-outreach` stores the full Twilio/Resend response (`sid`, `id`, status) in `launch_pipeline_events.payload.provider_response`.
- `twilio-status-webhook` and Resend webhook (`resend-inbound-webhook`) update `launch_leads.lead_status` to `OUTREACH_DELIVERED` / `OUTREACH_OPENED` / `OUTREACH_REPLIED` and log events.
- Daily caps enforced from `launch_mode_state.daily_sms_cap / daily_email_cap`. When cap hit → status `BLOCKED_CAP` (not failed).

### B4. Activation page → Stripe → activation proof
- `/activation/:slug` page logs a `launch_pipeline_events(event='activation_viewed')` on mount (lead resolved via slug → lead_id).
- "Activer mon profil" button calls a new/repaired `activation-create-checkout` that:
  - Creates Stripe checkout session in `subscription` mode with the auto-selected plan price id (B5 below).
  - Stores `stripe_session_id` on `launch_leads.payload.stripe_session_id`.
  - Transitions lead to `CHECKOUT_STARTED`.
- `stripe-webhook` (existing) extended to: on `checkout.session.completed`, locate lead by `client_reference_id = lead_id`, set contractor `status='active'`, `subscription_status='paid'`, `profile_visible=true`, transition to `PROFILE_ACTIVATED`, set `launch_mode_state.first_customer_acquired_at` if first.

### B5. Auto-select plan from opportunity score
Add `_shared/planSelector.ts` based on `aipp_score`, `review_count`, `city_demand`:
- `score < 50 OR no_reviews` → `recrue` ($149).
- `reviews_strong AND aipp < 60` → `pro` ($349).
- `high-demand city + open territory` → `premium` ($599).
- `dominant_in_city OR exclusive_territory` → `elite` ($999).
Selected plan stored on `launch_leads.payload.recommended_plan` at enrichment time and used by `activation-create-checkout`.

---

## Part C — Truth Panel + CEO Mode (admin UI)

New route `/admin/truth-panel` (single page, admin-only), plus inject **CEO header strip** at top of `/admin/launch-war-room`.

### C1. CEO Mode header (top of dashboard)
Pulled from `launch_pipeline_events` + `launch_mode_state` + `platform_operation_outcomes`:
- Activated contractors today
- MRR added today (sum of recommended_plan price for completed payments today)
- Pipeline value (sum of recommended_plan price for leads ≥ `OUTREACH_SENT` and < `PROFILE_ACTIVATED`)
- Payments pending (CHECKOUT_STARTED with no webhook)
- Next expected activation (oldest lead at `CHECKOUT_STARTED`)
- Days since last activation
- **Red banner** when `activated_today = 0`: "Aucun revenu généré aujourd'hui. Investiguer le pipeline."

### C2. Truth Panel funnel
9-stage horizontal funnel rendered from a single SQL view `v_launch_funnel` we add:
1. Companies discovered
2. Profiles created/enriched
3. SMS sent / Emails sent
4. Messages delivered
5. Messages opened
6. Activation links clicked
7. Stripe checkouts started
8. Payments completed
9. Activated contractors

Each cell shows count + conversion % to next stage + drop-off reason (top `failure_code`/`block_reason`).

### C3. Agent Health strip
Per agent (`launch-agent-*`, `launch-commander`, `launch-followup-engine`):
- Last run timestamp
- Records processed last run
- Success % (last 24h, computed from `launch_pipeline_events.success`)
- Top error message (last 24h)
- Current `block_reason`
- Next scheduled action (cron expression + next fire time)

### C4. Emergency "Run activation engine now" button
- Admin-only button calls new `launch-run-now` edge function.
- It runs Scout → Enrich → Visibility → Outreach → followups in sequence, with hard timeouts per step.
- Returns a structured report: `{ ran: [...], failed: [...], sent: {sms, email}, profiles_created, payments_pending }` rendered in a modal.

---

## Part D — Pipeline Watchdog (every 15 min)

New edge function `launch-pipeline-watchdog` + cron `*/15 * * * *`:
- Detects per-stage stalls (e.g. >50 leads stuck at `DISCOVERED` for >2h, or 0 transitions in last 30min for any stage).
- For each stall: insert `admin_notifications` row + update `launch_mode_state.last_blocker_*` with a specific message:
  - "Messaging agent generated N messages but Twilio rejected N/N."
  - "Stripe checkout created (count=N) but no webhook received in last 2h."
  - "Scraper discovered 0 contractors in Laval in last 6h."
- No generic strings — every alert references the agent + the exact metric.

---

## Part E — Live Activation Campaign config

Seed `launch_mode_state`:
- Cities: `Laval, Montréal, Terrebonne, Repentigny`
- Trades: `isolation, toiture, plomberie, électricité, hvac, peinture`
- Daily caps: SMS 50, Email 25, Activations 5
- Caps enforced inside `launch-agent-outreach` (count today's sends from `launch_pipeline_events`).

When a cap is hit, outreach exits with `block_reason='DAILY_CAP_REACHED'` (not failure).

---

## Files & schema

### New edge functions
- `supabase/functions/launch-agent-enrich-contact/index.ts`
- `supabase/functions/launch-run-now/index.ts`
- `supabase/functions/launch-pipeline-watchdog/index.ts`

### New shared modules
- `supabase/functions/_shared/launchEnforcement.ts` (proof contract + `transitionLead`)
- `supabase/functions/_shared/planSelector.ts`

### Edited edge functions
- `launch-commander`, `launch-agent-scout`, `launch-agent-enrich`, `launch-agent-visibility`, `launch-agent-outreach`, `launch-agent-delivery-monitor`, `launch-agent-reply-detector`, `launch-agent-sales-closer`, `launch-agent-activation`, `launch-agent-payment-monitor`, `launch-followup-engine`, `stripe-webhook`, `twilio-status-webhook`, `resend-inbound-webhook`, `activation-create-checkout`

### Migration (single file)
- `launch_leads`: add states to `lead_status` enum/check, add columns `recommended_plan TEXT`, `stripe_session_id TEXT`, `activated_at TIMESTAMPTZ`, `mrr_cents INT`.
- `launch_mode_state`: add `daily_activation_cap INT DEFAULT 5`, `target_cities TEXT[]`, `target_trades TEXT[]`.
- New table `launch_funnel_alerts` (id, stage, reason, count, created_at) + RLS admin-only.
- Create SQL view `v_launch_funnel` aggregating proofs by stage.
- Cron: schedule `launch-pipeline-watchdog` every 15min via `cron.schedule` (insert tool, not migration — contains the function URL + anon key).

### New frontend
- `src/pages/admin/AdminTruthPanel.tsx` (new route `/admin/truth-panel`)
- `src/components/admin/launch/CEOHeader.tsx`
- `src/components/admin/launch/FunnelStrip.tsx`
- `src/components/admin/launch/AgentHealthStrip.tsx`
- `src/components/admin/launch/RunNowButton.tsx`
- `src/hooks/useTruthPanel.ts`
- Inject `CEOHeader` + `RunNowButton` into existing `AdminLaunchWarRoom.tsx`.

### Secrets to request from user (before build steps that need them)
- `GOOGLE_PLACES_SERVER_KEY` (unrestricted, server-only) — to unblock Scout.
- Confirm presence of `TWILIO_*`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `FIRECRAWL_API_KEY` (verify via `fetch_secrets` before writing the agents that depend on them; ask the user for any that are missing).

---

## Out of scope (deliberately)

- Building net-new scraping sources beyond Google Places + Firecrawl fallback.
- Per-trade landing pages beyond what already exists.
- Rewriting `stripe-webhook` event handling for any flow other than the activation flow.

---

## Definition of done (the only "OK" we accept)

The system is considered fixed when, end-to-end, **without any human seeding**, we can show:
1. Scout inserts ≥ 1 row into `launch_leads` with `phone OR email`.
2. Enrich resolves/creates a `contractors` row.
3. Outreach gets Twilio/Resend 2xx and stores the provider id.
4. Webhook flips lead to `OUTREACH_DELIVERED`.
5. Activation page view event recorded for that lead.
6. Stripe checkout session created and `client_reference_id = lead_id`.
7. `checkout.session.completed` webhook flips contractor to `active + paid + visible` and lead to `PROFILE_ACTIVATED`.
8. CEO header shows `Activations today ≥ 1` and MRR > 0.

Until all 8 are true on a real lead, the dashboard shows the red banner and the watchdog keeps surfacing the exact blocker.
