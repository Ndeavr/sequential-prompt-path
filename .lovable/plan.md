

## Plan: Default Annual Billing + Stay on Same Tab for Stripe

### Issues
1. **Stripe opens in new tab**: `ContractorPlans.tsx` uses `window.open(url, "_blank")` — should stay on same page
2. **Default billing is monthly**: `interval` state defaults to `"month"` — should default to `"year"`

### Changes

**File: `src/pages/pricing/ContractorPlans.tsx`**
- Line 159: Change default interval from `"month"` to `"year"`
- Line 182: Change `window.open(data.url, "_blank")` to `window.location.href = data.url`

### Result
- Pricing page shows annual plans by default (with -15% savings visible)
- Clicking "Choisir Élite/Signature/etc." redirects to Stripe in the same tab instead of opening a new window
- Other checkout flows (homeowner, onboarding) already use `window.location.href` — no changes needed there

### Files Changed
1. `src/pages/pricing/ContractorPlans.tsx` — 2 one-line changes

