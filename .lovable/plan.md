
# Truth Panel UI + Stripe Activation Wiring

Goal: prove the autonomous acquisition engine reaches **paid + activated contractors**, not just "agents ran". Surface the truth in `/admin/launch-war-room`, and close the loop from outreach → Stripe checkout → activation.

## 1. Truth Panel UI (`/admin/launch-war-room`)

New top section `<TruthPanel />` that reads `v_launch_funnel` + `v_launch_agent_health` + `launch_funnel_alerts` via `useLaunchWarRoom`.

### Hero strip — 6 truth tiles
- **Contractors activated** (green if ≥1, red if 0)
- **MRR added today** (sum of `mrr_cents` where `activated_at::date = today`)
- **Pipeline value** (sum of `recommended_plan_cents` for non-paid, non-blocked leads)
- **Payments pending** (count of `CHECKOUT_SENT` w/ `stripe_session_id`)
- **Next expected activation** (oldest `CHECKOUT_SENT` lead + age)
- **Days since last activation** (now() − max(`activated_at`))

### Red banner
If activated count = 0 across all time:
> "Aucun revenu généré. Le moteur d'acquisition est incomplet — enquêter sur le pipeline."

With one-click drill-down: "Voir le dernier blocage" → opens `launch_funnel_alerts` drawer filtered to most recent unresolved.

### Funnel waterfall
Single horizontal bar: DISCOVERED → ENRICHED → SCORED → MESSAGED → DELIVERED → REPLIED → CHECKOUT_SENT → PAID → ACTIVATED, with conversion % between each step. Red badge on any step where drop > 80%.

### Agent health table
From `v_launch_agent_health`: agent name, 24h runs, success rate, last error. Row turns red if success rate < 50% AND runs > 0.

## 2. Stripe Activation Wiring

### New edge function: `launch-agent-checkout-sender`
Picks `REPLIED` (or `SCORED` if `auto_send_checkout=true` in `launch_mode_state`) leads with `recommended_plan` set. For each:
1. Calls existing `create-contractor-checkout` (reused — no new Stripe code) with `plan_code: recommended_plan` and metadata `{ launch_lead_id, source: 'launch_mode' }`.
2. Stores `stripe_session_id` + checkout URL on `launch_leads`.
3. Sends the URL via existing outreach channel (SMS/email reused from current sender).
4. Transitions lead → `CHECKOUT_SENT`, logs `launch_pipeline_events` row `{ agent, event:'checkout_sent', payload:{ session_id, plan } }`.
5. Calls `reportOutcome()` (production reliability framework) with success/failure code.

### New edge function: `launch-stripe-webhook`
Public, no JWT. Verifies Stripe signature (`STRIPE_WEBHOOK_SECRET`).
- On `checkout.session.completed` with `metadata.launch_lead_id`: update lead → `PAID`, set `mrr_cents` from line items, emit event.
- On `customer.subscription.created`: trigger activation (next step).

### New edge function: `launch-agent-activator`
On `PAID` lead: ensure a `contractors` row exists (link via `contractor_id` already on lead, else create from enriched data), set `is_active=true`, attach `subscription_id`, mark lead `activated_at = now()`, transition → `ACTIVATED`. Emits `activated` event and `notification` to admin.

### Cron updates
Add to existing `pg_cron` job 45 (every minute): also call `launch-agent-checkout-sender` and `launch-agent-activator`. Webhook is push-based — no cron.

## 3. Migration

```sql
-- Idempotent: column likely missing
alter table public.launch_leads
  add column if not exists checkout_url text,
  add column if not exists subscription_id text;

-- Trigger: on launch_leads.lead_status = 'ACTIVATED', insert notification
create or replace function public.notify_launch_activation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.lead_status = 'ACTIVATED' and (old.lead_status is distinct from 'ACTIVATED') then
    insert into admin_notifications(kind, title, body, payload)
    values('launch_activation', 'Contractor activé', new.business_name, jsonb_build_object('lead_id', new.id, 'mrr_cents', new.mrr_cents));
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_launch_activation on public.launch_leads;
create trigger trg_notify_launch_activation
  after update on public.launch_leads
  for each row execute function public.notify_launch_activation();
```

## 4. Files

**Create**
- `src/components/admin/launch/TruthPanel.tsx`
- `src/components/admin/launch/FunnelWaterfall.tsx`
- `src/components/admin/launch/AgentHealthTable.tsx`
- `supabase/functions/launch-agent-checkout-sender/index.ts`
- `supabase/functions/launch-stripe-webhook/index.ts`
- `supabase/functions/launch-agent-activator/index.ts`
- migration `*_launch_activation_wiring.sql`

**Edit**
- `src/pages/admin/PageLaunchWarRoom.tsx` — mount `<TruthPanel />` at top
- `src/hooks/useLaunchWarRoom.ts` — also fetch `v_launch_funnel`, `v_launch_agent_health`, `launch_funnel_alerts` (top 5 unresolved)
- `supabase/config.toml` — `verify_jwt = false` for `launch-stripe-webhook` only

## Non-goals
- No new Stripe products/prices (reuse existing contractor plans).
- No changes to `create-contractor-checkout` internals.
- No changes to scout/enrich/score/message agents (Phase A is done).
- No homeowner flow changes.

## Open question
Confirm: should `launch-agent-checkout-sender` send checkout **after REPLIED only** (safer, human signaled interest) or **also auto-send on SCORED** when `launch_mode_state.auto_send_checkout=true` (more aggressive, true autonomous)? Default in plan: gated by `auto_send_checkout` flag, default `false`.
