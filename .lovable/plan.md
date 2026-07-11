## Root cause

The live Stripe endpoint `stripe-isr-webhook` is a narrow function built for the legacy "ISR / sms_live_run" acquisition test flow. It:

- reads a wrong secret (`STRIPE_ISR_WEBHOOK_SECRET` — the signing secret Stripe is currently sending was rotated/mismatched, producing signature failures),
- ignores every event except `checkout.session.completed` with `metadata.source === "sms_live_run"`,
- has no idempotency store, no activation logic for real UNPRO contractors, no subscription sync, no support for `invoice.*`, `payment_intent.*`, `customer.subscription.*`, refunds, or disputes,
- returns HTTP 400 on any error (including transient DB errors), so Stripe keeps retrying and marks them as failed deliveries.

Result: 23 failed live deliveries since 2026-07-08 and every real UNPRO payment since then is unreconciled.

## Solution — build `stripe-unpro-webhook` and retire ISR from the UNPRO flow

### 1. New edge function `supabase/functions/stripe-unpro-webhook/index.ts`
- `verify_jwt = false` in `supabase/config.toml`.
- Read raw body via `req.text()`, verify `stripe-signature` with `UNPRO_STRIPE_WEBHOOK_SECRET` using `constructEventAsync` **before** any parsing.
- Validate `event.livemode === true` and `event.account === "acct_19AhHrCvZwK1QnPV"` (skip in test).
- Idempotency: upsert `unpro_stripe_webhook_events` on `stripe_event_id`; if `processed` → return 200 no-op.
- Wrap side-effects in try/catch per handler; SMS/email/analytics failures are logged but do NOT fail the webhook (return 200). Only Stripe-signature and unrecoverable DB errors return non-2xx.
- Quarantine events whose Checkout metadata contains `platform=isr` / `brand=isr` (record `ignored`, return 200, raise admin alert).

### 2. Supported events
`checkout.session.{completed,async_payment_succeeded,async_payment_failed,expired}`, `payment_intent.{succeeded,payment_failed}`, `invoice.{paid,payment_failed,payment_action_required}`, `customer.subscription.{created,updated,deleted,trial_will_end}`, `charge.refunded`, `charge.dispute.created`. Unknown → `ignored` + 200.

