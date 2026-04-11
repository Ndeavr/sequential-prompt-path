

# Fix: Correct Pro Price in Alex Chat + Fix Edge Function 401

## Problems Identified

1. **Wrong price in Alex checkout card**: `useAlexConversationLite.ts` hardcodes `price: 149` for "Pro" plan. The real Pro plan is **349$/month** (34900 cents in `plan_catalog`). The card shows "149,00$" instead of "349,00$".

2. **Edge function crash (401)**: `create-subscription-intent` uses `npm:@supabase/supabase-js@2.57.2` which triggers `Deno.core.runMicrotasks() is not supported` errors in edge runtime, causing the 401/500 shown on the checkout page.

## Plan

### Step 1 — Fix hardcoded prices in conversation hook

**File: `src/hooks/useAlexConversationLite.ts` (lines 87-88)**

Change the two `checkout_embedded` entries from:
- `price: 149` → `price: 349`

This matches the `plan_catalog` table where Pro = 34900 cents = 349$/month.

Also update the features list in `PanelAlexCheckoutEmbedded.tsx` to match the real Pro features from `plan_catalog`:
- "Profil public complet"
- "5 à 12 rendez-vous / mois"  
- "Visibilité améliorée dans la recherche"
- "Badge Pro"

### Step 2 — Fix edge function import compatibility

**File: `supabase/functions/create-subscription-intent/index.ts`**

Replace `npm:@supabase/supabase-js@2.57.2` with the esm.sh import pattern that works in edge runtime:
```
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
```

This avoids the `Deno.core.runMicrotasks()` crash.

### Step 3 — Redeploy edge function

Deploy `create-subscription-intent` and verify with curl.

### Step 4 — Make checkout card dynamic (bonus)

Instead of hardcoding plan data in keywords, the `checkout_embedded` card should ideally pull from `usePlanCatalog`. For now, we fix the hardcoded values to match reality and add a TODO for dynamic fetching.

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useAlexConversationLite.ts` | Fix Pro price 149→349 |
| `src/components/alex-conversation/PanelAlexCheckoutEmbedded.tsx` | Update features to match real Pro features |
| `supabase/functions/create-subscription-intent/index.ts` | Fix import to esm.sh |

