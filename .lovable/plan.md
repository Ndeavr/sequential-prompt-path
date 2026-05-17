## Diagnostic

The empty payment area after login is coming from the embedded Stripe checkout, not the admin live-runs page.

Confirmed signal:
- The UI screenshot shows Stripe Embedded Checkout rendering: “Something went wrong”.
- `create-checkout-session` Edge Function logs show `Deno.core.runMicrotasks() is not supported in this environment`.
- The function imports Stripe with `https://esm.sh/stripe@17.7.0?target=deno` and the backend import uses `@supabase/supabase-js@2.49.4`; project memory requires Edge Functions to use `https://esm.sh/@supabase/supabase-js@2.49.1` to avoid this exact microtask failure.

## Plan

1. **Repair `create-checkout-session` runtime**
   - Replace the fragile Stripe import with the same stable Stripe version already used elsewhere: `https://esm.sh/stripe@18.5.0`.
   - Pin Supabase Edge import to `https://esm.sh/@supabase/supabase-js@2.49.1`.
   - Keep the existing auth, plan catalog, promo, zero-dollar activation, and embedded checkout logic intact.

2. **Fix embedded checkout response safety**
   - Validate that Stripe returns `session.client_secret` when `ui_mode = "embedded"`.
   - If missing, return a clear JSON error before the frontend renders a blank Stripe box.
   - Preserve CORS headers on every response.

3. **Add frontend recovery on embedded checkout surfaces**
   - Update `InlineCheckoutNuclear` and `InlineStripeCheckout` so Stripe failures do not leave a dead empty payment panel.
   - Show a premium UNPRO error state with:
     - “Paiement ralenti”
     - retry action
     - return-to-plan action
   - Prevent the raw Stripe “Something went wrong” panel from being the only visible feedback.

4. **Validate the function directly**
   - Deploy/test `create-checkout-session`.
   - Invoke it with the current logged-in preview session.
   - Confirm no microtask error appears in function logs.
   - Confirm the response includes a `clientSecret` for embedded checkout or a clear actionable JSON error.

5. **Validate user flow**
   - Reload the page after login.
   - Reopen the checkout.
   - Confirm the payment module either renders correctly or shows UNPRO’s retry state instead of an empty/black Stripe box.

## Files to change after approval

- `supabase/functions/create-checkout-session/index.ts`
- `src/components/pro-landing/InlineCheckoutNuclear.tsx`
- `src/components/pricing/InlineStripeCheckout.tsx`

## Success

- Login returns to the checkout without an empty page.
- Embedded Stripe no longer fails from the Edge Function microtask runtime issue.
- User sees a recoverable checkout state if Stripe or the backend is temporarily unavailable.