## Goal

End-to-end live acquisition run for **Isolation Solution Royal** (isroyal.ca / 514-249-9522) reusing the existing UNPRO acquisition stack — no rebuild, no mocks, no premature SMS, $1 promo Stripe checkout.

## What already exists (reuse, don't rebuild)

- **DB tables**: `contractor_prospects`, `contractor_prospect_enrichment`, `contractor_aipp_scores`, `contractor_aipp_audits`, `sniper_targets`, `sniper_send_queue`, `sniper_message_variants`, `sniper_engagement_events`, `pipeline_logs`.
- **Edge functions**: `sniper-import-targets`, `sniper-enrich-target`, `sniper-generate-assets`, `sniper-queue-send`, `sniper-update-heat`, `aipp-real-scan`, `edge-generate-aipp-preview`, `acq-sms-send`, `send-sms-prospect`.
- **Routes**: `/pro/:slug` → `PageProLandingNuclearClose` (already mounted in `src/app/router.tsx:814`).
- **Admin UI**: `src/pages/admin/PageSniperCommandCenter.tsx` exists but is NOT routed.
- **Stripe**: Native Payment Element checkout, fixed PK, existing plan SKUs (Pro 349 / Premium 599 / Élite 999).

## Scope — 5 focused additions

### 1. New `live_acquisition_runs` table + `acquisition_run_steps`

Track the 12-step pipeline (search → extracted → aipp → page → sms_drafted → sms_approved → sms_sent → link_clicked → plan_viewed → checkout_started → payment_completed → activated) per prospect. Each step row: `status pending|running|succeeded|failed|blocked`, `logs jsonb`, `started_at`, `completed_at`, `retry_count`. RLS: admin-only.

### 2. New edge function `run-live-acquisition`

Single orchestrator. Input: `{ prospect_seed }` (or `prospect_id` to resume). Steps:

1. **Search + extract** → call `aipp-real-scan` against `https://isroyal.ca` via Firecrawl (already wired). Persist company_name, phone, email, services, cities, trust signals → `contractor_prospects` + `contractor_prospect_enrichment`.
2. **AIPP scoring** → call `aipp-v2-analyze`, store in `contractor_aipp_scores` + `contractor_aipp_audits`.
3. **Page ready** → no extra fetch; `/pro/isolation-solution-royal` reads `contractor_prospects.slug` lookup (already handled by `PageProLandingNuclearClose`).
4. **SMS draft** → call `sniper-generate-assets` to produce the FR variant, persist in `sniper_message_variants` with status `draft_awaiting_approval`. **Does not send.**
5. Returns the run id; subsequent steps gated on admin action.

Validation via Zod. CORS via `npm:@supabase/supabase-js@2/cors`.

### 3. $1 promo Stripe SKU + checkout edge function `create-isr-promo-checkout`

- Create one new Stripe **Product**: "UNPRO Premium — Activation 1$ (Promo Live Run)" with **two prices**: one-time $1 CAD (`promo_initial`) + recurring $599/month CAD (`premium_recurring`).
- Edge fn creates a Checkout Session in `mode: subscription` with `subscription_data.trial_period_days: 0` and an `invoice_items` style $1 add-on via `add_invoice_items` to the first invoice. Metadata: `contractor_name=Isolation Solution Royal`, `prospect_id`, `source=sms_live_run`, `campaign=isr_first_live_test`, `phone=5142499522`, `website=https://isroyal.ca`, `run_id`.
- `success_url=/pro/isolation-solution-royal/success`, `cancel_url=/pro/isolation-solution-royal?cancelled=1`.
- On `checkout.session.completed` (handled in existing stripe-webhook handler — extend with one new branch keyed on `source=sms_live_run`): mark run step `payment_completed` + `activated`, create contractor profile if missing, log to `pipeline_logs`.

### 4. Personalization on `/pro/isolation-solution-royal`

