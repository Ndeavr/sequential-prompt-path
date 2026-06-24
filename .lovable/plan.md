
# Pricing Consistency Fix — Personalized Quote = Single Source of Truth

## Root cause

The personalized quote price (e.g. **393 $/mois** for Pro at +12.5%) is computed in `contractor_pricing_quotes` and displayed on `PageContractorPersonalizedPlan` (`/entrepreneur/plan-personnalise/:quoteId`), but:

1. **`PageContractorCheckout`** (the activation screen showing 599 $) reads only `CONTRACTOR_PLANS[plan].monthlyPrice` — it never loads the quote. Hardcoded fallback `"premium"` worsens the mismatch.
2. **`PageOnboardingPayment`** (alt activation path) reads `PLAN_PRICE_MAP[plan]` (also 599) and doesn't pass `quoteId`.
3. **`create-checkout-session`** edge function pulls `stripe_monthly_price_id` from `plan_catalog` (the static 599 $ Stripe price). It accepts `quoteId` in metadata only — never uses it to override price.

Result: AI says 393, activation says 599, Stripe says 599.

## Fix — propagate `quoteId` and `personalized_monthly_price` end-to-end

### 1. Activation screens read the quote as source of truth

**`PageContractorCheckout`** and **`PageOnboardingPayment`**
- Accept `quoteId` via URL search param (`?quoteId=…`) and session state.
- If present, call `fetchPricingQuote(quoteId)` and use:
  - `quote.recommended_plan` → plan label/features (override hardcoded `"premium"`).
  - `quote.recommended_monthly_price` → displayed price (override catalog).
- Recompute tax (`price * 0.14975`) and total from the personalized price.
- Pass `quoteId` to `create-checkout-session`.
- If quote fetch fails, fall back to catalog price with a non-blocking toast.

**`PageContractorPersonalizedPlan`** — already correct; just add `?quoteId=…` to the navigate-to-checkout URL when an "Activer ce plan" path leads elsewhere (currently calls invoke directly — keep that path).

### 2. Stripe checkout uses dynamic price when a quote exists

**`supabase/functions/create-checkout-session/index.ts`**
- When `quoteId` is provided:
  - Service-role-load the quote: `recommended_plan`, `recommended_monthly_price`, `pricing_status`.
  - Reject if `pricing_status === 'waitlisted'`.
  - Validate `quote.recommended_plan === planId`. If mismatch → 400 `pricing_mismatch` + log `acquisition_events('pricing_mismatch')`.
  - Build line item with **`price_data`** (recurring monthly, CAD, `unit_amount = round(recommended_monthly_price * 100)`, `product = plan_catalog.stripe_product_id` if present, otherwise `product_data: { name: \`UNPRO Plan ${planName}\` }`).
  - Keep `quote_id` in both `metadata` and `subscription_data.metadata`.
- When no `quoteId`: keep current behavior (catalog `stripe_monthly_price_id`).
- Insert `personalized_monthly_price_cents` and `quote_id` into `checkout_sessions` record for audit.

### 3. Server-side validation gate

In `create-checkout-session`, before creating the Stripe session:
```
if (quoteId && displayedPriceCents && Math.abs(displayedPriceCents - stripeUnitAmount) > 1) {
  log pricing_mismatch; return 400 "Désaccord de prix détecté."
}
```
Client sends `displayedPriceCents` in the body so the gate is closed-loop.

### 4. Confirmation page reads the same quote

`PagePaymentSuccess` — load `quoteId` from URL (already added to `success_url`) and display `Plan {planLabel} · {recommended_monthly_price} $/mois`.

### 5. Migration — record audit field

Add `personalized_monthly_price_cents int` and `quote_id uuid` columns to `checkout_sessions` if missing. (Skip if already present.)

### 6. Codebase sweep (mechanical)

Replace fallback `|| "premium"` and `|| 599` in `PageContractorCheckout` (line 33), `PageOnboardingPayment` (lines 15, 23) with values derived from the loaded quote (or session state). Leave `CONTRACTOR_PLANS` catalog intact — it remains the *base* price reference; the *applied* price is always the quote.

## Out of scope
- Refactoring `pricing-create-checkout` / `create-stripe-checkout-session` (separate alt paths) — only touched if they're on the active funnel.
- Email/invoice templates (Stripe-generated; will inherit the dynamic price automatically).
- Founder offer logic — already a separate flow.

## Acceptance
1. From `/entrepreneur/plan-personnalise/:quoteId` (393 $), clicking **Activer** opens Stripe at **393,00 $CA / mois**.
2. Activation summary screen (whichever path) shows **393 $ + 58.87 $ taxes = 451.87 $/mois**.
3. If anyone tampers with `planId` vs quote, server returns 400 and logs `pricing_mismatch`.
4. Confirmation page echoes 393 $.