### 3. Database migration
- `unpro_stripe_webhook_events` (columns per spec, unique on `stripe_event_id`, status enum: `received|processing|processed|ignored|retry_pending|failed|dead_letter`).
- `unpro_payment_activation_audit` (contractor_id, prospect_id, event_id, session_id, pi_id, subscription_id, action, prev/new status, amount, currency, source, campaign, result, error, timestamps).
- Extend `contractor_subscriptions` with normalized fields if missing (`stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `plan_code`, `stripe_status`, `unpro_access_status`, `trial_start/end`, `current_period_start/end`, `cancel_at`, `latest_invoice_id`).
- Stripe→UNPRO status mapping table (or in code): `trialing→trial_active`, `active→active`, `incomplete→payment_incomplete`, `incomplete_expired→activation_failed`, `past_due→past_due`, `unpaid→suspended_payment`, `paused→paused`, `canceled→canceled`.
- Standard grants + RLS (service_role only; admin read via `has_role`).

### 4. $1 activation flow (checkout.session.completed)
Guard: `livemode`, correct account, `platform=unpro`, `brand=unpro`, `payment_status in (paid, no_payment_required)`.
Then: resolve contractor by immutable `metadata.contractor_id` / `contractor_profile_id` (never email/phone), save customer/subscription IDs, mark `$1` activation completed, activate trial or selected plan, unlock onboarding step, update prospect status, insert audit row, enqueue confirmation SMS + email. Idempotent by `stripe_event_id` + `session.id`.
Remove any client-side activation from the success page — webhook is source of truth.

### 5. Reconciliation edge function `stripe-unpro-reconcile`
- Lists Stripe events since `2026-07-08T03:44:57Z` filtered to UNPRO metadata.
- Dry-run mode: reports missing local records + inactive-paid contractors + subscription mismatches.
- Apply mode: replays missed events through the same handler (idempotent). Never re-charges, never duplicates messages (dedupe on audit table).
- Callable from admin cockpit.

### 6. ISR isolation in the UNPRO flow
- Audit produces a report of every hit for `stripe-isr-webhook`, `ISR`, `isr`, `Isolation Solution Royal`, `STRIPE_ISR_*`.
- Classify each: standalone-ISR (untouched), UNPRO-cross-brand (remove), dead code (remove).
- `create-isr-*`, `confirm-isr-*`, `approve-isr-sms`, `sync-acquisition-funnel-state`, `stripe-live-verification`: leave the standalone ISR sandbox intact **but** strip any code path that activates UNPRO contractors from ISR metadata. Add a guard in the new webhook that quarantines ISR-tagged events.
- Update `pricing-create-checkout` and any UNPRO checkout creators to always inject the required metadata (`platform=unpro`, `brand=unpro`, `environment=production`, `contractor_id`, `contractor_profile_id`, `prospect_id`, `user_id`, `plan_code`, `offer_code`, `activation_type`, `source`, `campaign_id`, `onboarding_session_id`). For the $1 trial add `offer_code=contractor_activation_1_dollar`, `activation_type=trial_activation`.

### 7. Admin cockpit — "UNPRO Stripe Revenue Health"
New section inside `/admin/operations` showing: active vs expected webhook URL, last success/fail, HTTP status distribution, counts (processed/failed/retry_pending/duplicates), payments missing locally, paid-but-not-activated contractors, subscription mismatches, secret configuration status, ISR dependency count, latest deploy. Actions: run health test, ISR contamination scan, reconciliation dry-run, apply repairs, retry failed event, open error details. Status badge: `HEALTHY | DEGRADED | CRITICAL | BLOCKED_BY_UNPRO_STRIPE_SECRET | ISR_DEPENDENCY_DETECTED`.

### 8. Secrets (require manual user action)
Request via `add_secret`:
- `UNPRO_STRIPE_SECRET_KEY` — live secret key for `acct_19AhHrCvZwK1QnPV`.
- `UNPRO_STRIPE_WEBHOOK_SECRET` — endpoint signing secret from the **new** Stripe webhook endpoint (only obtainable after user creates it in Stripe dashboard pointing at `https://clmaqdnphbndvmmqvpff.supabase.co/functions/v1/stripe-unpro-webhook`).

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are already injected by the platform.

### 9. Stripe endpoint migration (user-side steps I will document)
1. Deploy `stripe-unpro-webhook`.
2. User creates the new endpoint in Stripe, subscribes to the event list above, copies signing secret into `UNPRO_STRIPE_WEBHOOK_SECRET`.
3. Resend one previously failed live event to the new URL.
4. Confirm HTTP 200 + row in `unpro_stripe_webhook_events` + audit row + contractor activated.
5. Run reconciliation dry-run, then apply.
6. Only then disable the old `stripe-isr-webhook` endpoint in Stripe. The edge function itself is left deployed but neutered (returns 410 + admin alert) so any stragglers surface.

### 10. Test matrix (documented + scripted via `stripe-unpro-webhook` test harness)
Valid signed event, invalid signature (400), missing signature (400), duplicate (200 no-op), unknown event (200 ignored), $1 completion (activation once), missing metadata (200 quarantined + alert), ISR metadata (200 quarantined + alert), paid/failed invoice, subscription created/canceled, DB failure (retry_pending 500), SMS failure (200), duplicate activation attempt (no-op), test-mode → prod (rejected), ISR customer reference (rejected).

## Files

Create:
- `supabase/functions/stripe-unpro-webhook/index.ts`
- `supabase/functions/stripe-unpro-webhook/handlers.ts` (per-event handlers)
- `supabase/functions/stripe-unpro-reconcile/index.ts`
- `supabase/functions/_shared/unproStripe.ts` (metadata guards, status mapping, audit helper)
- `supabase/migrations/<ts>_unpro_stripe_webhook.sql`
- `src/pages/admin/PageAdminUnproStripeHealth.tsx` + route + nav entry inside operations hub
- `src/features/admin/unproStripeHealth/*` (cards, actions)

Edit:
- `supabase/config.toml` (add `[functions.stripe-unpro-webhook]` + `[functions.stripe-unpro-reconcile]`, both `verify_jwt = false`; leave old ISR block untouched for now)
- `supabase/functions/stripe-isr-webhook/index.ts` — neuter to 410 Gone once new endpoint is live (kept as file to avoid Stripe 404s if not deleted in Stripe dashboard yet)
- `supabase/functions/pricing-create-checkout/index.ts` and any UNPRO checkout creators — enforce UNPRO metadata
- `src/pages/checkout/*` success page — remove client-side activation, keep polling for webhook state
- `src/app/router.tsx` — register new admin page

## Success criteria (before I report success)
- Live Stripe event resent → HTTP 200 recorded in `unpro_stripe_webhook_events`.
- Corresponding contractor row shows `activated`, subscription row synced, audit row present.
- Reconciliation dry-run returns zero drift after apply.
- Admin cockpit shows status `HEALTHY` and no ISR dependency.
- Old ISR endpoint disabled in Stripe.

Anything short of that is reported as `DEGRADED`, `CRITICAL`, `BLOCKED`, or `ISR_DEPENDENCY_DETECTED` with details.
