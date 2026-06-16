# Autonomous Contractor SMS Onboarding — Production Wire-Up

Goal: every new contractor lead automatically enters a 4-step SMS sequence that runs without manual action and stops the instant a subscription is paid. Existing manual test SMS, Twilio creds, and send-window policy stay intact.

---

## 1. Schema (single migration)

**New tables** (RLS + GRANT to `authenticated` read-own / `service_role` all):

- `onboarding_sequences` — `id, contractor_lead_id, status, current_step, next_send_at, last_sent_at, stopped_reason, created_at, updated_at`
  - status enum: `active | waiting | completed_paid | completed_unsubscribed | failed | paused`
- `outbound_messages` — `id, contractor_lead_id, channel, to_phone, body, body_hash, status, twilio_message_sid, error_message, scheduled_at, sent_at, delivered_at, created_at`
  - status enum: `queued | sending | sent | delivered | failed | undelivered | skipped`
  - unique index `(to_phone, body_hash)` partial WHERE sent_at > now()-7d for dedupe
- Indexes on `next_send_at`, `contractor_lead_id`, `twilio_message_sid`.

**Existing tables touched:**
- `contractor_leads`: extend `pipeline_status` check to include `ready_for_outreach, contacted, replied, onboarding_started, payment_started, paid, paused, unsubscribed`; add `last_sms_status text`, `unsubscribed_at timestamptz`.
- `contractor_subscriptions`: already exists — verify columns `stripe_customer_id, stripe_subscription_id, status, plan, paid_at`; add any missing.

**Trigger:** `AFTER INSERT OR UPDATE OF pipeline_status ON contractor_leads` → when status becomes `ready_for_outreach` AND phone valid AND not unsubscribed AND no active sequence AND not paid → insert `onboarding_sequences (status='active', current_step=0, next_send_at=now())`.

---

## 2. Edge function `run-contractor-onboarding-worker`

Cron `*/5 * * * *` via pg_cron + pg_net (separate `supabase--insert` call, not migration, since it contains the anon key).

Per run:
1. Insert `agent_runs` row (`agent_name='contractor_onboarding_worker'`, started_at).
2. Select `onboarding_sequences` where `status='active' AND next_send_at <= now()` LIMIT 200.
3. For each: re-check lead is not paid/unsubscribed/invalid phone (defensive); check global daily cap (50/day, configurable via `outbound_global_settings`); check per-lead 24h cooldown; check `_shared/sendWindow.ts` (9-20 America/Toronto for SMS class `prospection`); check 7-day body+phone dedupe.
4. If blocked → bump `next_send_at` to next valid window, write `outbound_messages` row `status='skipped'` with reason, increment `messages_skipped`.
5. Else → render step body from template registry (steps 1-4), POST via existing `_shared/twilioSend.ts` (which already enforces send window via prior work), insert `outbound_messages` with returned SID, set `last_sms_status='sent'` on lead, advance sequence (`current_step++`, `last_sent_at=now()`, `next_send_at = now() + interval(24/24/24h)`); after step 4 set `status='waiting'` and stop scheduling.
6. Terminal `agent_runs` outcome via `reportOutcome()`:
   - `messages_sent > 0` → `achieved`
   - eligible leads present but all blocked → `blocked` (BlockReason.OUT_OF_WINDOW / QUIET_HOURS_DAILY_CAP / DUPLICATE)
   - no eligible leads → `pending` with `next_action='no_eligible_leads'`
   - **never** report `achieved` when `messages_sent=0`.

---

## 3. SMS templates

Hard-coded constant `ONBOARDING_STEPS` in shared module:
```
[
 { step:1, delay_h:0,  body:"Bonjour {{business_name}}, voulez-vous..." },
 { step:2, delay_h:24, body:"Votre profil UNPRO est prêt..." },
 { step:3, delay_h:48, body:"Les entreprises qui laissent..." },
 { step:4, delay_h:72, body:"Dernier suivi UNPRO..." },
]
```
Variables resolved: `business_name` from `contractor_leads`, `private_profile_url` = `https://app.unpro.ca/pro/<slug>?t=<token>` (reuse Nuclear Close landing tokens).

