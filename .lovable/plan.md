## Goal
Show a "1 $ le premier mois, puis 149 $/mois" offer on the Fondateur card and apply that discount automatically at Stripe checkout — no coupon code required.

## UI changes — `src/components/first-customer-48h/FounderOfferCard.tsx`
- Replace the price block:
  - Big gold price: `1 $` with small `premier mois`
  - Below, smaller muted line: `puis 149 $/mois · annulable en tout temps`
- Add a subtle gold ribbon under the badges: `Essai Fondateur · 148 $ de rabais le 1er mois`
- Keep CTA label "Activer mon profil" but update microcopy under the button:
  `Paiement sécurisé via Stripe · 1 $ aujourd'hui, puis 149 $/mois`

## Checkout changes — `supabase/functions/pro-founder-checkout-guest/index.ts`
- Create (once, idempotent via lookup) a Stripe coupon `fondateur-first-month-1` = `amount_off: 14800, currency: cad, duration: once`.
  - On each invocation: `stripe.coupons.retrieve('fondateur-first-month-1')`; if 404, `stripe.coupons.create({ id: 'fondateur-first-month-1', amount_off: 14800, currency: 'cad', duration: 'once', name: 'Fondateur — 1$ premier mois' })`.
- Pass `discounts: [{ coupon: 'fondateur-first-month-1' }]` on the Checkout Session.
- Remove `allow_promotion_codes: true` (Stripe forbids combining `discounts` with promo codes). Keep everything else identical (subscription mode, tax, metadata, success/cancel URLs).

## Out of scope
- No DB/schema changes, no plan-price changes, no new edge functions, no analytics changes.
- Renewal price stays 149 $/mo; only the first invoice is discounted to 1 $.