# Fix: Plan selection → Payment completion

## Symptoms observed

1. `/entrepreneur/pricing?recommended=premium` renders 4 dark blue cards with **no visible content** (title, price, features, CTA all missing). Skeleton state has finished — `plan_catalog` returns 5 active rows with prices and features.
2. DB plan codes are `recrue, pro_acq, premium_acq, elite_acq, signature` — violates the canonical rule (`mem://index.md` Core: "Pricing… No _acq slugs"). Downstream:
   - `PLAN_ICONS` map in `PageCheckoutStripe` keys on `pro/premium/elite`, so the checkout shows fallback ⚡ for every paid plan.
   - `selected_plan_name` becomes "Pro_acq" / "Premium_acq" in `checkout_sessions` (zero-total branch).
   - `PageCheckoutSuccess`, `useGoalToPlanEngine`, `ContractorQuestionnairePage`, `PagePricingCalculator`, `ContractorPlans`, `PageAdminCreateContractorManual` all hardcode `_acq` codes.
3. Possible auth race: `/checkout` requires a logged-in session; if user lands on pricing while signed out, "Commencer" → `/checkout?plan=…` shows a toast + redirect loop instead of an inline login.

## Root cause for empty cards (most likely)

`PageEntrepreneurPricing` renders `motion.div` with `initial={{ opacity: 0 }}` and animates per-card with `transition={{ delay: i * 0.08 }}`. Cards are visible (border) but inner `<h3>`, price, features, and Button render `text-foreground` / `text-muted-foreground`. In the dark page bg the content should still appear — so the empty state means either:
- The card container has `opacity-0` stuck (framer-motion did not advance), OR
- `plan.features` came back as `null` and `plan.name` is fine but child components (price, button) are clipped by another stacking layer.

We will:
- Add a defensive guard (`paidPlans.length === 0` → friendly fallback).
- Remove the per-card opacity animation OR set `whileInView` so cards never get stuck at `opacity:0` if framer fails to mount.
- Log `usePlanCatalog` errors visibly (toast) and console.

## Plan

### 1. Database — canonicalize plan codes (migration)

Rename codes in `plan_catalog`:
- `pro_acq` → `pro`
- `premium_acq` → `premium`
- `elite_acq` → `elite`

Update all rows in dependent tables that store plan slugs (audit first):
`contractors.subscription_plan`, `contractor_subscriptions.plan_id`, `checkout_sessions.selected_plan_code`, `promo_codes.eligible_plan_codes` (jsonb array).

Single migration, idempotent (`UPDATE … WHERE code = 'pro_acq'`), wrapped in a transaction.

### 2. Frontend — replace `_acq` references

Update these files to use canonical slugs only:
- `src/hooks/useGoalToPlanEngine.ts`
- `src/pages/ContractorQuestionnairePage.tsx`
- `src/pages/admin/PageAdminCreateContractorManual.tsx`
- `src/pages/entrepreneur/PagePricingCalculator.tsx`
- `src/pages/pricing/ContractorPlans.tsx`
- `src/pages/checkout/PageCheckoutSuccess.tsx`

### 3. Fix empty cards in `PageEntrepreneurPricing`

- Remove `initial={{ opacity: 0 }}` on per-card `motion.div` (or change to `whileInView` with `viewport={{ once: true }}` and a 0-delay animate fallback).
- Add empty-state UI when `paidPlans.length === 0` after load.
- Surface query errors with a `toast.error` + retry button.
- Honor `?recommended=premium` query param: highlight the matching plan visually (ring + "Recommandé pour vous" badge) regardless of DB `highlighted` flag.

### 4. Harden checkout entry

In `PageCheckoutStripe`:
- Replace `PLAN_ICONS` lookup with the canonical slugs (already aligned after step 1) and add a default that doesn't depend on slug.
- Use `plan.name` (not capitalized `planId`) for `selected_plan_name` server-side.
- If `session` missing on mount, render an inline auth CTA instead of toasting on click. Preserve `?plan=…` via `redirect` param.

### 5. Edge function `create-checkout-session`

- Use `planRow.name` for `selected_plan_name` instead of `planId.charAt(0).toUpperCase() + planId.slice(1)`.
- Already pulls `priceId` from `plan_catalog` — no change needed.

### 6. End-to-end verification (browser)

1. Logged-in contractor → `/entrepreneur/pricing` → see 4 paid cards with names/prices/features/CTA.
2. Toggle Annuel/Mensuel → price updates.
3. Click "Commencer" on Premium → `/checkout?plan=premium` → plan summary shows "Premium" + ⭐ icon.
4. Apply 100% promo → "Activer gratuitement" → `/checkout/success?plan=premium&free=true`, contractor row updated.
5. Real Stripe path (test) → click "Payer" → redirected to Stripe Checkout URL.
6. Logged-out user → "Commencer" → inline login overlay → returns to checkout after auth.

## Files to change

- `supabase/migrations/<new>.sql` (rename plan codes + cascade)
- `src/pages/entrepreneur/PageEntrepreneurPricing.tsx` (motion fix, error/empty state, recommended highlight)
- `src/pages/checkout/PageCheckoutStripe.tsx` (icon fallback, inline auth, `plan.name`)
- `supabase/functions/create-checkout-session/index.ts` (use `planRow.name`)
- 6 files listed in step 2 (drop `_acq`)

## Anti-regression

- `mem://index.md` Core rule already forbids `_acq`; migration enforces it.
- Keep `usePlanCatalog`, `getStripePriceId`, promo flow, zero-total flow untouched in shape.
- No edits to `src/integrations/supabase/client.ts` or `types.ts`.