---

## 4. Inbound + status callbacks

- **Existing `twilio-status-v2`**: extend handler — on `delivered/undelivered/failed/sent`, update `outbound_messages` by `twilio_message_sid` AND mirror to `contractor_leads.last_sms_status`.
- **Existing `twilio-inbound`**: detect STOP/ARRÊT/UNSUBSCRIBE → set lead `pipeline_status='unsubscribed'`, `unsubscribed_at=now()`; mark all active sequences `completed_unsubscribed`; cancel queued `outbound_messages` (`status='skipped'`, error='unsubscribed'). Any other reply → `status='replied'`, pause sequence (`status='paused'`, reason='reply_received').

---

## 5. Payment stop condition

Stripe webhook (`launch-stripe-webhook` already wired): on `customer.subscription.created/updated` with status `active|trialing|paid`:
- upsert `contractor_subscriptions` (status='active', paid_at=now()).
- find lead via customer email/phone → `pipeline_status='paid'`.
- set active sequences `status='completed_paid'`.
- delete/skip future `outbound_messages` where `status='queued'` for that lead.
- ensure contractor profile public.

---

## 6. Admin monitor

Add `<OperationHealthCard>` "Autonomous Outreach" to **`PageAdminAcquisitionAutopilot`** (and `PageSmsHealth`):
- sent today / queued next 24h / active sequences / paid conversions today / failed / blocked (out-of-window) / last worker run time + outcome.
- Buttons: **Run worker now** (invoke edge function), **Pause outreach** / **Resume** (toggle `outbound_global_settings.outreach_paused`), **Send test to my phone** (existing `sms-admin-test`).

Worker honors the pause flag at top of run.

---

## 7. Reliability & compliance reuse

- Reuse `_shared/sendWindow.ts` (9-20 Toronto for `prospection`) — no new gating logic.
- Reuse `_shared/twilioSend.ts` for actual send (already returns deferred_window).
- Reuse `_shared/reliability.ts`: `withRetry` for Twilio call, canonical `FailureCode.TWILIO_*` and `BlockReason.OUT_OF_WINDOW | QUIET_HOURS_DAILY_CAP | DUPLICATE_BODY | UNSUBSCRIBED | INVALID_PHONE | DAILY_CAP_REACHED`. Add missing codes to `src/lib/reliability/types.ts` + `_shared/reliability.ts`.
- 50/day global cap stored in `outbound_global_settings` (already exists).

---

## 8. Success validation

Browser-driven Playwright check after deploy:
1. Insert test lead via SQL (valid phone, status `ready_for_outreach`).
2. Curl invoke `run-contractor-onboarding-worker`.
3. Assert `outbound_messages` row has Twilio SID, `agent_runs` row outcome=`achieved`, sequence `current_step=1`, `next_send_at ≈ now+24h`.
4. Simulate Stripe webhook → assert sequence flips to `completed_paid` and queued rows removed.

---

## Files

**New**
- `supabase/migrations/<ts>_autonomous_onboarding.sql` (schema + trigger)
- `supabase/functions/run-contractor-onboarding-worker/index.ts`
- `supabase/functions/_shared/onboardingTemplates.ts`
- `src/components/admin/AutonomousOutreachCard.tsx`

**Edited**
- `supabase/functions/twilio-status-v2/index.ts` (mirror to outbound_messages + lead)
- `supabase/functions/twilio-inbound/index.ts` (STOP + reply handling)
- `supabase/functions/launch-stripe-webhook/index.ts` (paid stop condition)
- `supabase/functions/_shared/reliability.ts` + `src/lib/reliability/types.ts` (new BlockReasons)
- `supabase/config.toml` (register `run-contractor-onboarding-worker`)
- `src/pages/admin/PageAdminAcquisitionAutopilot.tsx` + `PageSmsHealth.tsx` (mount card)
- `src/integrations/supabase/types.ts` (auto-regen after migration)

**Cron** registered via `supabase--insert` (not migration) after function deploy.

No existing flow disabled. Manual `sms-admin-test` and Twilio creds untouched.
