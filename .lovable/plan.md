

## Plan: Combined First Payment (Subscription + One-Time RDV Pack)

### Problem
The checkout page sends `appointmentPack` data to the edge function, but `create-checkout-session` ignores it entirely. The extra RDV pack (e.g. 720$) is never added to Stripe — only the subscription line item is created.

### Solution
Add the appointment pack as a **one-time price line item** in the same Stripe Checkout session. Stripe supports mixing `mode: "subscription"` with one-time `price_data` items natively.

### Changes

**1. Edge Function: `supabase/functions/create-checkout-session/index.ts`**

- Parse `appointmentPack` from request body (`{ size, totalPriceCents, unitPriceCents }`)
- If present, add a second line item with `price_data` (one-time, CAD):
  ```
  {
    price_data: {
      currency: "cad",
      product_data: {
        name: `${size} rendez-vous à la carte`,
        metadata: { type: "appointment_pack", size }
      },
      unit_amount: totalPriceCents,  // already in cents
    },
    quantity: 1
  }
  ```
- Add pack metadata to `checkoutConfig.metadata` (`appointment_pack_size`, `appointment_pack_total_cents`)
- Store pack info in the `checkout_sessions` DB record (using existing columns or metadata)

**2. Frontend: `src/pages/checkout/PageCheckoutStripe.tsx`** — No changes needed (already sends `appointmentPack`)

### Result
- User sees one Stripe Checkout with: **999$/mois subscription + 720$ one-time**
- First charge = 1 719$ + taxes
- Recurring = 999$/mois
- The Stripe receipt clearly separates both items

### Files Changed
1. `supabase/functions/create-checkout-session/index.ts` — Add one-time line item for appointment pack (~15 lines)

