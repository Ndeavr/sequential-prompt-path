
# Pricing Source of Truth — Contractor Plans Cleanup

## Overview
Create a single canonical pricing constant file and update every file across the platform that hardcodes contractor plan prices, slugs, features, or recommendations. Eliminate `_acq` suffixed plan codes, stale prices, and conflicting definitions.

---

## Phase 1 — Canonical Pricing Constants

**Create: `src/config/contractorPlans.ts`**

Single source of truth with the exact 5 standard plans and 2 founder offers as defined in the request. All prices in dollars (not cents). Exported types, arrays, and lookup maps.

Includes:
- `CONTRACTOR_PLANS` array (Recrue 149, Pro 349, Premium 599, Élite 999, Signature 1799)
- `FOUNDER_OFFERS` array (Élite Fondateur 19995, Signature Fondateur 29995)
- `getContractorPlan(slug)` helper
- `getRecommendedPlan()` returning `"premium"`
- Type exports: `ContractorPlanSlug`, `ContractorPlan`, `FounderOffer`

## Phase 2 — Update DB `plan_catalog` Table

**Migration** to update `plan_catalog` rows with correct monthly prices (in cents for Stripe compatibility):
- recrue: 14900
- pro: 34900
- premium: 59900
- elite: 99900
- signature: 179900

Update features_json, tagline, appointments_included, and highlighted flag (premium = true) to match the canonical definitions.

## Phase 3 — Fix All Hardcoded Price Files

### Files with wrong prices to update:

| File | Current Problem | Fix |
|------|----------------|-----|
| `src/pages/entrepreneur/activation/ScreenPlan.tsx` | Pro=149, Premium=299, Elite=499, missing Recrue+Signature | Import from `contractorPlans.ts`, show all 5 plans |
| `src/pages/entrepreneur/activation/ScreenPayment.tsx` | Pro=149, Premium=299, Elite=499 | Import from `contractorPlans.ts` |
| `src/pages/contractor-funnel/PageContractorCheckout.tsx` | Pro=149, Premium=299, Elite=599 | Import from `contractorPlans.ts` |
| `src/pages/entrepreneur/PageOnboardingPlan.tsx` | Pro=149, Premium=299, Elite=499, Signature=799 | Import from `contractorPlans.ts` |
| `src/pages/entrepreneur/PageOnboardingPayment.tsx` | Uses `_acq` suffixes, wrong prices (pro=149, signature=799) | Replace with canonical slugs and prices |
| `src/components/onboarding-funnel/StepPlanRecommendation.tsx` | Recrue=0$, Pro=49$, Premium=99$, Elite=199$ | Import from `contractorPlans.ts` |
| `src/services/calculatorSessionService.ts` | `pro_acq: 349`, `recrue: 0`, `signature: 999` — mixed old/new | Replace with canonical prices, remove `_acq` codes |
| `src/pages/pricing/AppointmentCalculator.tsx` | Uses `_acq` suffixed codes, `signature: 999` | Replace with canonical slugs and prices |
| `src/services/engineDynamicPricingBySize.ts` | BASE_PRICES: recrue=99, pro=199, premium=399, elite=699, signature=1499 | Update to 149, 349, 599, 999, 1799 |
| `src/hooks/useAlexConversationLite.ts` | Hardcoded `pro_acq` with price 349 | Use canonical slug `pro` with price 349 |
| `src/config/planRules.ts` | Uses `free/pro/premium` — no contractor alignment | Replace with full 5-tier contractor plan rules |

### Files with `_acq` suffixed codes to clean:

| File | Fix |
|------|-----|
| `src/services/calculatorSessionService.ts` | `pro_acq` → `pro`, `premium_acq` → `premium`, `elite_acq` → `elite` |
| `src/pages/pricing/AppointmentCalculator.tsx` | Same slug cleanup |
| `src/pages/PricingContractorsPage.tsx` | Remove `_acq` display mapping |
| `src/pages/entrepreneur/PageOnboardingPayment.tsx` | Remove `_acq` conversion logic |
| `src/components/contractor/ServiceSelector.tsx` | Remove `_acq` duplicates from `SERVICE_LIMITS` |
| `src/pages/pricing/ContractorPlans.tsx` | Update `PLAN_ICONS` keys from `_acq` to canonical |

## Phase 4 — Edge Function Price IDs

**Verify: `supabase/functions/create-stripe-checkout-session/index.ts`**

The Stripe price IDs are already mapped correctly for all 5 plans. No change needed unless the Stripe prices themselves need updating (they reference real Stripe price objects). Add `signature` monthly price of 1799 confirmation.

**Verify: `supabase/functions/alex-voice-sales/index.ts`**

Update the system prompt prices to match: Recrue(149$), Pro(349$), Premium(599$), Élite(999$), Signature(1799$). Already partially correct — confirm and fix any discrepancies.

## Phase 5 — Founder Offers Separation

**Verify: `supabase/functions/create-founder-checkout/index.ts`**

Confirm founder checkout prices align: Élite Fondateur = 19995$, Signature Fondateur = 29995$. Update if different.

**Update: `src/components/voice-sales/CardPlanFounders.tsx`** and any founder display to use `FOUNDER_OFFERS` from the canonical config.

## Phase 6 — Memory Update

Save the canonical pricing to project memory so all future work respects it.

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/config/contractorPlans.ts` |
| Migration | Update `plan_catalog` rows |
| Modify | `src/pages/entrepreneur/activation/ScreenPlan.tsx` |
| Modify | `src/pages/entrepreneur/activation/ScreenPayment.tsx` |
| Modify | `src/pages/contractor-funnel/PageContractorCheckout.tsx` |
| Modify | `src/pages/entrepreneur/PageOnboardingPlan.tsx` |
| Modify | `src/pages/entrepreneur/PageOnboardingPayment.tsx` |
| Modify | `src/components/onboarding-funnel/StepPlanRecommendation.tsx` |
| Modify | `src/services/calculatorSessionService.ts` |
| Modify | `src/pages/pricing/AppointmentCalculator.tsx` |
| Modify | `src/services/engineDynamicPricingBySize.ts` |
| Modify | `src/hooks/useAlexConversationLite.ts` |
| Modify | `src/config/planRules.ts` |
| Modify | `src/components/contractor/ServiceSelector.tsx` |
| Modify | `src/pages/pricing/ContractorPlans.tsx` |
| Modify | `src/pages/PricingContractorsPage.tsx` |
| Verify | `supabase/functions/create-stripe-checkout-session/index.ts` |
| Verify | `supabase/functions/alex-voice-sales/index.ts` |
| Verify | `supabase/functions/create-founder-checkout/index.ts` |
| Memory | `mem://pricing/contractor-plans-source-of-truth` |

## Expected Outcome
- One canonical file defines all contractor pricing
- Every UI, calculator, edge function, and recommendation engine shows identical prices
- No `_acq` suffixed codes remain anywhere
- Founder offers are clearly separated from standard plans
- Recrue=149, Pro=349, Premium=599, Élite=999, Signature=1799 — everywhere, no exceptions
