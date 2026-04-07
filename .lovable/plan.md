

## Plan: Dynamic Pricing from Admin Tables + Correct Stripe Routing

### Problem Summary
1. **Hardcoded prices** in `src/config/contractorPlans.ts` show wrong amounts (e.g., Premium = $599/mo) that don't match any database table
2. **Wrong Stripe checkout**: All plans redirect to incorrect Stripe prices (e.g., clicking "Choisir Premium" opens a $149 checkout because the Stripe price IDs are mismatched to old products)
3. Three different DB tables have conflicting prices — none are wired to the UI

### Approach
Use the user-specified prices as the source of truth, stored in the `plan_catalog` table (which already has the richest schema: monthly/annual prices, features, badges, descriptions). The frontend will fetch plans from this table instead of using a hardcoded config.

### Step 1 — Create Monthly Stripe Prices
Create 5 monthly recurring Stripe prices on the correct existing products:

| Plan | Product | Monthly Price (CAD) |
|------|---------|-------------------|
| Recrue | prod_UI9uPTzH0oaQ6u | $149 (14900¢) |
| Pro | prod_UI9uM3GMnpxgxE | $349 (34900¢) |
| Premium | prod_UI9uGUb5D4nGUd | $599 (59900¢) |
| Élite | prod_UI9uu29MGVHaLi | $999 (99900¢) |
| Signature | prod_UI9uIfzKY2p5en | $1799 (179900¢) |

### Step 2 — Database Migration
Add Stripe price ID columns to `plan_catalog` and update with correct values:

```sql
ALTER TABLE plan_catalog
  ADD COLUMN stripe_monthly_price_id text,
  ADD COLUMN stripe_yearly_price_id text;

UPDATE plan_catalog SET
  monthly_price = 14900, annual_price = 149900,
  stripe_monthly_price_id = '<new_recrue_monthly>',
  stripe_yearly_price_id = 'price_1TJZb2CvZwK1QnPVCqnR2OM7'
WHERE code = 'recrue';
-- ... repeat for all 5 plans with correct prices and Stripe IDs
```

Also sync `plan_definitions.base_price_monthly` to match.

### Step 3 — Create Hook `usePlanCatalog`
New hook that fetches plans from `plan_catalog` table:
- Returns typed plan objects with prices, features, Stripe IDs
- Cached via React Query with 5-minute stale time
- Replaces all imports from `contractorPlans.ts`

### Step 4 — Update `ContractorPlans.tsx`
- Replace `CONTRACTOR_PLANS` import with `usePlanCatalog()` hook
- Display prices from DB data
- Pass correct `planId` (the plan code) to `handleCheckout`
- Show loading skeleton while fetching

### Step 5 — Update Edge Function `create-checkout-session`
- Remove hardcoded `PLAN_PRICES` map
- Look up Stripe price ID from `plan_catalog` table using the plan code + billing interval
- This ensures the checkout always matches the admin-configured price

### Step 6 — Update Other Consumers
Files that import from `contractorPlans.ts`:
- `PageEntrepreneurPricing.tsx`
- `ProBilling.tsx`
- `UpgradeWindow.tsx`
- `PlanRecommendationHero.tsx`
- `PageCheckoutStripe.tsx`

Each will be updated to use the new hook or a shared utility that reads from DB.

### Technical Details

**New files:**
- `src/hooks/usePlanCatalog.ts` — React Query hook fetching `plan_catalog`

**Modified files:**
- `src/config/contractorPlans.ts` — keep types/utilities, remove hardcoded array
- `src/pages/pricing/ContractorPlans.tsx` — use DB data
- `src/pages/entrepreneur/PageEntrepreneurPricing.tsx` — use DB data
- `src/pages/pro/ProBilling.tsx` — use DB data
- `src/pages/checkout/PageCheckoutStripe.tsx` — use DB data
- `src/components/contractor/UpgradeWindow.tsx` — use DB data
- `supabase/functions/create-checkout-session/index.ts` — DB lookup for price IDs

**Database migration:**
- Add `stripe_monthly_price_id`, `stripe_yearly_price_id` to `plan_catalog`
- Update all 5 plan rows with correct prices and Stripe IDs

