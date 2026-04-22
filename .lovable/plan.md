

# Pricing Purge — Remove All Stale Contractor Pricing

## Problem
Despite the previous cleanup, **14+ files** still contain wrong contractor plan prices (Recrue=0, Pro=49, Premium=99, Elite=199, Signature=399/799/999) and legacy `_acq` slugs. This creates dangerous pricing inconsistencies across AI prompts, calculators, and checkout flows.

## Canonical Truth (from `src/config/contractorPlans.ts`)
- Recrue = **149**/mo | Pro = **349**/mo | Premium = **599**/mo | Elite = **999**/mo | Signature = **1799**/mo
- Founder: Elite Fondateur = **19,995** one-time | Signature Fondateur = **29,995** one-time
- Included appointments: Recrue=0, Pro=5, Premium=10, Elite=25, Signature=50

---

## Files to Fix

### Client-side services with wrong prices

| File | Current | Fix |
|------|---------|-----|
| `src/services/alexEntrepreneurGuidanceEngine.ts` | Recrue=0, Pro=49, Premium=99, Elite=199, Signature=399 | Import from `contractorPlans.ts`: 149, 349, 599, 999, 1799 |
| `src/services/clusterProjectSizeMatrixEngine.ts` | Recrue=99, Pro=199, Premium=399, Elite=699, Signature=1499 | Update to 149, 349, 599, 999, 1799 |
| `src/services/appointmentEconomicsEngine.ts` | Recrue=4 appts, Pro=8, Premium=15, Signature=40 | Update to canonical: 0, 5, 10, 25, 50 |

### Edge functions with wrong prices

| File | Current | Fix |
|------|---------|-----|
| `supabase/functions/alex-sales-process-turn/index.ts` | Recrue=0, Pro=49, Premium=99, Elite=199, Signature=399 | Update to 149, 349, 599, 999, 1799 |
| `supabase/functions/alex-sales-analyzer/index.ts` | Recrue=0, Pro=49, Premium=99, Elite=199, Signature=399 | Update system prompt to canonical prices |

### Files with remaining `_acq` slugs

| File | Fix |
|------|-----|
| `src/pages/pricing/AppointmentCalculator.tsx` | Replace `elite_acq`, `premium_acq`, `pro_acq` with canonical slugs |
| `src/pages/entrepreneur/PagePricingCalculator.tsx` | Remove `_acq` from icon map, default planCode, and plan order array |
| `src/pages/checkout/PageCheckoutSuccess.tsx` | Replace `pro_acq`, `premium_acq`, `elite_acq` in name maps and default |
| `src/hooks/useAlexConversationLite.ts` | Replace `pro_acq` with `pro` |
| `src/hooks/useGoalToPlanEngine.ts` | Replace `pro_acq`, `premium_acq`, `elite_acq` with canonical slugs |
| `src/pages/ContractorQuestionnairePage.tsx` | Remove all `_acq` entries from CITY_LIMITS, PLAN_LABELS, default planCode |
| `src/pages/voice-sales/PageContractorPlanOnboarding.tsx` | Replace `elite_acq` check with `elite` |

### Appointment counts to align

| File | Current | Canonical |
|------|---------|-----------|
| `src/services/appointmentEconomicsEngine.ts` | Recrue=4, Pro=8, Premium=15, Elite=25, Signature=40 | Recrue=0, Pro=5, Premium=10, Elite=25, Signature=50 |
| `src/hooks/useGoalToPlanEngine.ts` | Recrue=3, Pro=5, Premium=10, Elite=25, Signature=50 | Recrue=0, Pro=5, Premium=10, Elite=25, Signature=50 |

---

## Implementation Order

1. Fix all `_acq` slug references (7 files)
2. Fix all wrong prices in client services (3 files)
3. Fix all wrong prices in edge functions (2 files)
4. Fix appointment counts (2 files)
5. Redeploy edge functions
6. Verify clean build

## Expected Outcome
- Zero files with Recrue=0 or Recrue=free
- Zero files with Pro=49, Premium=99, Elite=199, Signature=399/799
- Zero `_acq` suffixed plan codes remaining
- All 14 files aligned to the single canonical source of truth

