# Fix: $1 activation checkout mismatch + personalized activation page + flow verification

## Problem (root cause)

`supabase/functions/pro-founder-checkout-guest/index.ts` builds the checkout with:
- `billing_cycle_anchor = now + 7 days` + `proration_behavior: "none"` → **CA$0.00 due today**
- A single subscription line at $149/mo + `$148 off once` coupon → first invoice on day 7 = **CA$1.00**
- Then subsequent monthly invoices = **CA$1.00 / month "until coupon expires"** (Stripe UI wording shown in screenshot)

The landing page (`FounderOfferCard`) advertises **"1 $ pour 7 jours puis 149 $/mois"**, but Stripe actually renders "$0 today · then $1/month". Contradictory pricing → mistrust.

## Fix — Option A (charge $1 today, $149/mo after 7 days)

Rewrite the Stripe Checkout session in `pro-founder-checkout-guest/index.ts` to use **two line items in one session**:

1. **One-time line item** — `price_data` unit_amount = 100 CAD cents, product name "UNPRO — Activation 7 jours".
2. **Subscription line item** — recurring $149/mo with `subscription_data.trial_period_days: 7` and `trial_settings.end_behavior.missing_payment_method: "pause"`.

Remove: the `fondateur-trial-7d-1` coupon, `billing_cycle_anchor`, `proration_behavior`, and the `discounts` array.

Stripe will render exactly:
- **CA$1.00 due today**
- **Then CA$149.00 per month after your 7-day free trial**

This matches the landing copy without changing marketing.

Keep `automatic_tax` and `tax_id_collection`. Keep all metadata (add `offer: "fondateur_1cad_7d_then_149"`).

Same treatment for the one-off `create-activation-checkout` function is not needed — it already charges $1 as a pure one-time payment; but audit its `success_url` to make sure it hits the same activation flow.

## Personalized activation page

`src/pages/pro/PageProActivate.tsx`:
- Read `trade` + `city` from the URL/query state already parsed into `form`.
- When both are non-empty, render a new `LocalizedDemandCard` **above** `<FounderOfferCard>`. When either is missing, fall back to the existing generic offer card only.
- Copy: `"Des propriétaires recherchent actuellement un entrepreneur en {trade} à {city}."` with a small live badge ("En temps réel · UNPRO") and a subtle count placeholder (`"Zone active — {city}"`). No fake numbers; if we don't have a real count we show only the qualitative sentence.
- Component lives at `src/components/first-customer-48h/LocalizedDemandCard.tsx`, dark theme consistent with the existing card.

## Complete payment flow verification + admin logging

Add lightweight step logging so the full chain is observable:

1. **`checkout_started`** — already logged in `pro-founder-checkout-guest` via `founder_score_prospects.status`. Also insert one row into a new/existing `activation_flow_events` table with `(prospect_id, email, step, status, stripe_session_id, metadata, created_at)`.
2. **`stripe_payment_succeeded`** — in `stripe-webhook/index.ts` `checkout.session.completed` handler, insert step `stripe_payment_succeeded` when `payment_status === "paid"`.
3. **`webhook_received`** — insert step at the top of the webhook (before business logic) with the event id + type.
4. **`subscription_created`** — on `customer.subscription.created`.
5. **`contractor_activated`** — on the existing `activated_at` write path.
6. **`profile_published`** — hook the existing publish step.
7. **`dashboard_access_granted`** — after profile publish, insert final step.

Migration: create `public.activation_flow_events` (id, prospect_id nullable, email, step text, status text default 'ok', stripe_session_id text, stripe_event_id text, metadata jsonb, created_at timestamptz default now()) with GRANTs + RLS (service_role all, authenticated select own by email, admin select all via `has_role`).

Admin surface: extend `src/pages/admin/PageAdminAcquisitionTests.tsx` (or the existing acquisition dashboard) with a new **"Activation Flow Health"** table showing the last 50 events grouped by `stripe_session_id`, with per-step pass/fail dots for the 7 steps above.

## Files touched

- `supabase/functions/pro-founder-checkout-guest/index.ts` — rewrite session
- `supabase/functions/stripe-webhook/index.ts` — insert flow events at each stage
- `supabase/migrations/<ts>_activation_flow_events.sql` — new table + GRANT + RLS
- `src/pages/pro/PageProActivate.tsx` — mount LocalizedDemandCard when trade+city present
- `src/components/first-customer-48h/LocalizedDemandCard.tsx` — new
- `src/pages/admin/PageAdminAcquisitionTests.tsx` — add Activation Flow Health panel (or a small new admin page linked from acquisition tests)

## Success criteria

- Stripe checkout page shows **CA$1.00 due today**, **CA$149.00/month after 7-day trial** (Option A).
- Landing page and Stripe agree on price; no coupon wording on Stripe.
- Activation page shows city+trade demand card when both known.
- `activation_flow_events` records the 7 canonical steps for every real test purchase; admin panel shows pass/fail per session.
- No regression on `create-activation-checkout` one-off path.