`PageProLandingNuclearClose` already personalizes by slug. Confirm it renders the new fields if `contractor_prospects` row is present:
- "Votre profil UNPRO est prêt"
- company name, website, phone, primary category (Isolation d'entretoit)
- AIPP score + tier
- Visibility opportunities + AI citation gaps (from `aipp-real-scan` `gaps` JSON)
- Estimated monthly appointment potential (from `revenue_potential_score` × tier baseline)
- Recommended plan = **Premium** preselected; Pro + Élite shown smaller
- Primary CTA: "Activer mon profil pour 1$" → `create-isr-promo-checkout`

No design changes — only ensure the existing template binds these fields. If a binding is missing, add it; if all present, no edit needed.

### 5. Admin Live Runs panel

- Mount `/admin/live-runs` in `src/app/router.tsx` rendering a new `PageAdminLiveRuns.tsx` (separate from existing `PageSniperCommandCenter` so we don't disturb it).
- Page shows table of `live_acquisition_runs` rows. ISR row expandable into the 12-step timeline with per-step status badge, logs viewer, **Retry** button (re-invokes the orchestrator at that step), and **Rollback** button (only safe for steps before SMS approval).
- **SMS preview + approval gate**: shows draft FR message exactly as it will be sent, with placeholders resolved (`{{short_tracking_link}}` → real `https://api.unpro.ca/t/{token}`). Buttons:
  - "Dry-run to my admin phone" — uses the admin user's phone stored in `profiles.phone`.
  - "Approve & Send to prospect" — only enabled after admin types prospect phone to confirm.
- After approval: insert into `sniper_send_queue`, `acq-sms-send` picks it up. Track click via existing `sniper_engagement_events`.

### Safety / compliance

- **Phone format check** (E.164 `+15142499522`) before any send action; orchestrator refuses otherwise.
- **STOP keyword footer** is already enforced in `acq-sms-send` — confirm presence, do not duplicate.
- Refuse to send if `sniper_targets.outreach_status='opted_out'`.
- All SMS go through `sniper_send_queue` so audit + rate limits stay intact.

## SMS copy (FR, exact)

```
Bonjour Isolation Solution Royal — UNPRO a préparé votre profil IA local pour l'isolation d'entretoit sur la Rive-Nord. On a détecté des occasions de visibilité sur Google, ChatGPT et les recherches locales. Votre page est prête ici: {{short_tracking_link}}  Activation aujourd'hui: 1$.

Stop = répondre STOP.
```

Short link → existing tracking edge fn (or add `/t/:token` resolver if missing).

## Migrations

Two migrations:

**A. live runs schema**
```sql
create table public.live_acquisition_runs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.contractor_prospects(id),
  campaign text not null,
  status text not null default 'running',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.acquisition_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.live_acquisition_runs(id) on delete cascade,
  step_key text not null,
  status text not null default 'pending',
  logs jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  retry_count int not null default 0,
  unique(run_id, step_key)
);
alter table public.live_acquisition_runs enable row level security;
alter table public.acquisition_run_steps enable row level security;
create policy "admins read runs" on public.live_acquisition_runs for select using (public.has_role(auth.uid(),'admin'));
create policy "admins write runs" on public.live_acquisition_runs for all using (public.has_role(auth.uid(),'admin'));
create policy "admins read steps" on public.acquisition_run_steps for select using (public.has_role(auth.uid(),'admin'));
create policy "admins write steps" on public.acquisition_run_steps for all using (public.has_role(auth.uid(),'admin'));
```

**B. ISR seed prospect** (single INSERT via supabase--insert tool, not migration):
- Insert ISR into `contractor_prospects` with slug `isolation-solution-royal`, website, phone, category, city.

## Validation (run after build)

1. From `/admin/live-runs`, click "Start ISR Live Run".
2. Orchestrator runs steps 1–4 visibly. ISR row in `contractor_prospects` is real (not mock).
3. Open `/pro/isolation-solution-royal` in incognito → personalized content renders, Premium preselected, "Activer pour 1$" CTA visible.
4. Click CTA → Stripe Checkout opens with $1 due today + $599/mo subscription preview. Use Stripe test card `4242 4242 4242 4242`.
5. Admin panel reflects `checkout_started` → `payment_completed` → `activated`.
6. SMS panel: click "Dry-run to admin phone" → admin phone receives the exact preview. **No SMS to 514-249-9522 yet.**
7. Existing routes (`/`, `/alex`, `/admin/sniper` if added, `/pro/*` other slugs) still work — smoke check 3 routes.

## Non-goals

- Re-styling `PageProLandingNuclearClose` (only data binding fixes if needed).
- Rebuilding Sniper Command Center.
- Voice/Alex/orb changes.
- Auth changes.
- Changing existing $599 Premium SKU — promo is a separate price.

## Risk callouts

- **Real SMS to a real business** — admin approval gate is the only safeguard. The orchestrator must never auto-advance past `sms_drafted`.
- The $1 promo only makes sense if combined with the recurring subscription; otherwise it's just a $1 sale. Plan uses Stripe `add_invoice_items` so the first invoice = $1, second invoice (in 30 days) = $599. Confirm this aligns with intent before launch.
